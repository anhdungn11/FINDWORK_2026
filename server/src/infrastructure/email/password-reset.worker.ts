import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailCryptoService } from "./email-crypto.service";
import { EmailDeliverySettings } from "./email-delivery-settings.service";
import { EmailProviderError, EmailProviderService } from "./email-provider.service";

const scrub = { payloadCiphertext: null, payloadNonce: null, payloadTag: null,
  encryptionKeyId: null, claimedBy: null, leaseUntil: null } as const;

function validPayload(value: unknown): value is { version: 1; recipient: string; rawToken: string;
  tokenId: string; expiresAt: string; resetBaseUrl: string; sender: string } {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return p.version === 1 && typeof p.recipient === "string" &&
    typeof p.rawToken === "string" && /^[A-Za-z0-9_-]{43}$/.test(p.rawToken) &&
    typeof p.tokenId === "string" && typeof p.expiresAt === "string" &&
    Number.isFinite(Date.parse(p.expiresAt as string)) &&
    typeof p.resetBaseUrl === "string" && typeof p.sender === "string";
}

@Injectable()
export class PasswordResetWorker {
  constructor(private readonly db: PrismaService, private readonly settings: EmailDeliverySettings,
    private readonly crypto: EmailCryptoService, private readonly provider: EmailProviderService) {}

  async processOne(jobId?: string, notBefore?: Date): Promise<boolean> {
    if (!this.settings.passwordResetEnabled) return false;
    this.settings.assertCanQueuePasswordReset();
    this.crypto.assertReady();
    if (notBefore && (!Number.isFinite(notBefore.getTime()) || jobId)) {
      throw new Error("RESET_WORKER_SCOPE_INVALID");
    }
    const scope = { ...(jobId && { id: jobId }), ...(notBefore && { createdAt: { gte: notBefore } }) };
    const now = new Date();
    const keys = await this.db.passwordResetOutbox.findMany({ where: { ...scope,
      status: "QUEUED", nextAttemptAt: { lte: now }, attemptCount: { lt: 8 } },
      distinct: ["encryptionKeyId"],
      select: { encryptionKeyId: true } });
    for (const row of keys) this.crypto.assertKeyAvailable(row.encryptionKeyId!);
    // A prior process may have reached the provider before its lease expired.
    // Never reclaim and resend a job whose outcome is unknown.
    await this.db.passwordResetOutbox.updateMany({ where: { ...scope, status: "PROCESSING",
      OR: [{ leaseUntil: { lt: now } }, { leaseUntil: null }] },
      data: { status: "FAILED", ...scrub, lastErrorCode: "RESET_LEASE_OUTCOME_UNCERTAIN" } });
    await this.db.passwordResetOutbox.updateMany({ where: { ...scope, status: "QUEUED",
      attemptCount: { gte: 8 } },
      data: { status: "FAILED", ...scrub, lastErrorCode: "RESET_ATTEMPTS_EXHAUSTED" } });
    const next = await this.db.passwordResetOutbox.findFirst({ where: { ...scope,
      status: "QUEUED", nextAttemptAt: { lte: now }, attemptCount: { lt: 8 } },
      orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { id: true } });
    if (!next) return false;
    const owner = randomUUID();
    const claimed = await this.db.passwordResetOutbox.updateMany({ where: { ...scope, id: next.id,
      status: "QUEUED", nextAttemptAt: { lte: new Date() }, attemptCount: { lt: 8 } },
      data: { status: "PROCESSING", claimedBy: owner,
        leaseUntil: new Date(Date.now() + 120_000), attemptCount: { increment: 1 } } });
    if (claimed.count !== 1) return true;
    const job = await this.db.passwordResetOutbox.findUniqueOrThrow({ where: { id: next.id } });
    let providerAttempted = false;
    try {
      if (job.attemptCount > job.maxAttempts) {
        await this.finish(job.id, owner, "FAILED", "RESET_ATTEMPTS_EXHAUSTED");
        return true;
      }
      let value: unknown;
      try {
        value = this.crypto.decrypt(job.id, "RESET_PASSWORD", job.tokenId, {
          encryptionKeyId: job.encryptionKeyId!, payloadCiphertext: Buffer.from(job.payloadCiphertext!),
          payloadNonce: Buffer.from(job.payloadNonce!), payloadTag: Buffer.from(job.payloadTag!),
        });
      } catch {
        await this.finish(job.id, owner, "FAILED", "RESET_PAYLOAD_INVALID");
        return true;
      }
      if (!validPayload(value) || value.tokenId !== job.tokenId ||
          value.expiresAt <= new Date().toISOString() ||
          job.idempotencyKey !== `reset:${job.tokenId}` ||
          value.resetBaseUrl !== this.settings.resetUrl || value.sender !== this.settings.sender) {
        await this.finish(job.id, owner, "CANCELLED", "RESET_PAYLOAD_INELIGIBLE");
        return true;
      }
      const eligible = await this.db.$transaction(async (tx) => {
        const token = await tx.passwordResetToken.findUnique({ where: { id: job.tokenId },
          select: { userId: true, emailNormalized: true, tokenHash: true, expiresAt: true,
            consumedAt: true, revokedAt: true } });
        if (!token) return false;
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${token.userId}::uuid FOR UPDATE`;
        const user = await tx.user.findUnique({ where: { id: token.userId },
          select: { status: true, emailNormalized: true } });
        const owned = await tx.passwordResetOutbox.findFirst({ where: { id: job.id,
          status: "PROCESSING", claimedBy: owner, leaseUntil: { gt: new Date() } }, select: { id: true } });
        return Boolean(owned && user && user.status === "ACTIVE" &&
          user.emailNormalized === token.emailNormalized && value.recipient === token.emailNormalized &&
          !token.consumedAt && !token.revokedAt && token.expiresAt > new Date() &&
          createHash("sha256").update(value.rawToken).digest("hex") === token.tokenHash &&
          token.expiresAt.toISOString() === value.expiresAt);
      }, { maxWait: 10_000, timeout: 10_000 });
      if (!eligible) {
        await this.finish(job.id, owner, "CANCELLED", "RESET_TOKEN_INELIGIBLE");
        return true;
      }
      const baseUrl = new URL(value.resetBaseUrl);
      if ((baseUrl.protocol !== "https:" && !(this.settings.nodeEnv !== "production" &&
          baseUrl.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(baseUrl.hostname))) ||
          baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
        await this.finish(job.id, owner, "FAILED", "RESET_URL_INVALID");
        return true;
      }
      baseUrl.hash = new URLSearchParams({ token: value.rawToken }).toString();
      providerAttempted = true;
      const sent = await this.provider.sendPasswordReset({ to: value.recipient, from: value.sender,
        resetUrl: baseUrl.toString(), idempotencyKey: job.idempotencyKey });
      await this.db.passwordResetOutbox.updateMany({ where: this.owned(job.id, owner),
        data: { status: "SENT", ...scrub, sentAt: new Date(), providerMessageId: sent.providerMessageId,
          lastErrorCode: null } });
    } catch (error) {
      const known = error instanceof EmailProviderError ? error : null;
      // Only explicit rate limiting or a concurrent idempotency response is
      // safe to retry. Timeouts, 5xx and malformed success may have sent mail.
      const safeRetry = !providerAttempted || (known?.retryable === true &&
        (known.errorCode === "HTTP_429" || known.errorCode === "HTTP_409"));
      if (safeRetry && job.attemptCount < Math.min(job.maxAttempts, 8)) {
        const base = Math.min(3_600_000, 10_000 * 2 ** Math.min(job.attemptCount - 1, 8));
        await this.db.passwordResetOutbox.updateMany({ where: this.owned(job.id, owner),
          data: { status: "QUEUED", claimedBy: null, leaseUntil: null,
            nextAttemptAt: new Date(Date.now() + base + Math.floor(Math.random() * base * 0.25)),
            lastErrorCode: known?.errorCode ?? "RESET_PRE_SEND_ERROR" } });
      } else await this.finish(job.id, owner, "FAILED",
        known && !known.retryable ? known.errorCode : providerAttempted
          ? "RESET_PROVIDER_OUTCOME_UNCERTAIN" : "RESET_PRE_SEND_EXHAUSTED");
    }
    return true;
  }

  private owned(id: string, owner: string) {
    return { id, status: "PROCESSING" as const, claimedBy: owner, leaseUntil: { gt: new Date() } };
  }
  private finish(id: string, owner: string, status: "FAILED" | "CANCELLED", reason: string) {
    return this.db.passwordResetOutbox.updateMany({ where: this.owned(id, owner), data: {
      status, ...scrub, lastErrorCode: reason,
      ...(status === "CANCELLED" && { cancelledAt: new Date() }),
    } });
  }
}
