import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SetMetadata } from "@nestjs/common";
import type { AuthenticatedRequest } from "./access-token.guard";
import type { PublicAuthUser } from "../types/auth.types";

const ACCOUNT_TYPES_KEY = "requiredAccountTypes";
type AccountType = PublicAuthUser["accountType"];

export const RequireAccountTypes = (...types: AccountType[]) => SetMetadata(ACCOUNT_TYPES_KEY, types);

@Injectable()
export class AccountTypeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<AccountType[]>(ACCOUNT_TYPES_KEY,
      [context.getHandler(), context.getClass()]);
    if (!allowed) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      throw new UnauthorizedException({ code: "AUTH_ACCESS_TOKEN_REQUIRED", message: "Access token is required." });
    }
    if (!allowed.includes(request.auth.user.accountType ?? "LEGACY_UNCLASSIFIED")) {
      throw new ForbiddenException({
        code: "AUTH_ACCOUNT_TYPE_FORBIDDEN",
        message: "This account type cannot access this workspace.",
      });
    }
    return true;
  }
}
