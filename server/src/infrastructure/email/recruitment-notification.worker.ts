import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailCryptoService } from "./email-crypto.service";
import { EmailDeliverySettings } from "./email-delivery-settings.service";
import { EmailProviderError, EmailProviderService } from "./email-provider.service";

const scrub = { payloadCiphertext: null, payloadNonce: null, payloadTag: null,
  encryptionKeyId: null, claimedBy: null, leaseUntil: null } as const;
type Payload = { version: 1; kind: "APPLICATION_CONFIRMED" | "APPLICATION_STATUS" | "INTERVIEW_INVITATION";
  applicationId: string; interviewId: string | null; recipientUserId: string; recipient: string;
  jobTitle: string; status: string | null; scheduledAt: string | null;
  applicationBaseUrl: string; sender: string };

function isPayload(value: unknown): value is Payload {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return p.version === 1 && ["APPLICATION_CONFIRMED", "APPLICATION_STATUS", "INTERVIEW_INVITATION"].includes(String(p.kind)) &&
    typeof p.applicationId === "string" && typeof p.recipientUserId === "string" &&
    typeof p.recipient === "string" && typeof p.jobTitle === "string" &&
    typeof p.applicationBaseUrl === "string" && typeof p.sender === "string" &&
    (p.status === null || typeof p.status === "string") &&
    (p.scheduledAt === null || typeof p.scheduledAt === "string") &&
    (p.interviewId === null || typeof p.interviewId === "string");
}

@Injectable()
export class RecruitmentNotificationWorker {
  constructor(private readonly db: PrismaService, private readonly settings: EmailDeliverySettings,
    private readonly crypto: EmailCryptoService, private readonly provider: EmailProviderService) {}

  async processOne(): Promise<boolean> {
    if (!this.settings.recruitmentEnabled) return false;
    this.settings.assertCanQueueRecruitment();
    this.crypto.assertReady();
    const keys = await this.db.recruitmentEmailOutbox.findMany({ where: {
      status: { in: ["QUEUED", "PROCESSING"] } }, distinct: ["encryptionKeyId"],
      select: { encryptionKeyId: true } });
    for (const row of keys) this.crypto.assertKeyAvailable(row.encryptionKeyId!);
    await this.db.recruitmentEmailOutbox.updateMany({ where: { status: "PROCESSING",
      leaseUntil: { lt: new Date() }, attemptCount: { gte: 8 } },
      data: { status: "FAILED", ...scrub, lastErrorCode: "LEASE_EXHAUSTED" } });
    const next = await this.db.recruitmentEmailOutbox.findFirst({ where: { attemptCount: { lt: 8 }, OR: [
      { status: "QUEUED", nextAttemptAt: { lte: new Date() } },
      { status: "PROCESSING", leaseUntil: { lt: new Date() } },
    ] }, orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }, { id: "asc" }], select: { id: true } });
    if (!next) return false;
    const owner = randomUUID();
    const claimed = await this.db.recruitmentEmailOutbox.updateMany({ where: { id: next.id,
      attemptCount: { lt: 8 }, OR: [
        { status: "QUEUED", nextAttemptAt: { lte: new Date() } },
        { status: "PROCESSING", leaseUntil: { lt: new Date() } },
      ] }, data: { status: "PROCESSING", claimedBy: owner,
        leaseUntil: new Date(Date.now() + 120_000), attemptCount: { increment: 1 } } });
    if (claimed.count !== 1) return true;
    const job = await this.db.recruitmentEmailOutbox.findUniqueOrThrow({ where: { id: next.id } });
    try {
      let value: unknown;
      try {
        value = this.crypto.decrypt(job.id, "RECRUITMENT_EMAIL", job.applicationId, {
          encryptionKeyId: job.encryptionKeyId!, payloadCiphertext: Buffer.from(job.payloadCiphertext!),
          payloadNonce: Buffer.from(job.payloadNonce!), payloadTag: Buffer.from(job.payloadTag!),
        });
      } catch {
        await this.finish(job.id, owner, "FAILED", "PAYLOAD_INVALID");
        return true;
      }
      if (!isPayload(value) || value.kind !== job.kind || value.applicationId !== job.applicationId ||
          value.interviewId !== job.interviewId || value.recipientUserId !== job.recipientUserId) {
        await this.finish(job.id, owner, "FAILED", "PAYLOAD_MISMATCH");
        return true;
      }
      const recipient = await this.db.user.findUnique({ where: { id: job.recipientUserId },
        select: { status: true, emailNormalized: true, emailVerifiedAt: true } });
      const application = await this.db.application.findUnique({ where: { id: job.applicationId },
        select: { status: true, submittedAt: true, candidateProfile: { select: { userId: true } } } });
      const interview = job.interviewId ? await this.db.interview.findUnique({ where: { id: job.interviewId },
        select: { applicationId: true, status: true, scheduledAt: true } }) : null;
      const eligible = recipient?.status === "ACTIVE" && recipient.emailVerifiedAt &&
        recipient.emailNormalized === value.recipient && application?.submittedAt &&
        application.candidateProfile.userId === job.recipientUserId &&
        (value.kind !== "APPLICATION_STATUS" || application.status === value.status) &&
        (value.kind !== "INTERVIEW_INVITATION" || (interview?.applicationId === job.applicationId &&
          ["SCHEDULED", "RESCHEDULED"].includes(interview.status) &&
          interview.scheduledAt.toISOString() === value.scheduledAt));
      if (!eligible) {
        await this.finish(job.id, owner, "CANCELLED", "RECIPIENT_INELIGIBLE");
        return true;
      }
      const url = new URL(value.applicationBaseUrl);
      if ((url.protocol !== "https:" && !(this.settings.nodeEnv !== "production" &&
          url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) ||
          url.username || url.password || url.search || url.hash) {
        await this.finish(job.id, owner, "FAILED", "URL_INVALID");
        return true;
      }
      url.pathname = `${url.pathname.replace(/\/$/, "")}/${encodeURIComponent(job.applicationId)}`;
      const sent = await this.provider.sendRecruitmentNotice({ to: value.recipient,
        from: value.sender, url: url.toString(), jobTitle: value.jobTitle,
        kind: value.kind, status: value.status ?? undefined,
        scheduledAt: value.scheduledAt ?? undefined, idempotencyKey: job.idempotencyKey });
      await this.db.recruitmentEmailOutbox.updateMany({ where: this.owned(job.id, owner),
        data: { status: "SENT", ...scrub, sentAt: new Date(),
          providerMessageId: sent.providerMessageId, lastErrorCode: null } });
    } catch (error) {
      const known = error instanceof EmailProviderError ? error : null;
      if ((known?.retryable ?? true) && job.attemptCount < job.maxAttempts) {
        const base = Math.min(3_600_000, 10_000 * 2 ** Math.min(job.attemptCount - 1, 8));
        await this.db.recruitmentEmailOutbox.updateMany({ where: this.owned(job.id, owner),
          data: { status: "QUEUED", claimedBy: null, leaseUntil: null,
            nextAttemptAt: new Date(Date.now() + base + Math.floor(Math.random() * base * 0.25)),
            lastErrorCode: known?.errorCode ?? "PROCESSING_ERROR" } });
      } else await this.finish(job.id, owner, "FAILED", known?.errorCode ?? "PROCESSING_ERROR");
    }
    return true;
  }

  private owned(id: string, owner: string) {
    return { id, status: "PROCESSING" as const, claimedBy: owner, leaseUntil: { gt: new Date() } };
  }
  private finish(id: string, owner: string, status: "FAILED" | "CANCELLED", reason: string) {
    return this.db.recruitmentEmailOutbox.updateMany({ where: this.owned(id, owner), data: {
      status, ...scrub, lastErrorCode: reason,
      ...(status === "CANCELLED" && { cancelledAt: new Date() }),
    } });
  }
}
