import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { EmailDeliveryModule } from "../../infrastructure/email/email-delivery.module";
import { AuthController } from "./auth.controller";
import { EmailVerificationController } from "./email-verification/email-verification.controller";
import { EmailVerificationService } from "./email-verification/email-verification.service";
import { EmailVerificationRepository } from "./email-verification/email-verification.repository";
import { EmailVerificationTokenService } from "./email-verification/email-verification-token.service";
import { EmailVerificationEnqueueService } from "./email-verification/email-verification-enqueue.service";
import { PasswordResetController } from "./password-reset/password-reset.controller";
import { PasswordResetService } from "./password-reset/password-reset.service";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { AccessTokenGuard } from "./guards/access-token.guard";
import { AccountTypeGuard } from "./guards/account-type.guard";
import { AuthOriginGuard } from "./guards/auth-origin.guard";
import { AuthCookieService } from "./services/auth-cookie.service";
import { PasswordService } from "./services/password.service";
import { TokenService } from "./services/token.service";

@Module({
  imports: [JwtModule.register({}), EmailDeliveryModule],
  controllers: [AuthController, EmailVerificationController, PasswordResetController],
  providers: [
    AuthRepository,
    AuthService,
    PasswordService,
    TokenService,
    AuthCookieService,
    AccessTokenGuard,
    AccountTypeGuard,
    AuthOriginGuard,
    EmailVerificationService,
    EmailVerificationRepository,
    EmailVerificationTokenService,
    EmailVerificationEnqueueService,
    PasswordResetService,
  ],
  exports: [
    AuthService,
    AuthRepository,
    TokenService,
    AuthCookieService,
    AccessTokenGuard,
    AccountTypeGuard,
  ],
})
export class AuthModule {}
