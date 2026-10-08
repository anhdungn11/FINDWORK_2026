import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { Prisma } from "../../../generated/prisma/client";

/**
 * Delivery seam for 4.3C.2C. An actual adapter MUST encrypt recipient + rawToken
 * before inserting a QUEUED EmailOutbox row using the supplied tx, in the same
 * transaction as EmailVerificationToken creation. It must never send mail inside
 * the transaction. The default production implementation is intentionally OFF.
 */
export interface EmailVerificationEnqueueInput {
  verificationTokenId: string;
  userId: string;
  emailNormalized: string;
  rawToken: string;
  expiresAt: Date;
}

@Injectable()
export class EmailVerificationEnqueueService {
  assertAvailable(): void {
    throw new ServiceUnavailableException({
      code: "AUTH_EMAIL_VERIFICATION_DELIVERY_UNAVAILABLE",
      message: "Email verification delivery is not configured.",
    });
  }

  async enqueue(
    _tx: Prisma.TransactionClient,
    _input: EmailVerificationEnqueueInput,
  ): Promise<void> {
    this.assertAvailable();
  }
}
