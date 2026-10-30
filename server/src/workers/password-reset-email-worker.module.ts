import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "../config/env.validation";
import { PrismaModule } from "../infrastructure/prisma/prisma.module";
import { EmailCryptoService } from "../infrastructure/email/email-crypto.service";
import { EmailDeliverySettings } from "../infrastructure/email/email-delivery-settings.service";
import { EmailProviderService } from "../infrastructure/email/email-provider.service";
import { PasswordResetWorker } from "../infrastructure/email/password-reset.worker";

/** Only reset delivery is registered; no verification, invitation or recruitment worker. */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }), PrismaModule],
  providers: [EmailCryptoService, EmailDeliverySettings, EmailProviderService, PasswordResetWorker],
})
export class PasswordResetEmailWorkerModule {}
