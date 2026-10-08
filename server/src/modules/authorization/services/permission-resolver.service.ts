import { Injectable } from "@nestjs/common";
import { AuthorizationRepository } from "../authorization.repository";
import type {
  AuthorizationDecision,
  CompanyAuthorizationScope,
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
  ): Promise<AuthorizationDecision<SystemAuthorizationScope>> {
    const snapshot =
      await this.authorizationRepository.findSystemPermissionGrantSnapshot(
        userId,
        permissionCode,
      );

    if (!snapshot) {
      return this.denySystem(permissionCode, "NONE");
    }

    if (snapshot.isDeprecated) {
      return this.denySystem(
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
        return this.denySystem(
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

        return this.denySystem(
          permissionCode,
          "INVALID",
        );
      }

      return this.denySystem(
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
      return this.denySystem(
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

    return this.denySystem(
      permissionCode,
      "NONE",
    );
  }

  async resolveCompanyPermission(
    companyMemberId: string,
    companyId: string,
    permissionCode: string,
    now = new Date(),
  ): Promise<AuthorizationDecision<CompanyAuthorizationScope>> {
    const snapshot =
      await this.authorizationRepository.findCompanyPermissionGrantSnapshot(
        companyMemberId,
        companyId,
        permissionCode,
      );

    if (!snapshot) {
      return this.denyCompany(
        permissionCode,
        "NONE",
      );
    }

    if (snapshot.isDeprecated) {
      return this.denyCompany(
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
        return this.denyCompany(
          permissionCode,
          "DIRECT",
        );
      }

      if (direct.effect === "ALLOW") {
        if (
          this.isCompanyScope(
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

        return this.denyCompany(
          permissionCode,
          "INVALID",
        );
      }

      return this.denyCompany(
        permissionCode,
        "INVALID",
      );
    }

    if (
      snapshot.roleScopes.some(
        (scope) =>
          !this.isCompanyScope(scope),
      )
    ) {
      return this.denyCompany(
        permissionCode,
        "INVALID",
      );
    }

    if (
      snapshot.roleScopes.includes(
        "COMPANY",
      )
    ) {
      return {
        code: permissionCode,
        allowed: true,
        scope: "COMPANY",
        source: "ROLE",
      };
    }

    if (
      snapshot.roleScopes.includes(
        "ASSIGNED",
      )
    ) {
      return {
        code: permissionCode,
        allowed: true,
        scope: "ASSIGNED",
        source: "ROLE",
      };
    }

    return this.denyCompany(
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

  private isCompanyScope(
    scope:
      | "OWN"
      | "ASSIGNED"
      | "COMPANY"
      | "SYSTEM"
      | null,
  ): scope is CompanyAuthorizationScope {
    return (
      scope === "ASSIGNED" ||
      scope === "COMPANY"
    );
  }

  private denySystem(
    code: string,
    source:
      | "DIRECT"
      | "NONE"
      | "DEPRECATED"
      | "INVALID",
  ): AuthorizationDecision<SystemAuthorizationScope> {
    return {
      code,
      allowed: false,
      scope: null,
      source,
    };
  }

  private denyCompany(
    code: string,
    source:
      | "DIRECT"
      | "NONE"
      | "DEPRECATED"
      | "INVALID",
  ): AuthorizationDecision<CompanyAuthorizationScope> {
    return {
      code,
      allowed: false,
      scope: null,
      source,
    };
  }
}
