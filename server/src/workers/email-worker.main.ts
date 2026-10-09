import "reflect-metadata";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { validateEnvironment } from "../config/env.validation";
import { PrismaModule } from "../infrastructure/prisma/prisma.module";
import { EmailDeliveryModule } from "../infrastructure/email/email-delivery.module";
import { EmailDeliverySettings } from "../infrastructure/email/email-delivery-settings.service";
import { EmailDeliveryWorker } from "../infrastructure/email/email-delivery.worker";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    PrismaModule, EmailDeliveryModule],
})
class EmailWorkerModule {}

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
    while (!stopping) {
      const claimed = await worker.processOne();
      if (!claimed) await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    }
  } finally {
    await app.close();
  }
}

void start().catch(() => { // Never log secrets/URLs/exception payloads.
  process.stderr.write("Email worker stopped: check safe configuration and database connectivity.\n");
  process.exitCode = 1;
});
