import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { isUUID } from "class-validator";
import type { AuthenticatedRequest } from "../../auth/guards/access-token.guard";
import { AuthorizationService } from "../authorization.service";
import {
  REQUIRED_COMPANY_PERMISSIONS_KEY,
} from "../decorators/require-company-permissions.decorator";
import type { CompanyAuthorizationContext } from "../types/authorization.types";

export interface CompanyAuthorizedRequest
  extends AuthenticatedRequest {
  companyAuthorization?: CompanyAuthorizationContext;
}

@Injectable()
export class CompanyPermissionGuard
  implements CanActivate {
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
        REQUIRED_COMPANY_PERMISSIONS_KEY,
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
        CompanyAuthorizedRequest
      >();

    if (!request.auth) {
      throw new UnauthorizedException({
        code: "AUTH_ACCESS_TOKEN_REQUIRED",
        message: "Access token is required.",
      });
    }

    const companyIdParam = request.params?.companyId;
    const companyId = Array.isArray(companyIdParam)
      ? undefined
      : companyIdParam;

    if (typeof companyId !== "string" || !isUUID(companyId)) {
      throw new BadRequestException({
        code: "AUTHORIZATION_COMPANY_CONTEXT_INVALID",
        message:
          "A valid companyId route parameter is required.",
      });
    }

    const result =
      await this.authorizationService.resolveRequiredCompanyPermissions(
        request.auth.userId,
        companyId,
        requiredPermissions,
      );

    if (!result.allowed || !result.context) {
      throw new ForbiddenException({
        code: "AUTHORIZATION_FORBIDDEN",
        message:
          "You do not have permission to perform this action.",
      });
    }

    request.companyAuthorization = result.context;

    return true;
  }
}
