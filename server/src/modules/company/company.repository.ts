import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { DEFAULT_COMPANY_PERMISSION_CODES, DEFAULT_COMPANY_ROLES } from "./company-roles";

export interface CreateCompanyWithOwnerInput {
  actorUserId: string;
  name: string;
  slug: string;
}

@Injectable()
export class CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

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
