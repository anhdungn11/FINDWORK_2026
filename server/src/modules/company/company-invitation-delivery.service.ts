import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client";
import { EmailCryptoService } from "../../infrastructure/email/email-crypto.service";
import { EmailDeliverySettings } from "../../infrastructure/email/email-delivery-settings.service";

export interface CompanyInvitationEnqueueInput {
  invitationId: string;
  emailNormalized: string;
  rawToken: string;
  expiresAt: Date;
}

/** Atomically queues encrypted invitation delivery for the independent worker. */
@Injectable()
export class CompanyInvitationDeliveryService {
  constructor(
    private readonly settings: EmailDeliverySettings,
    private readonly crypto: EmailCryptoService,
  ) {}

  assertAvailable(): void {
    try {
      this.settings.assertCanQueueInvitation();
      this.crypto.assertReady();
    } catch {
      throw new ServiceUnavailableException({
        code: "COMPANY_INVITATION_DELIVERY_UNAVAILABLE",
        message: "Invitation delivery is not configured.",
      });
    }
  }

  async enqueue(tx: Prisma.TransactionClient, input: CompanyInvitationEnqueueInput): Promise<void> {
    this.assertAvailable();
    const id = randomUUID();
    const sealed = this.crypto.encrypt(id, "COMPANY_INVITATION", input.invitationId, {
      version: 1,
      templateVersion: 1,
      recipient: input.emailNormalized,
      rawToken: input.rawToken,
      invitationId: input.invitationId,
      expiresAt: input.expiresAt.toISOString(),
      invitationBaseUrl: this.settings.invitationUrl,
      sender: this.settings.sender,
    });
    await tx.emailOutbox.create({
      data: {
        id,
        kind: "COMPANY_INVITATION",
        companyInvitationId: input.invitationId,
        idempotencyKey: `invite:${input.invitationId}`,
        status: "QUEUED",
        payloadCiphertext: Uint8Array.from(sealed.payloadCiphertext),
        payloadNonce: Uint8Array.from(sealed.payloadNonce),
        payloadTag: Uint8Array.from(sealed.payloadTag),
        encryptionKeyId: sealed.encryptionKeyId,
      },
    });
  }
}
