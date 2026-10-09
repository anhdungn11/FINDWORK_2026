import { Injectable } from "@nestjs/common";
import { EmailDeliverySettings } from "./email-delivery-settings.service";

export type DeliveryResult = { providerMessageId: string | null };
export type ProviderRequest = {
  to: string;
  from: string;
  verifyUrl: string;
  idempotencyKey: string;
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

/** Production adapter: Resend API. No provider call while disabled. */
@Injectable()
export class EmailProviderService {
  constructor(private readonly settings: EmailDeliverySettings) {}

  async sendVerification(input: ProviderRequest): Promise<DeliveryResult> {
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
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          from: input.from,
          to: [input.to],
          subject: "Verify your FINDWORK email",
          text: `Open the following link to verify your email:\n${input.verifyUrl}\n\nIf you did not request this, ignore the email.`,
          html: `<p>Verify your FINDWORK email:</p><p><a href="${escapeHtml(input.verifyUrl)}">Verify email</a></p><p>If you did not request this, ignore the email.</p>`,
        }),
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
      const body = await response.json() as { id?: unknown };
      if (typeof body.id !== "string" || !body.id || body.id.length > 255) {
        throw new EmailProviderError("PROVIDER_RESPONSE_UNCERTAIN", true);
      }
      return { providerMessageId: body.id };
    } catch (error) {
      if (error instanceof EmailProviderError) throw error;
      throw new EmailProviderError("PROVIDER_TRANSPORT_UNCERTAIN", true);
    } finally {
      clearTimeout(timeout);
    }
  }
}
