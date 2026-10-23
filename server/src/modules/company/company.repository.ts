import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { publicJobVisibility } from "../jobs/public-job-visibility";
import { DEFAULT_COMPANY_PERMISSION_CODES, DEFAULT_COMPANY_ROLES } from "./company-roles";
import type { FeaturedCompanyQueryDto } from "./dto/featured-company-query.dto";
import type { PublicCompanyQueryDto } from "./dto/public-company-query.dto";

function publicCompanySelect(now: Date) {
  return {
    id: true, name: true, slug: true, description: true, website: true,
    logoAssetKey: true, coverAssetKey: true,
    employeeSizeRange: true, foundedYear: true, verificationStatus: true,
    industry: { select: { id: true, code: true, name: true } },
    locations: { where: { isHeadquarters: true }, orderBy: { id: "asc" as const }, take: 1,
      select: { countryCode: true, addressLine: true, province: { select: { id: true, code: true, name: true } },
        ward: { select: { id: true, code: true, name: true } } } },
    _count: { select: { jobs: { where: publicJobVisibility(now) } } },
  } as const;
}

type PublicCompanyRow = Prisma.CompanyGetPayload<{ select: ReturnType<typeof publicCompanySelect> }>;
function publicCompany(row: PublicCompanyRow) {
  return {
    id: row.id, name: row.name, slug: row.slug, description: row.description,
    website: row.website, employeeSizeRange: row.employeeSizeRange,
    foundedYear: row.foundedYear, isVerified: row.verificationStatus === "VERIFIED",
    industry: row.industry, headquarters: row.locations[0] ?? null,
    logoUrl: row.logoAssetKey ? `/api/v1/companies/${row.id}/media/logo` : null,
    coverUrl: row.coverAssetKey ? `/api/v1/companies/${row.id}/media/cover` : null,
    jobsCount: row._count.jobs,
  };
}

export interface CreateCompanyWithOwnerInput {
  actorUserId: string;
  name: string;
  slug: string;
}

@Injectable()
export class CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(query: PublicCompanyQueryDto) {
    const now = new Date();
    const where: Prisma.CompanyWhereInput = {
      status: "ACTIVE",
      ...(query.q && { name: { contains: query.q, mode: "insensitive" } }),
      ...(query.industryCode && { industry: { code: query.industryCode } }),
      ...(query.provinceId && { locations: { some: { provinceId: query.provinceId } } }),
      ...(query.verifiedOnly && { verificationStatus: "VERIFIED" }),
    };
    return this.listPublicByWhere(where, query, now);
  }

  async listFeatured(query: FeaturedCompanyQueryDto) {
    const now = new Date();
    const where: Prisma.CompanyWhereInput = {
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
      jobs: { some: publicJobVisibility(now) },
    };
    return this.listPublicByWhere(where, query, now);
  }

  private async listPublicByWhere(
    where: Prisma.CompanyWhereInput,
    query: FeaturedCompanyQueryDto,
    now: Date,
  ) {
    const [rows, total] = await Promise.all([
      this.prisma.company.findMany({ where, select: publicCompanySelect(now),
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.company.count({ where }),
    ]);
    return { data: rows.map(publicCompany), pagination: {
      page: query.page, pageSize: query.pageSize, total,
      totalPages: Math.ceil(total / query.pageSize),
    } };
  }

  async getPublic(companyId: string) {
    const row = await this.prisma.company.findFirst({
      where: { id: companyId, status: "ACTIVE" }, select: publicCompanySelect(new Date()),
    });
    if (!row) throw new NotFoundException({ code: "PUBLIC_COMPANY_NOT_FOUND", message: "Company was not found." });
    return publicCompany(row);
  }

  async listActiveWorkspace(userId: string) {
    const memberships = await this.prisma.companyMember.findMany({
      where: { userId, status: "ACTIVE", removedAt: null, company: { status: "ACTIVE" } },
      select: {
        company: { select: { id: true, name: true, slug: true, status: true, verificationStatus: true } },
        roles: { where: { role: { isActive: true } }, select: { role: { select: { name: true } } } },
      },
      orderBy: [{ joinedAt: "desc" }, { id: "desc" }],
    });
    return { data: memberships.map((member) => ({
      ...member.company,
      memberRoleNames: member.roles.map((assignment) => assignment.role.name),
    })) };
  }

  /** Single atomic transaction: company, membership, all six roles, grants, ownership, audit. */
  async createCompanyWithOwner(input: CreateCompanyWithOwnerInput) {
    return this.prisma.$transaction(async (tx) => {
      // Fail closed if seed registry is missing, deprecated or inconsistent.
      const permissions = await tx.permission.findMany({
        where: { code: { in: [...DEFAULT_COMPANY_PERMISSION_CODES] } },
        select: { id: true, code: true, isDeprecated: true },
      });
      const permissionIds = new Map<string, string>();
      for (const permission of permissions) {
        if (!permission.isDeprecated) {
          permissionIds.set(permission.code, permission.id);
        }
      }
      if (
        permissionIds.size !== DEFAULT_COMPANY_PERMISSION_CODES.length ||
        DEFAULT_COMPANY_PERMISSION_CODES.some((code) => !permissionIds.has(code))
      ) {
        throw new InternalServerErrorException({
          code: "COMPANY_PERMISSION_REGISTRY_INCOMPLETE",
          message: "Company role permissions are not provisioned correctly.",
        });
      }

      const company = await tx.company.create({
        data: {
          createdByUserId: input.actorUserId,
          name: input.name,
          slug: input.slug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          verificationStatus: true,
          createdAt: true,
        },
      });

      const ownerMember = await tx.companyMember.create({
        data: {
          companyId: company.id,
          userId: input.actorUserId,
          status: "ACTIVE",
          isOwner: true,
          removedAt: null,
        },
        select: { id: true },
      });

      let ownerRoleId: string | null = null;
      for (const roleSeed of DEFAULT_COMPANY_ROLES) {
        const role = await tx.role.create({
          data: {
            companyId: company.id,
            kind: "COMPANY",
            systemCode: null,
            name: roleSeed.name,
            normalizedName: roleSeed.name.toLowerCase(),
            isProtected: roleSeed.isProtected,
            isActive: true,
          },
          select: { id: true },
        });

        if (roleSeed.name === "OWNER") {
          ownerRoleId = role.id;
        }

        await tx.rolePermission.createMany({
          data: roleSeed.permissions.map((code) => ({
            roleId: role.id,
            permissionId: permissionIds.get(code)!,
            dataScope: "COMPANY" as const,
          })),
        });
      }

      if (!ownerRoleId) {
        throw new InternalServerErrorException({
          code: "COMPANY_OWNER_ROLE_MISSING",
          message: "Default owner role could not be initialized.",
        });
      }

      await tx.companyMemberRole.create({
        data: {
          companyId: company.id,
          companyMemberId: ownerMember.id,
          roleId: ownerRoleId,
          assignedByUserId: input.actorUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          companyId: company.id,
          action: "company.create",
          targetType: "Company",
          targetId: company.id,
          afterData: { name: company.name, slug: company.slug },
        },
      });

      return company;
    }, { maxWait: 10_000, timeout: 30_000 });
  }
}
