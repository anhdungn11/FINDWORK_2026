import { Injectable } from "@nestjs/common";
import { AuthorizationRepository } from "../authorization.repository";
import type {
  AuthorizationDecision,
  SystemAuthorizationScope,
} from "../types/authorization.types";

@Injectable()
export class PermissionResolverService {
  constructor(
    private readonly authorizationRepository: AuthorizationRepository,
  ) {}

  async resolveSystemPermission(
    userId: string,
    permissionCode: string,
    now = new Date(),
  ): Promise<AuthorizationDecision> {
    const snapshot =
      await this.authorizationRepository.findSystemPermissionGrantSnapshot(
        userId,
        permissionCode,
      );

    if (!snapshot) {
      return this.deny(permissionCode, "NONE");
    }

    if (snapshot.isDeprecated) {
      return this.deny(
        permissionCode,
        "DEPRECATED",
      );
    }

    const direct = snapshot.directOverride;

    if (
      direct &&
      (!direct.expiresAt ||
        direct.expiresAt > now)
    ) {
      if (direct.effect === "DENY") {
        return this.deny(
          permissionCode,
          "DIRECT",
        );
      }

      if (direct.effect === "ALLOW") {
        if (
          this.isSystemScope(
            direct.dataScope,
          )
        ) {
          return {
            code: permissionCode,
            allowed: true,
            scope: direct.dataScope,
            source: "DIRECT",
          };
        }

        return this.deny(
          permissionCode,
          "INVALID",
        );
      }

      return this.deny(
        permissionCode,
        "INVALID",
      );
    }

    if (
      snapshot.roleScopes.some(
        (scope) =>
          !this.isSystemScope(scope),
      )
    ) {
      return this.deny(
        permissionCode,
        "INVALID",
      );
    }

    if (
      snapshot.roleScopes.includes(
        "SYSTEM",
      )
    ) {
      return {
        code: permissionCode,
        allowed: true,
        scope: "SYSTEM",
        source: "ROLE",
      };
    }

    if (
      snapshot.roleScopes.includes("OWN")
    ) {
      return {
        code: permissionCode,
        allowed: true,
        scope: "OWN",
        source: "ROLE",
      };
    }

    return this.deny(
      permissionCode,
      "NONE",
    );
  }

  private isSystemScope(
    scope:
      | "OWN"
      | "ASSIGNED"
      | "COMPANY"
      | "SYSTEM"
      | null,
  ): scope is SystemAuthorizationScope {
    return (
      scope === "OWN" ||
      scope === "SYSTEM"
    );
  }

  private deny(
    code: string,
    source:
      | "DIRECT"
      | "NONE"
      | "DEPRECATED"
      | "INVALID",
  ): AuthorizationDecision {
    return {
      code,
      allowed: false,
      scope: null,
      source,
    };
  }
}
