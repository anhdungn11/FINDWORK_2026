import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "../../auth/guards/access-token.guard";
import { AuthorizationService } from "../authorization.service";
import {
  REQUIRED_PERMISSIONS_KEY,
} from "../decorators/require-permissions.decorator";
import type { AuthorizationContext } from "../types/authorization.types";

export interface AuthorizedRequest
  extends AuthenticatedRequest {
  authorization?: AuthorizationContext;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<
        string[]
      >(
        REQUIRED_PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      ) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<
        AuthorizedRequest
      >();

    if (!request.auth) {
      throw new UnauthorizedException({
        code: "AUTH_ACCESS_TOKEN_REQUIRED",
        message: "Access token is required.",
      });
    }

    const result =
      await this.authorizationService.resolveRequiredSystemPermissions(
        request.auth.userId,
        requiredPermissions,
      );

    if (!result.allowed || !result.context) {
      throw new ForbiddenException({
        code: "AUTHORIZATION_FORBIDDEN",
        message:
          "You do not have permission to perform this action.",
      });
    }

    request.authorization = result.context;

    return true;
  }
}
