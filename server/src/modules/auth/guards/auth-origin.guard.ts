import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

@Injectable()
export class AuthOriginGuard implements CanActivate {
  private readonly allowedOrigins: Set<string>;

  constructor(configService: ConfigService) {
    this.allowedOrigins = new Set(
      configService.getOrThrow<string[]>("CORS_ORIGINS"),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request =
      context.switchToHttp().getRequest<Request>();

    const origin = request.headers.origin;

    if (!origin) {
      return true;
    }

    if (!this.allowedOrigins.has(origin)) {
      throw new ForbiddenException({
        code: "AUTH_ORIGIN_FORBIDDEN",
        message: "Request origin is not allowed.",
      });
    }

    return true;
  }
}