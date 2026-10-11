import {
  ConflictException, ForbiddenException, GoneException, Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { EmailOutboxRepository } from "../../infrastructure/email/email-outbox.repository";
import type { CompanyInvitationEnqueueInput } from "./company-invitation-delivery.service";

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
  rawToken: string;
  ttlMilliseconds: number;
}

type EnqueueCallback = (tx: Prisma.TransactionClient, input: CompanyInvitationEnqueueInput) => Promise<void>;

@Injectable()
export class CompanyInvitationsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: EmailOutboxRepository,
  ) {}

  /** The caller is protected by company.member.view/COMPANY. Never select tokenHash. */
  async list(companyId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
      const rows = await tx.companyInvitation.findMany({
        where: { companyId, company: { status: "ACTIVE" } },
        select: publicFields,
        take: 50,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const now = (await tx.$queryRaw<Array<{ millis: number }>>`
        SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::double precision AS millis
      `)[0]!.millis;
      return rows.map((invitation) => ({
        ...invitation,
        status: invitation.status === "PENDING" && invitation.expiresAt.getTime() <= now
          ? "EXPIRED" as const : invitation.status,
      }));
    });
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

  private async lockInvitation(tx: Prisma.TransactionClient, companyId: string, invitationId: string): Promise<boolean> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "CompanyInvitation"
      WHERE "id" = ${invitationId}::uuid AND "companyId" = ${companyId}::uuid FOR UPDATE
    `;
    return rows.length === 1;
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
        id: true, isDeprecated: true,
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
    const directActive = direct && permission
      ? (await tx.$queryRaw<Array<{ active: boolean }>>`
          SELECT ("expiresAt" IS NULL OR "expiresAt" > NOW()) AS active
          FROM "CompanyMemberPermission"
          WHERE "companyMemberId" = ${member.id}::uuid
            AND "permissionId" = ${permission.id}::uuid
        `)[0]?.active === true
      : false;
    let permitted = false;
    if (permission && !permission.isDeprecated) {
      if (direct && directActive) {
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

  async create(input: InvitationInput, enqueue: EnqueueCallback) {
    return this.prisma.$transaction(async (tx) => {
      // PrismaPg's timestamptz adapter uses the session timezone for Date
      // writes. Keep the token's seven-day UTC instant aligned with SQL NOW().
      await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
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
      const dbNow = (await tx.$queryRaw<Array<{ millis: number }>>`
        SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::double precision AS millis
      `)[0]!.millis;
      const now = new Date(dbNow);
      if (pending.some((item) => item.expiresAt > now)) {
        throw conflict("COMPANY_INVITATION_ALREADY_PENDING", "A pending invitation already exists.");
      }
      for (const expired of pending) {
        await this.lockInvitation(tx, input.companyId, expired.id);
        await this.outbox.cancelInvitationJobs(tx, expired.id, "INVITATION_EXPIRED");
        await tx.companyInvitation.update({ where: { id: expired.id }, data: { status: "EXPIRED" } });
        await tx.auditLog.create({ data: {
          actorUserId: input.actorUserId, companyId: input.companyId,
          action: "company.invitation.expire", targetType: "CompanyInvitation", targetId: expired.id,
        } });
      }
      const invitation = await tx.companyInvitation.create({
        data: {
          companyId: input.companyId, invitedByMemberId: inviterMemberId,
          emailNormalized: input.email,
          tokenHash: createHash("sha256").update(input.rawToken, "utf8").digest("hex"),
          expiresAt: new Date(dbNow + input.ttlMilliseconds),
        },
        select: publicFields,
      });
      await enqueue(tx, {
        invitationId: invitation.id,
        emailNormalized: input.email,
        rawToken: input.rawToken,
        expiresAt: invitation.expiresAt,
      });
      const queued = await tx.emailOutbox.count({
        where: { companyInvitationId: invitation.id, kind: "COMPANY_INVITATION", status: "QUEUED" },
      });
      if (queued !== 1) throw new Error("Atomic encrypted company invitation enqueue did not persist one job.");
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
      await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
      await this.lockCompany(tx, companyId);
      await this.requireInviter(tx, companyId, actorUserId);
      if (!(await this.lockInvitation(tx, companyId, invitationId))) throw invisible();
      const invitation = await tx.companyInvitation.findFirst({
        where: { id: invitationId, companyId }, select: { id: true, status: true, expiresAt: true },
      });
      if (!invitation) throw invisible();
      if (invitation.status === "REVOKED") {
        await this.outbox.cancelInvitationJobs(tx, invitationId, "INVITATION_REVOKED");
        return { id: invitationId, status: "REVOKED" as const };
      }
      const dbNow = (await tx.$queryRaw<Array<{ millis: number }>>`
        SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::double precision AS millis
      `)[0]!.millis;
      if (invitation.status !== "PENDING" || invitation.expiresAt.getTime() <= dbNow) {
        throw conflict("COMPANY_INVITATION_NOT_PENDING", "Invitation cannot be revoked.");
      }
      await this.outbox.cancelInvitationJobs(tx, invitationId, "INVITATION_REVOKED");
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

  async accept(actorUserId: string, tokenHash: string) {
    // Find the company outside TX; then lock that Company row BEFORE re-reading invitation.
    // All invitation writers acquire the same lock, so competing accepts serialize.
    const locator = await this.prisma.companyInvitation.findUnique({
      where: { tokenHash }, select: { companyId: true },
    });
    if (!locator) throw invisible();
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
      await this.lockCompany(tx, locator.companyId);
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "CompanyInvitation" WHERE "tokenHash" = ${tokenHash} FOR UPDATE
      `;
      if (locked.length !== 1) throw invisible();
      const invitation = await tx.companyInvitation.findUnique({
        where: { tokenHash },
        select: { id: true, companyId: true, emailNormalized: true, invitedByMemberId: true, status: true, expiresAt: true },
      });
      if (!invitation || invitation.companyId !== locator.companyId || invitation.status !== "PENDING") {
        throw invisible();
      }
      const dbNow = (await tx.$queryRaw<Array<{ millis: number }>>`
        SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::double precision AS millis
      `)[0]!.millis;
      if (invitation.expiresAt.getTime() <= dbNow) {
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
      await this.outbox.cancelInvitationJobs(tx, invitation.id, "INVITATION_ACCEPTED");
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

  /** One bounded scan, followed by a separate short transaction per invitation. */
  async cleanupExpired(batchSize = 25): Promise<number> {
    const limit = Math.max(1, Math.min(batchSize, 50));
    const candidates = await this.prisma.$queryRaw<Array<{ id: string; companyId: string }>>`
      SELECT invitation."id", invitation."companyId"
      FROM "CompanyInvitation" AS invitation
      WHERE (invitation."status" = 'PENDING'::"CompanyInvitationStatus" AND invitation."expiresAt" <= NOW())
        OR (invitation."status" IN ('ACCEPTED'::"CompanyInvitationStatus",
              'REVOKED'::"CompanyInvitationStatus", 'EXPIRED'::"CompanyInvitationStatus")
          AND EXISTS (
            SELECT 1 FROM "EmailOutbox" AS job
            WHERE job."companyInvitationId" = invitation."id"
              AND job."kind" = 'COMPANY_INVITATION'::"EmailOutboxKind"
              AND job."status" IN ('QUEUED'::"EmailOutboxStatus", 'PROCESSING'::"EmailOutboxStatus")
          ))
      ORDER BY invitation."expiresAt", invitation."id"
      LIMIT ${limit}
    `;
    for (const candidate of candidates) {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
        // The candidate query holds no locks. Recheck after Company -> Invitation locks.
        await this.lockCompany(tx, candidate.companyId, false);
        if (!(await this.lockInvitation(tx, candidate.companyId, candidate.id))) return;
        const rows = await tx.$queryRaw<Array<{ status: string; expired: boolean }>>`
          SELECT "status"::text AS status, "expiresAt" <= NOW() AS expired
          FROM "CompanyInvitation" WHERE "id" = ${candidate.id}::uuid
        `;
        const current = rows[0];
        if (!current) return;
        if (current.status === "PENDING" && current.expired) {
          await this.outbox.cancelInvitationJobs(tx, candidate.id, "INVITATION_EXPIRED");
          await tx.companyInvitation.update({ where: { id: candidate.id }, data: { status: "EXPIRED" } });
          await tx.auditLog.create({ data: {
            companyId: candidate.companyId, action: "company.invitation.expire",
            targetType: "CompanyInvitation", targetId: candidate.id,
          } });
        } else if (["ACCEPTED", "REVOKED", "EXPIRED"].includes(current.status)) {
          await this.outbox.cancelInvitationJobs(tx, candidate.id, `INVITATION_${current.status}`);
        }
      }, { maxWait: 10_000, timeout: 10_000 });
    }
    return candidates.length;
  }
}
