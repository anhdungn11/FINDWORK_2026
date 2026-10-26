import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type EmailDeliveryMode = "disabled" | "resend";

@Injectable()
export class EmailDeliverySettings {
  constructor(private readonly config: ConfigService) {}

  get mode(): EmailDeliveryMode {
    return this.config.get<string>("EMAIL_DELIVERY_MODE", "disabled") as EmailDeliveryMode;
  }
  get workerEnabled(): boolean {
    return this.config.get<string>("EMAIL_WORKER_ENABLED", "false") === "true";
  }
  get activeKeyId(): string {
    return this.config.get<string>("EMAIL_ACTIVE_KEY_ID", "");
  }
  get keyringJson(): string {
    return this.config.get<string>("EMAIL_KEYRING_JSON", "");
  }
  get verifyUrl(): string {
    return this.config.get<string>("EMAIL_VERIFY_URL", "");
  }
  get invitationEnabled(): boolean {
    return this.config.get<string>("EMAIL_INVITATION_DELIVERY_ENABLED", "false") === "true";
  }
  get invitationUrl(): string {
    return this.config.get<string>("EMAIL_INVITATION_URL", "");
  }
  get passwordResetEnabled(): boolean {
    return this.config.get<string>("EMAIL_PASSWORD_RESET_ENABLED", "false") === "true";
  }
  get resetUrl(): string {
    return this.config.get<string>("EMAIL_RESET_URL", "");
  }
  get recruitmentEnabled(): boolean {
    return this.config.get<string>("EMAIL_RECRUITMENT_NOTIFICATIONS_ENABLED", "false") === "true";
  }
  get applicationUrl(): string {
    return this.config.get<string>("EMAIL_APPLICATION_URL", "");
  }
  get resendApiKey(): string {
    return this.config.get<string>("EMAIL_RESEND_API_KEY", "");
  }
  get sender(): string {
    return this.config.get<string>("EMAIL_FROM", "");
  }
  get nodeEnv(): string {
    return this.config.get<string>("NODE_ENV", "development");
  }
  assertCanQueue(): void {
    if (this.mode !== "resend") throw new Error("EMAIL_DELIVERY_DISABLED");
    if (!this.activeKeyId || !this.keyringJson || !this.verifyUrl || !this.resendApiKey || !this.sender) {
      throw new Error("EMAIL_DELIVERY_NOT_CONFIGURED");
    }
  }
  assertCanQueueInvitation(): void {
    if (!this.invitationEnabled) {
      throw new Error("EMAIL_INVITATION_DELIVERY_DISABLED");
    }
    if (this.mode !== "resend" || !this.activeKeyId || !this.keyringJson ||
        !this.invitationUrl || !this.resendApiKey || !this.sender) {
      throw new Error("EMAIL_INVITATION_DELIVERY_NOT_CONFIGURED");
    }
    // Recheck URL even when ConfigService is overridden outside normal bootstrap.
    const url = new URL(this.invitationUrl);
    if ((url.protocol !== "https:" && !(this.nodeEnv !== "production" && url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) ||
        url.username || url.password || url.search || url.hash) {
      throw new Error("EMAIL_INVITATION_URL_INVALID");
    }
  }
  assertCanQueuePasswordReset(): void {
    if (!this.passwordResetEnabled) throw new Error("EMAIL_PASSWORD_RESET_DISABLED");
    if (this.mode !== "resend" || !this.activeKeyId || !this.keyringJson ||
        !this.resetUrl || !this.resendApiKey || !this.sender) {
      throw new Error("EMAIL_PASSWORD_RESET_NOT_CONFIGURED");
    }
    const url = new URL(this.resetUrl);
    if ((url.protocol !== "https:" && !(this.nodeEnv !== "production" && url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) ||
      url.username || url.password || url.search || url.hash) throw new Error("EMAIL_RESET_URL_INVALID");
  }
  assertCanQueueRecruitment(): void {
    if (!this.recruitmentEnabled) throw new Error("EMAIL_RECRUITMENT_DISABLED");
    if (this.mode !== "resend" || !this.activeKeyId || !this.keyringJson ||
        !this.applicationUrl || !this.resendApiKey || !this.sender) {
      throw new Error("EMAIL_RECRUITMENT_NOT_CONFIGURED");
    }
    const url = new URL(this.applicationUrl);
    if ((url.protocol !== "https:" && !(this.nodeEnv !== "production" && url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) ||
      url.username || url.password || url.search || url.hash) throw new Error("EMAIL_APPLICATION_URL_INVALID");
  }
  assertWorkerReady(): void {
    this.assertCanQueue();
    if (!this.workerEnabled) throw new Error("EMAIL_WORKER_DISABLED");
  }
  assertInvitationWorkerReady(): void {
    this.assertCanQueueInvitation();
  }
}
