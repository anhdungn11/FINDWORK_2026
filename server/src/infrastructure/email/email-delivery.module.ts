import { Module } from "@nestjs/common";
import { EmailCryptoService } from "./email-crypto.service";
import { EmailDeliverySettings } from "./email-delivery-settings.service";
import { EmailOutboxRepository } from "./email-outbox.repository";
import { EmailProviderService } from "./email-provider.service";
import { EmailDeliveryWorker } from "./email-delivery.worker";
import { PasswordResetWorker } from "./password-reset.worker";
import { RecruitmentNotificationService } from "./recruitment-notification.service";
import { RecruitmentNotificationWorker } from "./recruitment-notification.worker";

@Module({
  providers: [EmailCryptoService, EmailDeliverySettings, EmailOutboxRepository, EmailProviderService, EmailDeliveryWorker, PasswordResetWorker, RecruitmentNotificationService, RecruitmentNotificationWorker],
  exports: [EmailCryptoService, EmailDeliverySettings, EmailOutboxRepository, EmailProviderService, EmailDeliveryWorker, PasswordResetWorker, RecruitmentNotificationService, RecruitmentNotificationWorker],
})
export class EmailDeliveryModule {}
