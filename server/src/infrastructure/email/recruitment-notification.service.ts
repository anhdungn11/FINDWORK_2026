import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { EmailCryptoService } from "./email-crypto.service";
import { EmailDeliverySettings } from "./email-delivery-settings.service";

export type RecruitmentNotice =
  | { kind: "APPLICATION_CONFIRMED"; applicationId: string }
  | { kind: "APPLICATION_STATUS"; applicationId: string; status: string; version: number }
  | { kind: "INTERVIEW_INVITATION"; applicationId: string; interviewId: string; scheduledAt: Date }
  | { kind: "INTERVIEW_RESCHEDULED" | "INTERVIEW_CANCELLED"; applicationId: string;
      interviewId: string; scheduledAt: Date; eventId: string };

const isInterviewNotice = (notice: RecruitmentNotice): notice is Extract<RecruitmentNotice, { interviewId: string }> =>
  notice.kind.startsWith("INTERVIEW_");

@Injectable()
export class RecruitmentNotificationService {
  constructor(private readonly settings: EmailDeliverySettings, private readonly crypto: EmailCryptoService) {}

  async enqueue(tx: Prisma.TransactionClient, notice: RecruitmentNotice): Promise<void> {
    if (!this.settings.recruitmentEnabled) return;
    this.settings.assertCanQueueRecruitment();
    this.crypto.assertReady();
    const application = await tx.application.findUnique({ where: { id: notice.applicationId },
      select: { id: true, status: true, submittedAt: true,
        job: { select: { title: true } },
        candidateProfile: { select: { user: { select: { id: true, status: true,
          emailNormalized: true, emailVerifiedAt: true } } } } } });
    const recipient = application?.candidateProfile.user;
    // Deliver only to an active, verified account. Never use a contact snapshot as an email target.
    if (!application?.submittedAt || !recipient || recipient.status !== "ACTIVE" ||
        !recipient.emailVerifiedAt) return;
    const idempotencyKey = notice.kind === "APPLICATION_CONFIRMED"
      ? `application:confirmed:${notice.applicationId}`
      : notice.kind === "APPLICATION_STATUS"
        ? `application:status:${notice.applicationId}:${notice.version}`
        : notice.kind === "INTERVIEW_INVITATION"
          ? `interview:invite:${notice.interviewId}`
          : `interview:${notice.kind.toLowerCase()}:${notice.eventId}`;
    const id = randomUUID();
    const sealed = this.crypto.encrypt(id, "RECRUITMENT_EMAIL", notice.applicationId, {
      version: 1, kind: notice.kind, applicationId: notice.applicationId,
      interviewId: isInterviewNotice(notice) ? notice.interviewId : null,
      recipientUserId: recipient.id, recipient: recipient.emailNormalized,
      jobTitle: application.job.title,
      status: notice.kind === "APPLICATION_STATUS" ? notice.status : null,
      scheduledAt: isInterviewNotice(notice) ? notice.scheduledAt.toISOString() : null,
      applicationBaseUrl: this.settings.applicationUrl, sender: this.settings.sender,
    });
    await tx.recruitmentEmailOutbox.create({ data: { id, kind: notice.kind,
      applicationId: notice.applicationId,
      interviewId: isInterviewNotice(notice) ? notice.interviewId : null,
      recipientUserId: recipient.id, idempotencyKey,
      payloadCiphertext: Uint8Array.from(sealed.payloadCiphertext),
      payloadNonce: Uint8Array.from(sealed.payloadNonce),
      payloadTag: Uint8Array.from(sealed.payloadTag), encryptionKeyId: sealed.encryptionKeyId } });
  }
}
