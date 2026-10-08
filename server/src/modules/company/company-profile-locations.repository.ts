import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { CreateCompanyLocationDto } from "./dto/create-company-location.dto";
import type { UpdateCompanyLocationDto } from "./dto/update-company-location.dto";
import type { UpdateCompanyProfileDto } from "./dto/update-company-profile.dto";

const profileSelect = {
  id: true, name: true, slug: true, legalName: true, taxCode: true,
  industryId: true, industry: { select: { id: true, code: true, name: true } },
  description: true, website: true, employeeSizeRange: true, foundedYear: true,
  logoAssetKey: true, coverAssetKey: true, verificationStatus: true,
  verifiedAt: true, status: true, createdAt: true, updatedAt: true,
} as const;

const locationSelect = {
  id: true, companyId: true, countryCode: true, provinceId: true, wardId: true,
  addressLine: true, isHeadquarters: true, createdAt: true, updatedAt: true,
  province: { select: { id: true, code: true, name: true } },
  ward: { select: { id: true, code: true, name: true } },
} as const;

type LocationValues = {
  countryCode: string | null;
  provinceId: string | null;
  wardId: string | null;
  addressLine: string | null;
};

function badRequest(code: string, message: string): BadRequestException {
  return new BadRequestException({ code, message });
}
function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ code, message });
}
function notFound(): NotFoundException {
  return new NotFoundException({ code: "COMPANY_RESOURCE_NOT_FOUND", message: "Company resource was not found." });
}
function nullableText(value: string | null | undefined): string | null {
  return value == null ? null : value.trim() || null;
}

@Injectable()
export class CompanyProfileLocationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getProfile(companyId: string) {
    return this.prisma.company.findFirst({
      where: { id: companyId, status: "ACTIVE" }, select: profileSelect,
    }).then((company) => {
      if (!company) throw notFound();
      return company;
    });
  }

  listLocations(companyId: string) {
    return this.prisma.companyLocation.findMany({
      where: { companyId, company: { status: "ACTIVE" } },
      select: locationSelect,
      orderBy: [{ isHeadquarters: "desc" }, { createdAt: "asc" }, { id: "asc" }],
    });
  }

  async getLocation(companyId: string, locationId: string) {
    const location = await this.prisma.companyLocation.findFirst({
      where: { id: locationId, companyId, company: { status: "ACTIVE" } },
      select: locationSelect,
    });
    if (!location) throw notFound();
    return location;
  }

  /** Serialize every HQ mutation by locking the parent company row first. */
  private async mutate<T>(
    companyId: string,
    actorUserId: string,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // Prisma parameterized tagged SQL; no unsafe string interpolation.
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Company" WHERE "id" = ${companyId}::uuid FOR UPDATE
      `;
      if (rows.length !== 1) throw notFound();
      const company = await tx.company.findUnique({
        where: { id: companyId }, select: { status: true },
      });
      if (company?.status !== "ACTIVE") {
        throw new ForbiddenException({ code: "COMPANY_NOT_ACTIVE", message: "Company is not active." });
      }
      const member = await tx.companyMember.findFirst({
        where: { companyId, userId: actorUserId, status: "ACTIVE", removedAt: null },
        select: { id: true },
      });
      if (!member) {
        throw new ForbiddenException({ code: "AUTHORIZATION_FORBIDDEN", message: "Active membership required." });
      }
      // Defense-in-depth: the HTTP guard alone is not sufficient for writes.
      // Re-evaluate the same COMPANY-scope grant inside the write transaction.
      // All future ACL mutation routes must coordinate locking with this path.
      const permission = await tx.permission.findUnique({
        where: { code: "company.update" },
        select: {
          isDeprecated: true,
          companyMemberPermissions: {
            where: { companyId, companyMemberId: member.id },
            select: { effect: true, dataScope: true, expiresAt: true },
            take: 1,
          },
          rolePermissions: {
            where: {
              role: {
                is: {
                  kind: "COMPANY",
                  companyId,
                  isActive: true,
                  companyMembers: { some: { companyId, companyMemberId: member.id } },
                },
              },
            },
            select: { dataScope: true },
          },
        },
      });
      const direct = permission?.companyMemberPermissions[0] ?? null;
      let allowed = false;
      if (permission && !permission.isDeprecated) {
        if (direct && (!direct.expiresAt || direct.expiresAt > new Date())) {
          allowed = direct.effect === "ALLOW" && direct.dataScope === "COMPANY";
        } else {
          const scopes = permission.rolePermissions.map((grant) => grant.dataScope);
          allowed = scopes.every((scope) => scope === "COMPANY" || scope === "ASSIGNED") &&
            scopes.includes("COMPANY");
        }
      }
      if (!allowed) {
        throw new ForbiddenException({
          code: "AUTHORIZATION_COMPANY_SCOPE_REQUIRED",
          message: "A current company-wide update permission is required.",
        });
      }
      return callback(tx);
    }, { maxWait: 10_000, timeout: 30_000 });
  }

  async updateProfile(companyId: string, actorUserId: string, dto: UpdateCompanyProfileDto) {
    const keys = (Object.keys(dto) as Array<keyof UpdateCompanyProfileDto>)
      .filter((key) => dto[key] !== undefined);
    if (keys.length === 0) throw badRequest("COMPANY_UPDATE_EMPTY", "At least one field is required.");
    if (dto.foundedYear != null && dto.foundedYear > new Date().getFullYear()) {
      throw badRequest("COMPANY_FOUNDED_YEAR_INVALID", "Founded year cannot be in the future.");
    }
    const data: Prisma.CompanyUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.legalName !== undefined) data.legalName = nullableText(dto.legalName);
    if (dto.taxCode !== undefined) data.taxCode = nullableText(dto.taxCode);
    if (dto.description !== undefined) data.description = nullableText(dto.description);
    if (dto.website !== undefined) data.website = nullableText(dto.website);
    if (dto.employeeSizeRange !== undefined) data.employeeSizeRange = nullableText(dto.employeeSizeRange);
    if (dto.foundedYear !== undefined) data.foundedYear = dto.foundedYear;

    return this.mutate(companyId, actorUserId, async (tx) => {
      const before = await tx.company.findUniqueOrThrow({ where: { id: companyId }, select: profileSelect });
      if ((before.verificationStatus === "VERIFIED" || before.verificationStatus === "PENDING") &&
          ((dto.legalName !== undefined && nullableText(dto.legalName) !== before.legalName) ||
           (dto.taxCode !== undefined && nullableText(dto.taxCode) !== before.taxCode))) {
        throw conflict("COMPANY_VERIFIED_LEGAL_DETAILS_LOCKED", "Legal details cannot be changed while verification is pending or verified.");
      }
      if (dto.industryId !== undefined) {
        if (dto.industryId !== null) {
          const industry = await tx.industry.findFirst({
            where: { id: dto.industryId, isActive: true }, select: { id: true },
          });
          if (!industry) throw badRequest("COMPANY_INDUSTRY_INVALID", "Industry is invalid or inactive.");
          data.industry = { connect: { id: dto.industryId } };
        } else {
          data.industry = { disconnect: true };
        }
      }
      const updated = await tx.company.update({ where: { id: companyId }, data, select: profileSelect });
      const auditValues = (record: typeof before): Record<string, string | number | null> => {
        const safe: Record<string, string | number | null> = {
          name: record.name,
          legalName: "[REDACTED]",
          taxCode: "[REDACTED]",
          industryId: record.industryId,
          description: "[REDACTED]",
          website: record.website,
          employeeSizeRange: record.employeeSizeRange,
          foundedYear: record.foundedYear,
        };
        return Object.fromEntries(keys.map((key) => [key, safe[key] ?? null]));
      };
      await tx.auditLog.create({ data: {
        actorUserId, companyId, action: "company.profile.update",
        targetType: "Company", targetId: companyId,
        beforeData: { changedFields: keys, values: auditValues(before) },
        afterData: { changedFields: keys, values: auditValues(updated) },
      } });
      return updated;
    });
  }

  private async validateLocation(
    tx: Prisma.TransactionClient,
    input: LocationValues,
    validateReferences: boolean,
  ): Promise<LocationValues> {
    const countryCode = input.countryCode ?? (input.provinceId ? "VN" : null);
    if (input.wardId && !input.provinceId) {
      throw badRequest("COMPANY_LOCATION_INVALID", "wardId requires provinceId.");
    }
    if (input.provinceId && countryCode !== "VN") {
      throw badRequest("COMPANY_LOCATION_INVALID", "Vietnamese provinces require countryCode VN.");
    }
    if (!input.provinceId && !input.addressLine) {
      throw badRequest("COMPANY_LOCATION_EMPTY", "A province or addressLine is required.");
    }
    if (validateReferences && input.provinceId) {
      const province = await tx.province.findFirst({
        where: { id: input.provinceId, isActive: true }, select: { id: true },
      });
      if (!province) throw badRequest("COMPANY_LOCATION_REFERENCE_INVALID", "Province is invalid or inactive.");
      if (input.wardId) {
        const ward = await tx.ward.findFirst({
          where: { id: input.wardId, provinceId: input.provinceId, isActive: true },
          select: { id: true },
        });
        if (!ward) throw badRequest("COMPANY_LOCATION_REFERENCE_INVALID", "Ward is invalid, inactive or not in the province.");
      }
    }
    return { ...input, countryCode };
  }

  private async assertHeadquarters(tx: Prisma.TransactionClient, companyId: string): Promise<number> {
    const total = await tx.companyLocation.count({ where: { companyId } });
    const hqCount = await tx.companyLocation.count({ where: { companyId, isHeadquarters: true } });
    if ((total === 0 && hqCount !== 0) || (total > 0 && hqCount !== 1)) {
      throw conflict("COMPANY_HEADQUARTERS_INCONSISTENT", "Company headquarters state is inconsistent.");
    }
    return total;
  }

  async createLocation(companyId: string, actorUserId: string, dto: CreateCompanyLocationDto) {
    return this.mutate(companyId, actorUserId, async (tx) => {
      const total = await this.assertHeadquarters(tx, companyId);
      const data = await this.validateLocation(tx, {
        countryCode: dto.countryCode ?? null,
        provinceId: dto.provinceId ?? null,
        wardId: dto.wardId ?? null,
        addressLine: nullableText(dto.addressLine),
      }, true);
      const location = await tx.companyLocation.create({
        data: { companyId, ...data, isHeadquarters: total === 0 }, select: locationSelect,
      });
      await tx.auditLog.create({ data: {
        actorUserId, companyId, action: "company.location.create",
        targetType: "CompanyLocation", targetId: location.id,
        afterData: { provinceId: location.provinceId, wardId: location.wardId, isHeadquarters: location.isHeadquarters },
      } });
      return location;
    });
  }

  async updateLocation(companyId: string, locationId: string, actorUserId: string, dto: UpdateCompanyLocationDto) {
    if (Object.keys(dto).length === 0) throw badRequest("COMPANY_LOCATION_UPDATE_EMPTY", "At least one field is required.");
    return this.mutate(companyId, actorUserId, async (tx) => {
      await this.assertHeadquarters(tx, companyId);
      const before = await tx.companyLocation.findFirst({ where: { companyId, id: locationId } });
      if (!before) throw notFound();
      const geographicChange = dto.countryCode !== undefined || dto.provinceId !== undefined || dto.wardId !== undefined;
      const input = await this.validateLocation(tx, {
        countryCode: dto.countryCode !== undefined ? dto.countryCode : before.countryCode,
        provinceId: dto.provinceId !== undefined ? dto.provinceId : before.provinceId,
        wardId: dto.wardId !== undefined ? dto.wardId :
          dto.provinceId !== undefined && dto.provinceId !== before.provinceId ? null : before.wardId,
        addressLine: dto.addressLine !== undefined ? nullableText(dto.addressLine) : before.addressLine,
      }, geographicChange);
      const updated = await tx.companyLocation.update({
        where: { id: locationId }, data: input, select: locationSelect,
      });
      await tx.auditLog.create({ data: {
        actorUserId, companyId, action: "company.location.update", targetType: "CompanyLocation", targetId: locationId,
        beforeData: { countryCode: before.countryCode, provinceId: before.provinceId, wardId: before.wardId, addressLine: "[REDACTED]" },
        afterData: { countryCode: updated.countryCode, provinceId: updated.provinceId, wardId: updated.wardId, addressLine: "[REDACTED]" },
      } });
      return updated;
    });
  }

  async promoteHeadquarters(companyId: string, locationId: string, actorUserId: string) {
    return this.mutate(companyId, actorUserId, async (tx) => {
      await this.assertHeadquarters(tx, companyId);
      const target = await tx.companyLocation.findFirst({ where: { companyId, id: locationId } });
      if (!target) throw notFound();
      if (target.isHeadquarters) {
        return tx.companyLocation.findUniqueOrThrow({ where: { id: locationId }, select: locationSelect });
      }
      const previous = await tx.companyLocation.findFirst({
        where: { companyId, isHeadquarters: true }, select: { id: true },
      });
      await tx.companyLocation.updateMany({ where: { companyId, isHeadquarters: true }, data: { isHeadquarters: false } });
      const result = await tx.companyLocation.update({
        where: { id: locationId }, data: { isHeadquarters: true }, select: locationSelect,
      });
      await this.assertHeadquarters(tx, companyId);
      await tx.auditLog.create({ data: {
        actorUserId, companyId, action: "company.location.headquarters.transfer",
        targetType: "CompanyLocation", targetId: locationId,
        beforeData: { headquartersLocationId: previous?.id ?? null },
        afterData: { headquartersLocationId: locationId },
      } });
      return result;
    });
  }

  async deleteLocation(companyId: string, locationId: string, actorUserId: string) {
    return this.mutate(companyId, actorUserId, async (tx) => {
      const total = await this.assertHeadquarters(tx, companyId);
      const target = await tx.companyLocation.findFirst({ where: { companyId, id: locationId } });
      if (!target) throw notFound();
      if (target.isHeadquarters && total > 1) {
        throw conflict("COMPANY_HEADQUARTERS_TRANSFER_REQUIRED", "Transfer headquarters before deleting this location.");
      }
      await tx.companyLocation.delete({ where: { id: locationId } });
      await this.assertHeadquarters(tx, companyId);
      await tx.auditLog.create({ data: {
        actorUserId, companyId, action: "company.location.delete",
        targetType: "CompanyLocation", targetId: locationId,
        beforeData: { provinceId: target.provinceId, wardId: target.wardId, isHeadquarters: target.isHeadquarters },
      } });
      return { deleted: true };
    });
  }
}
