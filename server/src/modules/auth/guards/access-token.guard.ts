import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthRepository } from "../auth.repository";
import { TokenService } from "../services/token.service";
import type { AuthenticatedPrincipal } from "../types/auth.types";

export interface AuthenticatedRequest extends Request {
  auth?: AuthenticatedPrincipal;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly authRepository: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException({
        code: "AUTH_ACCESS_TOKEN_REQUIRED",
        message: "Access token is required.",
      });
    }

    const [scheme, token, ...rest] = authorization.trim().split(/\s+/);

    if (
      scheme?.toLowerCase() !== "bearer" ||
      !token ||
      rest.length > 0
    ) {
      throw this.invalidAccessToken();
    }

    let payload;

    try {
      payload = await this.tokenService.verifyAccessToken(token);
    } catch {
      throw this.invalidAccessToken();
    }

    if (
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string"
    ) {
      throw this.invalidAccessToken();
    }

    const session =
      await this.authRepository.findAccessSession(payload.sid);

    const now = new Date();

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== "ACTIVE"
    ) {
      throw new UnauthorizedException({
        code: "AUTH_SESSION_INVALID",
        message: "Authentication session is invalid or expired.",
      });
    }

    request.auth = {
      userId: session.user.id,
      sessionId: session.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        status: "ACTIVE",
        emailVerified:
          session.user.emailVerifiedAt !== null,
      },
    };

    return true;
  }

  private invalidAccessToken(): UnauthorizedException {
    return new UnauthorizedException({
      code: "AUTH_ACCESS_TOKEN_INVALID",
      message: "Access token is invalid or expired.",
    });
  }
}