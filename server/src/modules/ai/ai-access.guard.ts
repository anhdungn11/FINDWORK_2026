import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Request } from "express";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { AccessTokenGuard, type AuthenticatedRequest } from "../auth/guards/access-token.guard";

export type AiIdentity = { type: "user" | "guest"; id: string };
export interface AiRequest extends AuthenticatedRequest { aiIdentity?: AiIdentity }

@Injectable()
export class AiAccessGuard implements CanActivate {
  constructor(private readonly access: AccessTokenGuard, private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AiRequest>();
    if (req.headers.authorization) {
      await this.access.canActivate(context);
      req.aiIdentity = { type: "user", id: req.auth!.userId };
      return true;
    }
    const token = req.header("x-findwork-guest-token");
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw this.invalid();
    const hash = createHash("sha256").update(token).digest("hex");
    const session = await this.db.aiGuestSession.findUnique({ where: { tokenHash: hash },
      select: { id: true, expiresAt: true } });
    if (!session || session.expiresAt <= new Date()) throw this.invalid();
    req.aiIdentity = { type: "guest", id: session.id };
    return true;
  }
  private invalid() { return new UnauthorizedException({ code: "AI_AUTH_REQUIRED", message: "A user access token or valid guest session is required." }); }
}
