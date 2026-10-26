import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { EmailDeliverySettings } from "../infrastructure/email/email-delivery-settings.service";
import { EmailDeliveryWorker } from "../infrastructure/email/email-delivery.worker";
import { PasswordResetWorker } from "../infrastructure/email/password-reset.worker";
import { RecruitmentNotificationWorker } from "../infrastructure/email/recruitment-notification.worker";
import { EmailWorkerModule } from "./email-worker.module";

async function start(): Promise<void> {
  const app = await NestFactory.createApplicationContext(EmailWorkerModule, { logger: ["error", "warn"] });
  let stopping = false;
  const stop = () => { stopping = true; };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    const settings = app.get(EmailDeliverySettings);
    settings.assertWorkerReady();
    const worker = app.get(EmailDeliveryWorker);
    const resetWorker = app.get(PasswordResetWorker);
    const recruitmentWorker = app.get(RecruitmentNotificationWorker);
    while (!stopping) {
      const verified = await worker.processOne();
      const reset = await resetWorker.processOne();
      const recruitment = await recruitmentWorker.processOne();
      if (!verified && !reset && !recruitment) await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    }
  } finally {
    await app.close();
  }
}

void start().catch(() => { // Never log secrets/URLs/exception payloads.
  process.stderr.write("Email worker stopped: check safe configuration and database connectivity.\n");
  process.exitCode = 1;
});
