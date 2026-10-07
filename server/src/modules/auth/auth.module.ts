import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { AccessTokenGuard } from "./guards/access-token.guard";
import { AuthOriginGuard } from "./guards/auth-origin.guard";
import { AuthCookieService } from "./services/auth-cookie.service";
import { PasswordService } from "./services/password.service";
import { TokenService } from "./services/token.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthService,
    PasswordService,
    TokenService,
    AuthCookieService,
    AccessTokenGuard,
    AuthOriginGuard,
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