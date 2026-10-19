import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import type { UpdateCompanyMemberDto } from "./dto/update-company-member.dto";

const memberSelect = {
  id: true, companyId: true, status: true, isOwner: true, joinedAt: true, removedAt: true,
  user: { select: { id: true, email: true, status: true } },
  roles: { select: { role: { select: { id: true, name: true } } } },
} as const;

function denied() { return new ForbiddenException({ code: "AUTHORIZATION_FORBIDDEN", message: "Company permission is required." }); }
function missing() { return new NotFoundException({ code: "COMPANY_MEMBER_NOT_FOUND", message: "Company member was not found." }); }
function conflict(code: string, message: string) { return new ConflictException({ code, message }); }

@Injectable()
export class CompanyMembersService {
  constructor(private readonly db: PrismaService) {}

  async list(companyId: string) {
    const data = await this.db.companyMember.findMany({
      where: { companyId, status: "ACTIVE", removedAt: null }, select: memberSelect,
      orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
    });
    return { data };
  }

  private async mutate<T>(companyId: string, actorUserId: string, permissionCodes: readonly string[],
    change: (tx: Prisma.TransactionClient, actorMemberId: string, isOwner: boolean) => Promise<T>) {
    return this.db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Company" WHERE "id" = ${companyId}::uuid FOR UPDATE
      `;
      if (locked.length !== 1) throw missing();
      const company = await tx.company.findUnique({ where: { id: companyId }, select: { status: true } });
      if (company?.status !== "ACTIVE") throw denied();
      const actor = await tx.companyMember.findFirst({
        where: { companyId, userId: actorUserId, status: "ACTIVE", removedAt: null },
        select: { id: true, isOwner: true },
      });
      if (!actor) throw denied();
      for (const code of permissionCodes) {
        const permission = await tx.permission.findUnique({
          where: { code },
          select: {
            isDeprecated: true,
            companyMemberPermissions: { where: { companyId, companyMemberId: actor.id },
              select: { effect: true, dataScope: true, expiresAt: true }, take: 1 },
            rolePermissions: { where: { role: { is: { kind: "COMPANY", companyId, isActive: true,
              companyMembers: { some: { companyId, companyMemberId: actor.id } } } } },
              select: { dataScope: true } },
          },
        });
        const direct = permission?.companyMemberPermissions[0];
        const scopes = permission?.rolePermissions.map((grant) => grant.dataScope) ?? [];
        const allowed = permission && !permission.isDeprecated &&
          (direct && (!direct.expiresAt || direct.expiresAt > new Date())
            ? direct.effect === "ALLOW" && direct.dataScope === "COMPANY"
            : scopes.length > 0 && scopes.every((scope) => scope === "COMPANY" || scope === "ASSIGNED") && scopes.includes("COMPANY"));
        if (!allowed) throw denied();
      }
      return change(tx, actor.id, actor.isOwner);
    }, { maxWait: 10_000, timeout: 30_000 });
  }

  async updateRole(companyId: string, memberId: string, actorUserId: string, dto: UpdateCompanyMemberDto) {
    return this.mutate(companyId, actorUserId, ["company.member.update", "company.role.manage"], async (tx, actorMemberId, isOwner) => {
      const member = await tx.companyMember.findFirst({
        where: { id: memberId, companyId, status: "ACTIVE", removedAt: null },
        select: { id: true, isOwner: true, roles: { select: { role: { select: { name: true } } } } },
      });
      if (!member) throw missing();
      if (member.isOwner || member.id === actorMemberId) throw denied();
      if (dto.role === "ADMIN" && !isOwner) throw denied();
      const role = await tx.role.findFirst({
        where: { companyId, kind: "COMPANY", normalizedName: dto.role.toLowerCase(), isActive: true, isProtected: false },
        select: { id: true },
      });
      if (!role) throw conflict("COMPANY_ROLE_UNAVAILABLE", "The requested company role is unavailable.");
      if (member.roles.length === 1 && member.roles[0]?.role.name === dto.role) {
        throw conflict("COMPANY_MEMBER_ROLE_UNCHANGED", "Member already has this role.");
      }
      await tx.companyMemberRole.deleteMany({ where: { companyId, companyMemberId: memberId } });
      await tx.companyMemberRole.create({ data: { companyId, companyMemberId: memberId, roleId: role.id, assignedByUserId: actorUserId } });
      await tx.auditLog.create({ data: { actorUserId, companyId, action: "company.member.role.update",
        targetType: "CompanyMember", targetId: memberId,
        beforeData: { roles: member.roles.map((item) => item.role.name) }, afterData: { role: dto.role } } });
      return tx.companyMember.findUniqueOrThrow({ where: { id: memberId }, select: memberSelect });
    });
  }

  async remove(companyId: string, memberId: string, actorUserId: string) {
    return this.mutate(companyId, actorUserId, ["company.member.remove"], async (tx, actorMemberId) => {
      const member = await tx.companyMember.findFirst({
        where: { id: memberId, companyId, status: "ACTIVE", removedAt: null }, select: { id: true, isOwner: true },
      });
      if (!member) throw missing();
      if (member.isOwner || member.id === actorMemberId) throw denied();
      const updated = await tx.companyMember.updateMany({
        where: { id: memberId, companyId, status: "ACTIVE", removedAt: null },
        data: { status: "REMOVED", removedAt: new Date() },
      });
      if (updated.count !== 1) throw conflict("COMPANY_MEMBER_STATE_CONFLICT", "Member status changed.");
      await tx.auditLog.create({ data: { actorUserId, companyId, action: "company.member.remove",
        targetType: "CompanyMember", targetId: memberId, afterData: { status: "REMOVED" } } });
      return { id: memberId, status: "REMOVED" as const };
    });
  }
}
