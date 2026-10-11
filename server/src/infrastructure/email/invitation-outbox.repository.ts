import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Resend retains idempotency keys for 24 hours. Leave one hour of margin for
// clock skew, network timeouts, and the final request. Never retry beyond it.
export const INVITATION_RETRY_HORIZON_MS = 23 * 60 * 60 * 1000;
const LEASE_MS = 120_000;
const DISCOVERY_LIMIT = 25;
const INACTIVE_DEFER_MINUTES = 5;
const SCRUB = { payloadCiphertext: null, payloadNonce: null, payloadTag: null, encryptionKeyId: null } as const;

export interface ClaimedInvitationJob {
  id: string;
  kind: "COMPANY_INVITATION";
  companyInvitationId: string;
  idempotencyKey: string;
  payloadCiphertext: Uint8Array;
  payloadNonce: Uint8Array;
  payloadTag: Uint8Array;
  encryptionKeyId: string;
  attemptCount: number;
  maxAttempts: number;
  createdAt: Date;
}

export type InvitationEligibility = "ELIGIBLE" | "DEFERRED" | "INELIGIBLE" | "HORIZON_EXPIRED";

@Injectable()
export class InvitationOutboxRepository {
  private discoveryCursor: { nextAttemptAt: string; createdAt: string; id: string } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async pendingKeyIds(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ encryptionKeyId: string }>>`
      SELECT DISTINCT "encryptionKeyId" FROM "EmailOutbox"
      WHERE "kind" = 'COMPANY_INVITATION'::"EmailOutboxKind"
        AND "status" IN ('QUEUED'::"EmailOutboxStatus", 'PROCESSING'::"EmailOutboxStatus")
    `;
    return rows.map((row) => row.encryptionKeyId);
  }

  /** Discovery holds no locks. Each candidate is rechecked under parent-first locks. */
  async claim(owner: string): Promise<ClaimedInvitationJob | null> {
    // Advance past a full page of currently unclaimable rows on the next pass.
    // Text timestamps include their PostgreSQL timezone offset, avoiding a
    // PrismaPg Date round trip when the database session is not UTC.
    const cursor = this.discoveryCursor;
    const candidates = await this.prisma.$queryRaw<Array<{
      id: string; companyInvitationId: string; companyId: string;
      nextAttemptAt: string; createdAt: string;
    }>>`
      SELECT job."id", job."companyInvitationId", invitation."companyId",
        job."nextAttemptAt"::text AS "nextAttemptAt", job."createdAt"::text AS "createdAt"
      FROM "EmailOutbox" job
      JOIN "CompanyInvitation" invitation ON invitation."id" = job."companyInvitationId"
      WHERE job."kind" = 'COMPANY_INVITATION'::"EmailOutboxKind"
        AND ((job."status" = 'QUEUED'::"EmailOutboxStatus" AND job."nextAttemptAt" <= NOW())
          OR (job."status" = 'PROCESSING'::"EmailOutboxStatus" AND job."leaseUntil" < NOW()))
        AND (${cursor?.nextAttemptAt ?? null}::timestamptz IS NULL OR
          (job."nextAttemptAt", job."createdAt", job."id") >
          (${cursor?.nextAttemptAt ?? null}::timestamptz,
            ${cursor?.createdAt ?? null}::timestamptz, ${cursor?.id ?? null}::uuid))
      ORDER BY job."nextAttemptAt", job."createdAt", job."id"
      LIMIT ${DISCOVERY_LIMIT}
    `;
    for (const candidate of candidates) {
      const claimed = await this.prisma.$transaction(async (tx) => {
        // PrismaPg timestamp writes in this transaction must use UTC instants.
        await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
        const company = await tx.$queryRaw<Array<{ status: string }>>`
          SELECT "status"::text AS status FROM "Company"
          WHERE "id" = ${candidate.companyId}::uuid FOR UPDATE SKIP LOCKED
        `;
        if (company.length !== 1) return null;
        const invitation = await tx.$queryRaw<Array<{ status: string; eligible: boolean }>>`
          SELECT "status"::text AS status, "expiresAt" > NOW() AS eligible
          FROM "CompanyInvitation" WHERE "id" = ${candidate.companyInvitationId}::uuid
            AND "companyId" = ${candidate.companyId}::uuid FOR UPDATE SKIP LOCKED
        `;
        if (invitation.length !== 1) return null;
        const locked = await tx.$queryRaw<Array<{
          id: string; status: string; attemptCount: number; maxAttempts: number;
          due: boolean; leaseExpired: boolean; withinHorizon: boolean;
        }>>`
          SELECT "id", "status"::text AS status, "attemptCount", "maxAttempts",
            "nextAttemptAt" <= NOW() AS due, "leaseUntil" < NOW() AS "leaseExpired",
            "createdAt" + INTERVAL '23 hours' > NOW() AS "withinHorizon"
          FROM "EmailOutbox" WHERE "id" = ${candidate.id}::uuid
            AND "kind" = 'COMPANY_INVITATION'::"EmailOutboxKind"
            AND "companyInvitationId" = ${candidate.companyInvitationId}::uuid
          FOR UPDATE SKIP LOCKED
        `;
        const job = locked[0];
        if (!job || !((job.status === "QUEUED" && job.due) ||
          (job.status === "PROCESSING" && job.leaseExpired))) return null;
        if (invitation[0]!.status !== "PENDING" || !invitation[0]!.eligible) {
          await tx.emailOutbox.update({ where: { id: job.id }, data: {
            status: "CANCELLED", ...SCRUB, claimedBy: null, leaseUntil: null,
            cancelledAt: new Date(), lastErrorCode: "INVITATION_NOT_ELIGIBLE",
          } });
          return null;
        }
        if (job.attemptCount >= job.maxAttempts || !job.withinHorizon) {
          await tx.emailOutbox.update({ where: { id: job.id }, data: {
            status: "FAILED", ...SCRUB, claimedBy: null, leaseUntil: null,
            lastErrorCode: job.attemptCount >= job.maxAttempts ? "LEASE_EXHAUSTED" : "IDEMPOTENCY_HORIZON_EXPIRED",
          } });
          return null;
        }
        if (company[0]!.status !== "ACTIVE") {
          // Suspension does not revoke the invitation. Preserve ciphertext and
          // retry after a bounded pause if the company becomes active again.
          await tx.$executeRaw`
            UPDATE "EmailOutbox" SET "status" = 'QUEUED'::"EmailOutboxStatus",
              "claimedBy" = NULL, "leaseUntil" = NULL,
              "nextAttemptAt" = LEAST(NOW() + (${INACTIVE_DEFER_MINUTES} * INTERVAL '1 minute'),
                "createdAt" + INTERVAL '23 hours'),
              "lastErrorCode" = 'COMPANY_INACTIVE_DEFERRED', "updatedAt" = NOW()
            WHERE "id" = ${job.id}::uuid
          `;
          return null;
        }
        await tx.$executeRaw`
          UPDATE "EmailOutbox" SET "status" = 'PROCESSING'::"EmailOutboxStatus",
            "claimedBy" = ${owner}, "leaseUntil" = NOW() + (${LEASE_MS} * INTERVAL '1 millisecond'),
            "attemptCount" = "attemptCount" + 1, "updatedAt" = NOW()
          WHERE "id" = ${job.id}::uuid
        `;
        return await tx.emailOutbox.findUniqueOrThrow({ where: { id: job.id } }) as ClaimedInvitationJob;
      }, { maxWait: 10_000, timeout: 10_000 });
      if (claimed) {
        this.discoveryCursor = null;
        return claimed;
      }
    }
    this.discoveryCursor = candidates.length === DISCOVERY_LIMIT
      ? { nextAttemptAt: candidates[candidates.length - 1]!.nextAttemptAt,
        createdAt: candidates[candidates.length - 1]!.createdAt,
        id: candidates[candidates.length - 1]!.id }
      : null;
    return null;
  }

  /** Final preflight uses the same lock order as accept/revoke/cleanup. */
  async verifyEligible(job: ClaimedInvitationJob, owner: string, recipient: string, tokenHash: string,
    expiresAt: string): Promise<InvitationEligibility> {
    const locator = await this.prisma.companyInvitation.findUnique({
      where: { id: job.companyInvitationId }, select: { companyId: true },
    });
    if (!locator) return "INELIGIBLE";
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.$queryRaw<Array<{ status: string }>>`
        SELECT "status"::text AS status FROM "Company" WHERE "id" = ${locator.companyId}::uuid FOR UPDATE
      `;
      const invitation = await tx.$queryRaw<Array<{
        status: string; emailNormalized: string; tokenHash: string; unexpired: boolean; expiresMatch: boolean;
      }>>`
        SELECT "status"::text AS status, "emailNormalized", "tokenHash",
          "expiresAt" > NOW() AS unexpired,
          "expiresAt" = ${expiresAt}::timestamptz AS "expiresMatch"
        FROM "CompanyInvitation" WHERE "id" = ${job.companyInvitationId}::uuid
          AND "companyId" = ${locator.companyId}::uuid FOR UPDATE
      `;
      const lockedJob = await tx.$queryRaw<Array<{
        status: string; claimedBy: string | null; leaseValid: boolean; withinHorizon: boolean;
      }>>`
        SELECT "status"::text AS status, "claimedBy", "leaseUntil" > NOW() AS "leaseValid",
          "createdAt" + INTERVAL '23 hours' > NOW() AS "withinHorizon"
        FROM "EmailOutbox" WHERE "id" = ${job.id}::uuid
          AND "kind" = 'COMPANY_INVITATION'::"EmailOutboxKind"
          AND "companyInvitationId" = ${job.companyInvitationId}::uuid FOR UPDATE
      `;
      const current = invitation[0];
      const claim = lockedJob[0];
      if (!claim || claim.status !== "PROCESSING" || claim.claimedBy !== owner || !claim.leaseValid ||
        !current || current.status !== "PENDING" || !current.unexpired || !current.expiresMatch ||
        current.emailNormalized !== recipient || current.tokenHash !== tokenHash) return "INELIGIBLE";
      if (!claim.withinHorizon) return "HORIZON_EXPIRED";
      if (company[0]?.status !== "ACTIVE") {
        await tx.$executeRaw`
          UPDATE "EmailOutbox" SET "status" = 'QUEUED'::"EmailOutboxStatus",
            "claimedBy" = NULL, "leaseUntil" = NULL,
            "nextAttemptAt" = LEAST(NOW() + (${INACTIVE_DEFER_MINUTES} * INTERVAL '1 minute'),
              "createdAt" + INTERVAL '23 hours'),
            "lastErrorCode" = 'COMPANY_INACTIVE_DEFERRED', "updatedAt" = NOW()
          WHERE "id" = ${job.id}::uuid AND "kind" = 'COMPANY_INVITATION'::"EmailOutboxKind"
            AND "companyInvitationId" = ${job.companyInvitationId}::uuid
            AND "status" = 'PROCESSING'::"EmailOutboxStatus"
            AND "claimedBy" = ${owner} AND "leaseUntil" > NOW()
        `;
        return "DEFERRED";
      }
      return "ELIGIBLE";
    }, { maxWait: 10_000, timeout: 10_000 });
  }

  async markSent(job: ClaimedInvitationJob, owner: string, providerId: string | null): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE "EmailOutbox" SET "status" = 'SENT'::"EmailOutboxStatus",
        "payloadCiphertext" = NULL, "payloadNonce" = NULL, "payloadTag" = NULL,
        "encryptionKeyId" = NULL, "claimedBy" = NULL, "leaseUntil" = NULL,
        "sentAt" = NOW(), "providerMessageId" = ${providerId}, "lastErrorCode" = NULL, "updatedAt" = NOW()
      WHERE "id" = ${job.id}::uuid AND "kind" = 'COMPANY_INVITATION'::"EmailOutboxKind"
        AND "companyInvitationId" = ${job.companyInvitationId}::uuid
        AND "status" = 'PROCESSING'::"EmailOutboxStatus"
        AND "claimedBy" = ${owner} AND "leaseUntil" > NOW()
      RETURNING "id"
    `;
    return rows.length === 1;
  }
  async cancel(job: ClaimedInvitationJob, owner: string, reason: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE "EmailOutbox" SET "status" = 'CANCELLED'::"EmailOutboxStatus",
        "payloadCiphertext" = NULL, "payloadNonce" = NULL, "payloadTag" = NULL,
        "encryptionKeyId" = NULL, "claimedBy" = NULL, "leaseUntil" = NULL,
        "cancelledAt" = NOW(), "lastErrorCode" = ${reason}, "updatedAt" = NOW()
      WHERE "id" = ${job.id}::uuid AND "kind" = 'COMPANY_INVITATION'::"EmailOutboxKind"
        AND "companyInvitationId" = ${job.companyInvitationId}::uuid
        AND "status" = 'PROCESSING'::"EmailOutboxStatus"
        AND "claimedBy" = ${owner} AND "leaseUntil" > NOW()
      RETURNING "id"
    `;
    return rows.length === 1;
  }
  async markFailed(job: ClaimedInvitationJob, owner: string, reason: string, retryable: boolean): Promise<boolean> {
    if (retryable && job.attemptCount < job.maxAttempts) {
      const base = Math.min(3_600_000, 10_000 * 2 ** Math.min(job.attemptCount - 1, 8));
      const delay = base + Math.floor(Math.random() * Math.floor(base * 0.25));
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
        UPDATE "EmailOutbox" SET "status" = 'QUEUED'::"EmailOutboxStatus",
          "claimedBy" = NULL, "leaseUntil" = NULL,
          "nextAttemptAt" = NOW() + (${delay} * INTERVAL '1 millisecond'),
          "lastErrorCode" = ${reason}, "updatedAt" = NOW()
        WHERE "id" = ${job.id}::uuid AND "kind" = 'COMPANY_INVITATION'::"EmailOutboxKind"
          AND "companyInvitationId" = ${job.companyInvitationId}::uuid
          AND "status" = 'PROCESSING'::"EmailOutboxStatus"
          AND "claimedBy" = ${owner} AND "leaseUntil" > NOW()
          AND "createdAt" + INTERVAL '23 hours' > NOW() + (${delay + 30_000} * INTERVAL '1 millisecond')
        RETURNING "id"
      `;
      if (rows.length === 1) return true;
    }
    const finalReason = retryable ? "RETRY_WINDOW_EXHAUSTED" : reason;
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE "EmailOutbox" SET "status" = 'FAILED'::"EmailOutboxStatus",
        "payloadCiphertext" = NULL, "payloadNonce" = NULL, "payloadTag" = NULL,
        "encryptionKeyId" = NULL, "claimedBy" = NULL, "leaseUntil" = NULL,
        "lastErrorCode" = ${finalReason}, "updatedAt" = NOW()
      WHERE "id" = ${job.id}::uuid AND "kind" = 'COMPANY_INVITATION'::"EmailOutboxKind"
        AND "companyInvitationId" = ${job.companyInvitationId}::uuid
        AND "status" = 'PROCESSING'::"EmailOutboxStatus"
        AND "claimedBy" = ${owner} AND "leaseUntil" > NOW()
      RETURNING "id"
    `;
    return rows.length === 1;
  }
}
