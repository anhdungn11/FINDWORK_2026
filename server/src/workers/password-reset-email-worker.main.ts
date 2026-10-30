import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { EmailDeliverySettings } from "../infrastructure/email/email-delivery-settings.service";
import { PasswordResetWorker } from "../infrastructure/email/password-reset.worker";
import { PasswordResetEmailWorkerModule } from "./password-reset-email-worker.module";

async function start(): Promise<void> {
  const app = await NestFactory.createApplicationContext(PasswordResetEmailWorkerModule,
    { logger: ["error", "warn"] });
  let stopping = false;
  const stop = () => { stopping = true; };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    const settings = app.get(EmailDeliverySettings);
    const notBefore = settings.assertAutomaticPasswordResetWorkerReady();
    const worker = app.get(PasswordResetWorker);
    while (!stopping) {
      const processed = await worker.processOne(undefined, notBefore);
      if (!processed) await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    }
  } finally {
    await app.close();
  }
}

void start().catch(() => {
  process.stderr.write("Password reset email worker stopped: check safe configuration and database connectivity.\n");
  process.exitCode = 1;
});
