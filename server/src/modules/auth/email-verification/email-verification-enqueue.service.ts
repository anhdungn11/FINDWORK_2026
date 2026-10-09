import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";
import { EmailCryptoService } from "../../../infrastructure/email/email-crypto.service";
import { EmailDeliverySettings } from "../../../infrastructure/email/email-delivery-settings.service";

export interface EmailVerificationEnqueueInput {
  verificationTokenId: string;
  userId: string;
  emailNormalized: string;
  rawToken: string;
  expiresAt: Date;
}

@Injectable()
export class EmailVerificationEnqueueService {
  constructor(
    private readonly settings: EmailDeliverySettings,
    private readonly crypto: EmailCryptoService,
  ) {}

  assertAvailable(): void {
    try {
      this.settings.assertCanQueue();
      this.crypto.assertReady();
    } catch {
      throw new ServiceUnavailableException({
        code: "AUTH_EMAIL_VERIFICATION_DELIVERY_UNAVAILABLE",
        message: "Email verification delivery is not configured.",
      });
    }
  }

  async enqueue(tx: Prisma.TransactionClient, input: EmailVerificationEnqueueInput): Promise<void> {
    this.assertAvailable();
    const id = randomUUID();
    const sealed = this.crypto.encrypt(id, "VERIFY_EMAIL", input.verificationTokenId, {
      version: 1, recipient: input.emailNormalized, rawToken: input.rawToken,
      tokenId: input.verificationTokenId, expiresAt: input.expiresAt.toISOString(),
      verificationBaseUrl: this.settings.verifyUrl, sender: this.settings.sender,
    });
    await tx.emailOutbox.create({
      data: {
        id, kind: "VERIFY_EMAIL", verificationTokenId: input.verificationTokenId,
        idempotencyKey: `verify:${input.verificationTokenId}`,
        status: "QUEUED",
        payloadCiphertext: Uint8Array.from(sealed.payloadCiphertext),
        payloadNonce: Uint8Array.from(sealed.payloadNonce),
        payloadTag: Uint8Array.from(sealed.payloadTag),
        encryptionKeyId: sealed.encryptionKeyId,
      },
    });
  }
}
