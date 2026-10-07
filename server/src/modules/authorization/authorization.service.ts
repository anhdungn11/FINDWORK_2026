import { Injectable } from "@nestjs/common";
import { PermissionResolverService } from "./services/permission-resolver.service";
import type {
  AuthorizationContext,
  AuthorizationDecision,
} from "./types/authorization.types";

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async resolveRequiredSystemPermissions(
    userId: string,
    permissionCodes: readonly string[],
  ): Promise<{
    allowed: boolean;
    decisions: AuthorizationDecision[];
    context: AuthorizationContext | null;
  }> {
    const uniqueCodes = [
      ...new Set(
        permissionCodes
          .map((code) => code.trim())
          .filter(Boolean),
      ),
    ];

    if (uniqueCodes.length === 0) {
      return {
        allowed: true,
        decisions: [],
        context: {
          userId,
          permissions: {},
        },
      };
    }

    const decisions = await Promise.all(
      uniqueCodes.map((code) =>
        this.permissionResolver.resolveSystemPermission(
          userId,
          code,
        ),
      ),
    );

    if (
      decisions.some(
        (decision) =>
          !decision.allowed ||
          !decision.scope ||
          (decision.source !== "DIRECT" &&
            decision.source !== "ROLE"),
      )
    ) {
      return {
        allowed: false,
        decisions,
        context: null,
      };
    }

    const permissions =
      Object.fromEntries(
        decisions.map((decision) => [
          decision.code,
          {
            scope: decision.scope!,
            source: decision.source as
              | "DIRECT"
              | "ROLE",
          },
        ]),
      );

    return {
      allowed: true,
      decisions,
      context: {
        userId,
        permissions,
      },
    };
  }
}
