import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { EmailDeliverySettings } from "../infrastructure/email/email-delivery-settings.service";
import { InvitationDeliveryWorker } from "../infrastructure/email/invitation-delivery.worker";
import { InvitationEmailWorkerModule } from "./invitation-email-worker.module";

async function start(): Promise<void> {
  const app = await NestFactory.createApplicationContext(InvitationEmailWorkerModule, { logger: ["error", "warn"] });
  let stopping = false;
  const stop = () => { stopping = true; };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    app.get(EmailDeliverySettings).assertInvitationWorkerReady();
    const worker = app.get(InvitationDeliveryWorker);
    while (!stopping) {
      const claimed = await worker.processOne();
      if (!claimed) await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    }
  } finally {
    await app.close();
  }
}

void start().catch(() => {
  process.stderr.write("Invitation email worker stopped: check safe configuration and database connectivity.\n");
  process.exitCode = 1;
});
