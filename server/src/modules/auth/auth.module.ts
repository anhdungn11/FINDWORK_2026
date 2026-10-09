import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { EmailDeliveryModule } from "../../infrastructure/email/email-delivery.module";
import { AuthController } from "./auth.controller";
import { EmailVerificationController } from "./email-verification/email-verification.controller";
import { EmailVerificationService } from "./email-verification/email-verification.service";
import { EmailVerificationRepository } from "./email-verification/email-verification.repository";
import { EmailVerificationTokenService } from "./email-verification/email-verification-token.service";
import { EmailVerificationEnqueueService } from "./email-verification/email-verification-enqueue.service";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { AccessTokenGuard } from "./guards/access-token.guard";
import { AuthOriginGuard } from "./guards/auth-origin.guard";
import { AuthCookieService } from "./services/auth-cookie.service";
import { PasswordService } from "./services/password.service";
import { TokenService } from "./services/token.service";

@Module({
  imports: [JwtModule.register({}), EmailDeliveryModule],
  controllers: [AuthController, EmailVerificationController],
  providers: [
    AuthRepository,
    AuthService,
    PasswordService,
    TokenService,
    AuthCookieService,
    AccessTokenGuard,
    AuthOriginGuard,
    EmailVerificationService,
    EmailVerificationRepository,
    EmailVerificationTokenService,
    EmailVerificationEnqueueService,
  ],
  exports: [
    AuthService,
    AuthRepository,
    TokenService,
    AuthCookieService,
    AccessTokenGuard,
  ],
})
export class AuthModule {}
