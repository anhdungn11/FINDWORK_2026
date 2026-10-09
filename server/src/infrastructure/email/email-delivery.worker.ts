import { Injectable } from "@nestjs/common";
import { randomUUID, createHash } from "node:crypto";
import { EmailCryptoService } from "./email-crypto.service";
import { EmailDeliverySettings } from "./email-delivery-settings.service";
import { EmailOutboxRepository } from "./email-outbox.repository";
import { EmailProviderError, EmailProviderService } from "./email-provider.service";

function validPayload(value: unknown): value is {
  version: 1; recipient: string; rawToken: string; tokenId: string; expiresAt: string;
  verificationBaseUrl: string; sender: string;
} {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return p.version === 1 && typeof p.recipient === "string" &&
    typeof p.rawToken === "string" && /^[A-Za-z0-9_-]{43}$/.test(p.rawToken) &&
    typeof p.tokenId === "string" && typeof p.expiresAt === "string" &&
    typeof p.verificationBaseUrl === "string" && typeof p.sender === "string";
}

@Injectable()
export class EmailDeliveryWorker {
  constructor(
    private readonly repo: EmailOutboxRepository,
    private readonly crypto: EmailCryptoService,
    private readonly provider: EmailProviderService,
    private readonly settings: EmailDeliverySettings,
  ) {}

  /** One bounded unit of work. Separate worker process controls scheduling. */
  async processOne(): Promise<boolean> {
    this.settings.assertWorkerReady();
    this.crypto.assertReady();
    for (const keyId of await this.repo.pendingKeyIds()) {
      // If old key material has gone missing, STOP without consuming the job.
      this.crypto.assertKeyAvailable(keyId);
    }
    const owner = randomUUID();
    const job = await this.repo.claim(owner);
    if (!job) return false;
    try {
      if (!(await this.repo.verifyEligible(job, owner))) {
        await this.repo.cancel(job.id, owner, "TOKEN_NOT_ELIGIBLE");
        return true;
      }
      // Corrupted/authentication-failed ciphertext is permanent. Never send it.
      let value: unknown;
      try {
        value = this.crypto.decrypt(job.id, job.kind, job.verificationTokenId, {
          encryptionKeyId: job.encryptionKeyId,
          payloadCiphertext: Buffer.from(job.payloadCiphertext),
          payloadNonce: Buffer.from(job.payloadNonce),
          payloadTag: Buffer.from(job.payloadTag),
        });
      } catch {
        await this.repo.markFailed(job, owner, "EMAIL_PAYLOAD_INVALID", false);
        return true;
      }
      const binding = await this.repo.tokenBinding(job);
      if (!validPayload(value) || value.tokenId !== job.verificationTokenId ||
        Date.parse(value.expiresAt) <= Date.now() ||
        !binding || value.recipient !== binding.email ||
        createHash("sha256").update(value.rawToken, "utf8").digest("hex") !== binding.hash) {
        await this.repo.cancel(job.id, owner, "PAYLOAD_NOT_ELIGIBLE");
        return true;
      }
      // Recheck immediately before provider call. Cancellation after this point
      // may race with network delivery: idempotency + provider limits risk.
      if (!(await this.repo.verifyEligible(job, owner))) {
        await this.repo.cancel(job.id, owner, "TOKEN_NOT_ELIGIBLE");
        return true;
      }
      const url = new URL(value.verificationBaseUrl);
      url.searchParams.set("token", value.rawToken);
      const result = await this.provider.sendVerification({
        to: value.recipient,
        from: value.sender,
        verifyUrl: url.toString(),
        idempotencyKey: job.idempotencyKey,
      });
      await this.repo.markSent(job.id, owner, result.providerMessageId);
    } catch (error) {
      const known = error instanceof EmailProviderError ? error : null;
      // Never log exception.message or payload from crypto/provider.
      await this.repo.markFailed(job, owner,
        known?.errorCode ?? "EMAIL_PROCESSING_ERROR",
        // Unknown failures can be transient DB/runtime failures. Never scrub
        // a potentially deliverable job on an unclassified error.
        known?.retryable ?? true);
    }
    return true;
  }
}
