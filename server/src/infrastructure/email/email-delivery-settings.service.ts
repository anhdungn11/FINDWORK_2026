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
  assertWorkerReady(): void {
    this.assertCanQueue();
    if (!this.workerEnabled) throw new Error("EMAIL_WORKER_DISABLED");
  }
}
