import { Injectable } from "@nestjs/common";
import { EmailDeliverySettings } from "./email-delivery-settings.service";

export type DeliveryResult = { providerMessageId: string | null };
export type ProviderRequest = {
  to: string;
  from: string;
  verifyUrl: string;
  idempotencyKey: string;
};
export type InvitationProviderRequest = {
  to: string;
  from: string;
  acceptUrl: string;
  idempotencyKey: string;
};
export type PasswordResetProviderRequest = {
  to: string;
  from: string;
  resetUrl: string;
  idempotencyKey: string;
};
export type RecruitmentProviderRequest = {
  to: string; from: string; url: string; jobTitle: string;
  kind: "APPLICATION_CONFIRMED" | "APPLICATION_STATUS" | "INTERVIEW_INVITATION" |
    "INTERVIEW_RESCHEDULED" | "INTERVIEW_CANCELLED";
  status?: string; scheduledAt?: string; idempotencyKey: string;
  interview?: { companyName: string; scheduledAt: string; durationMinutes: number;
    type: "PHONE" | "VIDEO" | "ONSITE"; location?: string | null; meetingUrl?: string | null };
};
export class EmailProviderError extends Error {
  constructor(public readonly errorCode: string, public readonly retryable: boolean) {
    super(errorCode);
  }
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

function vietnamDateTime(value: Date): { date: string; time: string } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(value).map(({ type, value: part }) => [type, part]));
  return { date: `${parts.day}/${parts.month}/${parts.year}`, time: `${parts.hour}:${parts.minute}` };
}

function renderInterviewInvitation(input: RecruitmentProviderRequest) {
  const interview = input.interview;
  if (!interview || !interview.companyName.trim() || !Number.isInteger(interview.durationMinutes) ||
      interview.durationMinutes < 15 || interview.durationMinutes > 240) {
    throw new Error("INTERVIEW_DETAILS_INVALID");
  }
  const start = new Date(interview.scheduledAt);
  if (!Number.isFinite(start.getTime())) throw new Error("INTERVIEW_TIME_INVALID");
  const end = new Date(start.getTime() + interview.durationMinutes * 60_000);
  const from = vietnamDateTime(start);
  const to = vietnamDateTime(end);
  const range = from.date === to.date
    ? `${from.time}–${to.time} ngày ${from.date}`
    : `${from.time} ngày ${from.date} – ${to.time} ngày ${to.date}`;
  const company = interview.companyName.replace(/\s+/g, " ").trim().slice(0, 200);
  const title = input.jobTitle.replace(/\s+/g, " ").trim().slice(0, 200);
  const format = interview.type === "PHONE" ? "Phỏng vấn qua điện thoại"
    : interview.type === "VIDEO" ? "Phỏng vấn trực tuyến"
      : interview.type === "ONSITE" ? "Phỏng vấn trực tiếp" : null;
  if (!format) throw new Error("INTERVIEW_TYPE_INVALID");
  const lines = [
    `${company} — ${title}`,
    `Thời gian: ${range}`,
    "Múi giờ: Giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+07:00)",
    `Hình thức: ${format}`,
  ];
  if (interview.type === "ONSITE" && interview.location) lines.push(`Địa điểm: ${interview.location}`);
  if (interview.type === "VIDEO" && interview.meetingUrl) lines.push(`Liên kết họp: ${interview.meetingUrl}`);
  const link = `Xem chi tiết hồ sơ ứng tuyển: ${input.url}`;
  return {
    from: input.from, to: [input.to],
    subject: `Thư mời phỏng vấn | ${company} — ${title}`,
    text: `${lines.join("\n")}\n\n${link}`,
    html: `${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}` +
      `<p><a href="${escapeHtml(input.url)}">Xem chi tiết hồ sơ ứng tuyển</a></p>`,
  };
}

/** Shared by delivery and the restricted one-job preview. */
export function renderRecruitmentNotice(input: RecruitmentProviderRequest) {
  if (input.kind === "INTERVIEW_INVITATION") return renderInterviewInvitation(input);
  const title = input.jobTitle.slice(0, 200);
  const subject = input.kind === "APPLICATION_CONFIRMED" ? "FINDWORK application received"
    : input.kind === "APPLICATION_STATUS" ? "FINDWORK application status update"
      : input.kind === "INTERVIEW_RESCHEDULED" ? "FINDWORK interview rescheduled"
          : "FINDWORK interview cancelled";
  const detail = input.kind === "APPLICATION_CONFIRMED" ? `We received your application for ${title}.`
    : input.kind === "APPLICATION_STATUS" ? input.status === "INTERVIEW"
      ? `Your application for ${title} has moved to the interview stage.`
      : input.status === "OFFERED"
        ? `Your application for ${title} has received an offer.`
        : `Your application for ${title} is now ${input.status}.`
      : input.kind === "INTERVIEW_RESCHEDULED"
          ? `Your interview for ${title} has been rescheduled to ${input.scheduledAt}.`
          : `Your interview for ${title} scheduled for ${input.scheduledAt} has been cancelled.`;
  return { from: input.from, to: [input.to], subject,
    text: `${detail}\n\nView your application: ${input.url}`,
    html: `<p>${escapeHtml(detail)}</p><p><a href="${escapeHtml(input.url)}">View application</a></p>` };
}

/** Production adapter: Resend API. No provider call while disabled. */
@Injectable()
export class EmailProviderService {
  constructor(private readonly settings: EmailDeliverySettings) {}

  async sendVerification(input: ProviderRequest): Promise<DeliveryResult> {
    return this.send(input.idempotencyKey, {
      from: input.from,
      to: [input.to],
      subject: "Verify your FINDWORK email",
      text: `Open the following link to verify your email:\n${input.verifyUrl}\n\nIf you did not request this, ignore the email.`,
      html: `<p>Verify your FINDWORK email:</p><p><a href="${escapeHtml(input.verifyUrl)}">Verify email</a></p><p>If you did not request this, ignore the email.</p>`,
    });
  }

  /** Invitation template v1. Inputs come only from authenticated, versioned ciphertext. */
  async sendInvitation(input: InvitationProviderRequest): Promise<DeliveryResult> {
    this.settings.assertInvitationWorkerReady();
    return this.send(input.idempotencyKey, {
      from: input.from,
      to: [input.to],
      subject: "Invitation to join a company on FINDWORK",
      text: `You have been invited to join a company on FINDWORK.\n\nOpen this link to review and accept the invitation:\n${input.acceptUrl}\n\nSign in with the invited email address. If you did not expect this invitation, you can ignore this message.`,
      html: `<p>You have been invited to join a company on FINDWORK.</p><p><a href="${escapeHtml(input.acceptUrl)}">Review invitation</a></p><p>Sign in with the invited email address. If you did not expect this invitation, you can ignore this message.</p>`,
    });
  }

  async sendPasswordReset(input: PasswordResetProviderRequest): Promise<DeliveryResult> {
    this.settings.assertCanQueuePasswordReset();
    return this.send(input.idempotencyKey, {
      from: input.from, to: [input.to], subject: "Reset your FINDWORK password",
      text: `Open this link to reset your FINDWORK password:\n${input.resetUrl}\n\nIf you did not request this, ignore this email.`,
      html: `<p>Reset your FINDWORK password:</p><p><a href="${escapeHtml(input.resetUrl)}">Reset password</a></p><p>If you did not request this, ignore this email.</p>`,
    });
  }

  async sendRecruitmentNotice(input: RecruitmentProviderRequest): Promise<DeliveryResult> {
    this.settings.assertCanQueueRecruitment();
    return this.send(input.idempotencyKey, renderRecruitmentNotice(input));
  }

  private async send(idempotencyKey: string, body: Record<string, unknown>): Promise<DeliveryResult> {
    if (this.settings.mode !== "resend") throw new EmailProviderError("PROVIDER_DISABLED", false);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.settings.resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        let retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        // Resend 409 can mean a permanent changed payload OR a transient in-flight request.
        // Parse only the documented error name; never retain/log response details.
        if (response.status === 409) {
          let name = "";
          try {
            const data = await response.json() as { name?: unknown };
            name = typeof data.name === "string" ? data.name : "";
          } catch { /* unknown => fail closed */ }
          retryable = name === "concurrent_idempotent_requests";
        }
        throw new EmailProviderError(`HTTP_${response.status}`, retryable);
      }
      // Never include provider body in logs or exceptions; provider id alone may be stored.
      const responseBody = await response.json() as { id?: unknown };
      if (typeof responseBody.id !== "string" || !responseBody.id || responseBody.id.length > 255) {
        throw new EmailProviderError("PROVIDER_RESPONSE_UNCERTAIN", true);
      }
      return { providerMessageId: responseBody.id };
    } catch (error) {
      if (error instanceof EmailProviderError) throw error;
      throw new EmailProviderError("PROVIDER_TRANSPORT_UNCERTAIN", true);
    } finally {
      clearTimeout(timeout);
    }
  }
}
