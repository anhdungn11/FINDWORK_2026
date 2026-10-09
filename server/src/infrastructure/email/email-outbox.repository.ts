import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface ClaimedEmailJob {
  id: string;
  kind: "VERIFY_EMAIL";
  verificationTokenId: string;
  idempotencyKey: string;
  payloadCiphertext: Uint8Array;
  payloadNonce: Uint8Array;
  payloadTag: Uint8Array;
  encryptionKeyId: string;
  attemptCount: number;
  maxAttempts: number;
}

const SCRUB = {
  payloadCiphertext: null, payloadNonce: null, payloadTag: null, encryptionKeyId: null,
} as const;

@Injectable()
export class EmailOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async pendingKeyIds(): Promise<string[]> {
    // Protect queued ciphertext across rotations: never claim with missing historical keys.
    const rows = await this.prisma.$queryRaw<Array<{ encryptionKeyId: string }>>`
      SELECT DISTINCT "encryptionKeyId" FROM "EmailOutbox"
      WHERE "kind" = 'VERIFY_EMAIL'::"EmailOutboxKind"
        AND "status" IN ('QUEUED'::"EmailOutboxStatus", 'PROCESSING'::"EmailOutboxStatus")
    `;
    return rows.map((row) => row.encryptionKeyId);
  }

  async claim(owner: string): Promise<ClaimedEmailJob | null> {
    // A crashed final-attempt worker cannot remain PROCESSING forever.
    await this.prisma.$executeRaw`
      UPDATE "EmailOutbox"
      SET "status" = 'FAILED'::"EmailOutboxStatus", "claimedBy" = NULL,
          "leaseUntil" = NULL, "payloadCiphertext" = NULL,
          "payloadNonce" = NULL, "payloadTag" = NULL, "encryptionKeyId" = NULL,
          "lastErrorCode" = 'LEASE_EXHAUSTED', "updatedAt" = NOW()
      WHERE "kind" = 'VERIFY_EMAIL'::"EmailOutboxKind"
        AND "status" = 'PROCESSING'::"EmailOutboxStatus"
        AND "leaseUntil" < NOW() AND "attemptCount" >= "maxAttempts"
    `;
    // Atomic claim: row locks protect concurrent workers, owner is unique per claim.
    const rows = await this.prisma.$queryRaw<ClaimedEmailJob[]>`
      WITH candidate AS (
        SELECT "id" FROM "EmailOutbox"
        WHERE "kind" = 'VERIFY_EMAIL'::"EmailOutboxKind"
          AND "attemptCount" < "maxAttempts"
          AND (
            ("status" = 'QUEUED'::"EmailOutboxStatus" AND "nextAttemptAt" <= NOW())
            OR ("status" = 'PROCESSING'::"EmailOutboxStatus" AND "leaseUntil" < NOW())
          )
        ORDER BY "nextAttemptAt" ASC, "createdAt" ASC, "id" ASC
        FOR UPDATE SKIP LOCKED LIMIT 1
      )
      UPDATE "EmailOutbox" AS job
      SET "status" = 'PROCESSING'::"EmailOutboxStatus",
          "claimedBy" = ${owner}, "leaseUntil" = NOW() + INTERVAL '120 seconds',
          "attemptCount" = job."attemptCount" + 1, "updatedAt" = NOW()
      FROM candidate
      WHERE job."id" = candidate."id"
      RETURNING job."id", job."kind", job."verificationTokenId",
        job."idempotencyKey", job."payloadCiphertext", job."payloadNonce",
        job."payloadTag", job."encryptionKeyId", job."attemptCount", job."maxAttempts"
    `;
    return rows[0] ?? null;
  }

  async verifyEligible(job: ClaimedEmailJob, owner: string): Promise<boolean> {
    // Lock order: User FIRST, then token/outbox; confirm and issue also lock User first.
    const locator = await this.prisma.emailVerificationToken.findUnique({
      where: { id: job.verificationTokenId }, select: { userId: true },
    });
    if (!locator) return false;
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "User" WHERE "id" = ${locator.userId}::uuid FOR UPDATE
      `;
      if (locked.length !== 1) return false;
      const token = await tx.emailVerificationToken.findUnique({
        where: { id: job.verificationTokenId },
        select: { userId: true, emailNormalized: true, consumedAt: true, revokedAt: true, expiresAt: true },
      });
      const user = await tx.user.findUnique({
        where: { id: locator.userId }, select: { status: true, emailNormalized: true, emailVerifiedAt: true },
      });
      const owned = await tx.emailOutbox.findFirst({
        where: { id: job.id, status: "PROCESSING", claimedBy: owner, leaseUntil: { gt: new Date() } },
        select: { id: true },
      });
      return Boolean(owned && token && user && token.userId === locator.userId &&
        !token.consumedAt && !token.revokedAt && token.expiresAt > new Date() &&
        user.status === "ACTIVE" && !user.emailVerifiedAt && user.emailNormalized === token.emailNormalized);
    }, { maxWait: 10_000, timeout: 10_000 });
  }

  async tokenBinding(job: ClaimedEmailJob): Promise<{ email: string; hash: string } | null> {
    const row = await this.prisma.emailVerificationToken.findUnique({
      where: { id: job.verificationTokenId }, select: { emailNormalized: true, tokenHash: true },
    });
    return row ? { email: row.emailNormalized, hash: row.tokenHash } : null;
  }

  private owned(id: string, owner: string) {
    return { id, kind: "VERIFY_EMAIL" as const, status: "PROCESSING" as const, claimedBy: owner,
      leaseUntil: { gt: new Date() } };
  }

  async markSent(id: string, owner: string, providerId: string | null): Promise<boolean> {
    const update = await this.prisma.emailOutbox.updateMany({
      where: this.owned(id, owner),
      data: { status: "SENT", ...SCRUB, claimedBy: null, leaseUntil: null,
        sentAt: new Date(), providerMessageId: providerId, lastErrorCode: null },
    });
    return update.count === 1;
  }

  async cancel(id: string, owner: string, reason: string): Promise<boolean> {
    const update = await this.prisma.emailOutbox.updateMany({
      where: this.owned(id, owner),
      data: { status: "CANCELLED", ...SCRUB, claimedBy: null,
        leaseUntil: null, cancelledAt: new Date(), lastErrorCode: reason },
    });
    return update.count === 1;
  }

  async markFailed(job: ClaimedEmailJob, owner: string, reason: string, retryable: boolean): Promise<boolean> {
    if (retryable && job.attemptCount < job.maxAttempts) {
      // Exponential backoff (bounded at one hour) with positive jitter.
      const base = Math.min(3_600_000, 10_000 * 2 ** Math.min(job.attemptCount - 1, 8));
      const delay = base + Math.floor(Math.random() * Math.floor(base * 0.25));
      const update = await this.prisma.emailOutbox.updateMany({
        where: this.owned(job.id, owner),
        data: { status: "QUEUED", claimedBy: null, leaseUntil: null,
          nextAttemptAt: new Date(Date.now() + delay), lastErrorCode: reason },
      });
      return update.count === 1;
    }
    const update = await this.prisma.emailOutbox.updateMany({
      where: this.owned(job.id, owner),
      data: { status: "FAILED", ...SCRUB, claimedBy: null, leaseUntil: null, lastErrorCode: reason },
    });
    return update.count === 1;
  }
}
