import { Injectable, UnauthorizedException } from "@nestjs/common";
import { EmailVerificationEnqueueService } from "./email-verification-enqueue.service";
import { EmailVerificationRepository } from "./email-verification.repository";
import { EmailVerificationTokenService } from "./email-verification-token.service";

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly repository: EmailVerificationRepository,
    private readonly tokenService: EmailVerificationTokenService,
    private readonly enqueueService: EmailVerificationEnqueueService,
  ) {}

  async request(userId: string): Promise<void> {
    // Must fail closed BEFORE generating/persisting a token.
    this.enqueueService.assertAvailable();
    const { rawToken, tokenHash } = this.tokenService.create();
    await this.repository.issue(
      { userId, rawToken, tokenHash },
      (tx, input) => this.enqueueService.enqueue(tx, input),
    );
  }

  async confirm(rawToken: string): Promise<void> {
    if (!this.tokenService.isWellFormed(rawToken)) {
      throw new UnauthorizedException({
        code: "AUTH_EMAIL_VERIFICATION_TOKEN_INVALID",
        message: "Verification token is invalid or expired.",
      });
    }
    await this.repository.confirm(this.tokenService.hash(rawToken));
  }
}
