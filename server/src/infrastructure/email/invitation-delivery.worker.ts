import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { EmailCryptoService } from "./email-crypto.service";
import { EmailDeliverySettings } from "./email-delivery-settings.service";
import { EmailProviderError, EmailProviderService } from "./email-provider.service";
import { InvitationOutboxRepository } from "./invitation-outbox.repository";

interface InvitationPayload {
  version: 1;
  templateVersion?: 1;
  recipient: string;
  rawToken: string;
  invitationId: string;
  expiresAt: string;
  invitationBaseUrl: string;
  sender: string;
}

function validPayload(value: unknown): value is InvitationPayload {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  // CP1 ciphertext predates templateVersion; absent means the immutable v1 template.
  if (p.version !== 1 || (p.templateVersion !== undefined && p.templateVersion !== 1) ||
    typeof p.recipient !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.recipient) || p.recipient !== p.recipient.toLowerCase() ||
    typeof p.rawToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(p.rawToken) ||
    typeof p.invitationId !== "string" || !/^[0-9a-f-]{36}$/.test(p.invitationId) ||
    typeof p.expiresAt !== "string" || !Number.isFinite(Date.parse(p.expiresAt)) ||
    new Date(p.expiresAt).toISOString() !== p.expiresAt ||
    typeof p.sender !== "string" ||
    !(/^[^\r\n<>]+<[^\s<>@]+@[^\s<>@]+>$/.test(p.sender) || /^[^\s<>@]+@[^\s<>@]+$/.test(p.sender)) ||
    typeof p.invitationBaseUrl !== "string") return false;
  try {
    const url = new URL(p.invitationBaseUrl);
    return (url.protocol === "https:" || (url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) &&
      !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}

@Injectable()
export class InvitationDeliveryWorker {
  constructor(
    private readonly repo: InvitationOutboxRepository,
    private readonly crypto: EmailCryptoService,
    private readonly provider: EmailProviderService,
    private readonly settings: EmailDeliverySettings,
  ) {}

  async processOne(): Promise<boolean> {
    // Delivery configuration is checked before discovering or claiming work.
    this.settings.assertInvitationWorkerReady();
    this.crypto.assertReady();
    for (const keyId of await this.repo.pendingKeyIds()) this.crypto.assertKeyAvailable(keyId);
    const owner = randomUUID();
    const job = await this.repo.claim(owner);
    if (!job) return false;
    try {
      let value: unknown;
      try {
        value = this.crypto.decrypt(job.id, job.kind, job.companyInvitationId, {
          encryptionKeyId: job.encryptionKeyId,
          payloadCiphertext: Buffer.from(job.payloadCiphertext),
          payloadNonce: Buffer.from(job.payloadNonce),
          payloadTag: Buffer.from(job.payloadTag),
        });
      } catch {
        await this.repo.markFailed(job, owner, "INVITATION_PAYLOAD_INVALID", false);
        return true;
      }
      if (!validPayload(value) || value.invitationId !== job.companyInvitationId ||
        job.idempotencyKey !== `invite:${job.companyInvitationId}`) {
        await this.repo.markFailed(job, owner, "INVITATION_PAYLOAD_INVALID", false);
        return true;
      }
      const hash = createHash("sha256").update(value.rawToken, "utf8").digest("hex");
      // Short transaction with Company -> Invitation -> Outbox locks. Its commit
      // precedes the provider request; revocation can still race after commit.
      this.settings.assertInvitationWorkerReady();
      const eligibility = await this.repo.verifyEligible(job, owner, value.recipient, hash, value.expiresAt);
      if (eligibility === "DEFERRED") return true;
      if (eligibility === "HORIZON_EXPIRED") {
        await this.repo.markFailed(job, owner, "IDEMPOTENCY_HORIZON_EXPIRED", false);
        return true;
      }
      if (eligibility !== "ELIGIBLE") {
        await this.repo.cancel(job, owner, "INVITATION_NOT_ELIGIBLE");
        return true;
      }
      this.settings.assertInvitationWorkerReady();
      const url = new URL(value.invitationBaseUrl);
      url.hash = new URLSearchParams({ token: value.rawToken }).toString();
      const result = await this.provider.sendInvitation({
        to: value.recipient, from: value.sender, acceptUrl: url.toString(),
        idempotencyKey: job.idempotencyKey,
      });
      await this.repo.markSent(job, owner, result.providerMessageId);
    } catch (error) {
      const known = error instanceof EmailProviderError ? error : null;
      // Never include exception messages, tokens, URLs, or provider bodies.
      await this.repo.markFailed(job, owner,
        known?.errorCode ?? "INVITATION_PROCESSING_ERROR", known?.retryable ?? true);
    }
    return true;
  }
}
