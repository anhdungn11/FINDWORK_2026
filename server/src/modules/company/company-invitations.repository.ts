import {
  ConflictException, ForbiddenException, GoneException, Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

function denied(): ForbiddenException {
  return new ForbiddenException({ code: "AUTHORIZATION_FORBIDDEN", message: "Insufficient company permission." });
}
function invisible(): NotFoundException {
  return new NotFoundException({ code: "COMPANY_INVITATION_NOT_FOUND", message: "Invitation not found." });
}
function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ code, message });
}

const publicFields = {
  id: true, companyId: true, emailNormalized: true, status: true, expiresAt: true,
  acceptedAt: true, revokedAt: true, createdAt: true, invitedByMemberId: true,
} as const;

interface InvitationInput {
  companyId: string;
  actorUserId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class CompanyInvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The caller is protected by company.member.view/COMPANY. Never select tokenHash. */
  async list(companyId: string) {
    const rows = await this.prisma.companyInvitation.findMany({
      where: { companyId, company: { status: "ACTIVE" } },
      select: publicFields,
      take: 50,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    const now = new Date();
    return rows.map((invitation) => ({
      ...invitation,
      status: invitation.status === "PENDING" && invitation.expiresAt <= now
        ? "EXPIRED" as const : invitation.status,
    }));
  }

  /** Serialize all invitation writes for this company through the parent Company lock. */
  private async lockCompany(
    tx: Prisma.TransactionClient, companyId: string, requireActive = true,
  ): Promise<void> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Company" WHERE "id" = ${companyId}::uuid FOR UPDATE
    `;
    if (rows.length !== 1) throw invisible();
    const company = await tx.company.findUnique({ where: { id: companyId }, select: { status: true } });
    if (requireActive && company?.status !== "ACTIVE") throw denied();
  }

  /** Recheck permissions INSIDE the transaction, mirroring the existing permission resolver. */
  private async requireInviter(tx: Prisma.TransactionClient, companyId: string, actorUserId: string) {
    const member = await tx.companyMember.findFirst({
      where: { companyId, userId: actorUserId, status: "ACTIVE", removedAt: null },
      select: { id: true },
    });
    if (!member) throw denied();
    const permission = await tx.permission.findUnique({
      where: { code: "company.member.invite" },
      select: {
        isDeprecated: true,
        companyMemberPermissions: {
          where: { companyId, companyMemberId: member.id },
          select: { effect: true, dataScope: true, expiresAt: true },
          take: 1,
        },
        rolePermissions: {
          where: {
            role: { is: {
              kind: "COMPANY", companyId, isActive: true,
              companyMembers: { some: { companyId, companyMemberId: member.id } },
            } },
          },
          select: { dataScope: true },
        },
      },
    });
    const direct = permission?.companyMemberPermissions[0] ?? null;
    let permitted = false;
    if (permission && !permission.isDeprecated) {
      if (direct && (!direct.expiresAt || direct.expiresAt > new Date())) {
        permitted = direct.effect === "ALLOW" && direct.dataScope === "COMPANY";
      } else {
        const scopes = permission.rolePermissions.map((entry) => entry.dataScope);
        permitted = scopes.length > 0 && scopes.every((scope) =>
          scope === "ASSIGNED" || scope === "COMPANY") && scopes.includes("COMPANY");
      }
    }
    if (!permitted) throw denied();
    return member.id;
  }

  async create(input: InvitationInput) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockCompany(tx, input.companyId);
      const inviterMemberId = await this.requireInviter(tx, input.companyId, input.actorUserId);
      const registeredUser = await tx.user.findUnique({
        where: { emailNormalized: input.email }, select: { id: true },
      });
      if (registeredUser) {
        const member = await tx.companyMember.findUnique({
          where: { companyId_userId: { companyId: input.companyId, userId: registeredUser.id } },
          select: { id: true },
        });
        if (member) throw conflict("COMPANY_INVITATION_ALREADY_MEMBER", "User already has a membership record.");
      }
      const pending = await tx.companyInvitation.findMany({
        where: { companyId: input.companyId, emailNormalized: input.email, status: "PENDING" },
        select: { id: true, expiresAt: true },
      });
      const now = new Date();
      if (pending.some((item) => item.expiresAt > now)) {
        throw conflict("COMPANY_INVITATION_ALREADY_PENDING", "A pending invitation already exists.");
      }
      for (const expired of pending) {
        await tx.companyInvitation.update({ where: { id: expired.id }, data: { status: "EXPIRED" } });
        await tx.auditLog.create({ data: {
          actorUserId: input.actorUserId, companyId: input.companyId,
          action: "company.invitation.expire", targetType: "CompanyInvitation", targetId: expired.id,
        } });
      }
      const invitation = await tx.companyInvitation.create({
        data: {
          companyId: input.companyId, invitedByMemberId: inviterMemberId,
          emailNormalized: input.email, tokenHash: input.tokenHash, expiresAt: input.expiresAt,
        },
        select: publicFields,
      });
      await tx.auditLog.create({ data: {
        actorUserId: input.actorUserId, companyId: input.companyId,
        action: "company.invitation.create", targetType: "CompanyInvitation", targetId: invitation.id,
        afterData: { emailNormalized: "[REDACTED]", role: "VIEWER", expiresAt: invitation.expiresAt.toISOString() },
      } });
      return invitation;
    }, { maxWait: 10_000, timeout: 30_000 });
  }

  async revoke(companyId: string, invitationId: string, actorUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockCompany(tx, companyId);
      await this.requireInviter(tx, companyId, actorUserId);
      const invitation = await tx.companyInvitation.findFirst({
        where: { id: invitationId, companyId }, select: { id: true, status: true, expiresAt: true },
      });
      if (!invitation) throw invisible();
      if (invitation.status === "REVOKED") return { id: invitationId, status: "REVOKED" as const };
      if (invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) {
        throw conflict("COMPANY_INVITATION_NOT_PENDING", "Invitation cannot be revoked.");
      }
      await tx.companyInvitation.update({
        where: { id: invitationId }, data: { status: "REVOKED", revokedAt: new Date() },
      });
      await tx.auditLog.create({ data: {
        actorUserId, companyId, action: "company.invitation.revoke",
        targetType: "CompanyInvitation", targetId: invitationId,
      } });
      return { id: invitationId, status: "REVOKED" as const };
    }, { maxWait: 10_000, timeout: 30_000 });
  }

  /** Best-effort cleanup after a delivery error; never stores or logs raw tokens. */
  async revokeAfterDeliveryFailure(companyId: string, invitationId: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.lockCompany(tx, companyId, false);
      const invitation = await tx.companyInvitation.findFirst({
        where: { id: invitationId, companyId, status: "PENDING" },
        select: { invitedByMemberId: true },
      });
      if (!invitation) return;
      await tx.companyInvitation.update({
        where: { id: invitationId }, data: { status: "REVOKED", revokedAt: new Date() },
      });
      await tx.auditLog.create({ data: {
        companyId, action: "company.invitation.delivery_failed",
        targetType: "CompanyInvitation", targetId: invitationId,
        metadata: { invitedByMemberId: invitation.invitedByMemberId },
      } });
    }, { maxWait: 10_000, timeout: 30_000 });
  }

  async accept(actorUserId: string, tokenHash: string) {
    // Find the company outside TX; then lock that Company row BEFORE re-reading invitation.
    // All invitation writers acquire the same lock, so competing accepts serialize.
    const locator = await this.prisma.companyInvitation.findUnique({
      where: { tokenHash }, select: { companyId: true },
    });
    if (!locator) throw invisible();
    return this.prisma.$transaction(async (tx) => {
      await this.lockCompany(tx, locator.companyId);
      const invitation = await tx.companyInvitation.findUnique({
        where: { tokenHash },
        select: { id: true, companyId: true, emailNormalized: true, invitedByMemberId: true, status: true, expiresAt: true },
      });
      if (!invitation || invitation.companyId !== locator.companyId || invitation.status !== "PENDING") {
        throw invisible();
      }
      if (invitation.expiresAt <= new Date()) {
        throw new GoneException({ code: "COMPANY_INVITATION_EXPIRED", message: "Invitation expired." });
      }
      const user = await tx.user.findUnique({
        where: { id: actorUserId }, select: { id: true, emailNormalized: true, status: true },
      });
      if (!user || user.status !== "ACTIVE" || user.emailNormalized !== invitation.emailNormalized) {
        throw denied();
      }
      const existingMember = await tx.companyMember.findUnique({
        where: { companyId_userId: { companyId: invitation.companyId, userId: user.id } },
        select: { id: true },
      });
      // Never resurrect INACTIVE or REMOVED membership implicitly.
      if (existingMember) throw conflict("COMPANY_INVITATION_ALREADY_MEMBER", "Membership already exists.");
      const viewer = await tx.role.findFirst({
        where: { companyId: invitation.companyId, kind: "COMPANY", normalizedName: "viewer", isActive: true, isProtected: false },
        select: { id: true, permissions: { select: {
          dataScope: true, permission: { select: { code: true, isDeprecated: true } },
        } } },
      });
      if (!viewer || viewer.permissions.length !== 1 ||
          viewer.permissions[0]?.dataScope !== "COMPANY" ||
          viewer.permissions[0]?.permission.code !== "company.view" ||
          viewer.permissions[0]?.permission.isDeprecated) {
        throw conflict("COMPANY_INVITATION_VIEWER_ROLE_UNAVAILABLE", "Safe VIEWER role is unavailable.");
      }
      const inviter = await tx.companyMember.findUniqueOrThrow({
        where: { id: invitation.invitedByMemberId }, select: { userId: true },
      });
      const member = await tx.companyMember.create({ data: {
        companyId: invitation.companyId, userId: user.id, status: "ACTIVE", isOwner: false, removedAt: null,
      }, select: { id: true } });
      await tx.companyMemberRole.create({ data: {
        companyId: invitation.companyId, companyMemberId: member.id,
        roleId: viewer.id, assignedByUserId: inviter.userId,
      } });
      await tx.companyInvitation.update({
        where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedAt: new Date() },
      });
      await tx.auditLog.create({ data: {
        actorUserId: user.id, companyId: invitation.companyId,
        action: "company.invitation.accept", targetType: "CompanyInvitation", targetId: invitation.id,
        afterData: { companyMemberId: member.id, role: "VIEWER" },
      } });
      return { companyId: invitation.companyId, companyMemberId: member.id, role: "VIEWER" as const };
    }, { maxWait: 10_000, timeout: 30_000 });
  }
}
