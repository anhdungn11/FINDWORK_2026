import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "../config/env.validation";
import { PrismaModule } from "../infrastructure/prisma/prisma.module";
import { EmailCryptoService } from "../infrastructure/email/email-crypto.service";
import { EmailDeliverySettings } from "../infrastructure/email/email-delivery-settings.service";
import { EmailProviderService } from "../infrastructure/email/email-provider.service";
import { InvitationOutboxRepository } from "../infrastructure/email/invitation-outbox.repository";
import { InvitationDeliveryWorker } from "../infrastructure/email/invitation-delivery.worker";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }), PrismaModule],
  providers: [EmailCryptoService, EmailDeliverySettings, EmailProviderService,
    InvitationOutboxRepository, InvitationDeliveryWorker],
})
export class InvitationEmailWorkerModule {}
