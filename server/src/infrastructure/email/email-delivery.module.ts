import { Module } from "@nestjs/common";
import { EmailCryptoService } from "./email-crypto.service";
import { EmailDeliverySettings } from "./email-delivery-settings.service";
import { EmailOutboxRepository } from "./email-outbox.repository";
import { EmailProviderService } from "./email-provider.service";
import { EmailDeliveryWorker } from "./email-delivery.worker";

@Module({
  providers: [EmailCryptoService, EmailDeliverySettings, EmailOutboxRepository, EmailProviderService, EmailDeliveryWorker],
  exports: [EmailCryptoService, EmailDeliverySettings, EmailOutboxRepository, EmailProviderService, EmailDeliveryWorker],
})
export class EmailDeliveryModule {}
