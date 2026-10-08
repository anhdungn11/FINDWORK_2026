import { Injectable } from "@nestjs/common";
import { AuthorizationRepository } from "./authorization.repository";
import { PermissionResolverService } from "./services/permission-resolver.service";
import type {
  AuthorizationContext,
  AuthorizationDecision,
  CompanyAuthorizationContext,
  CompanyAuthorizationScope,
  SystemAuthorizationScope,
} from "./types/authorization.types";

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly permissionResolver: PermissionResolverService,
    private readonly authorizationRepository: AuthorizationRepository,
  ) {}

  async resolveRequiredSystemPermissions(
    userId: string,
    permissionCodes: readonly string[],
  ): Promise<{
    allowed: boolean;
    decisions: Array<
      AuthorizationDecision<SystemAuthorizationScope>
    >;
    context: AuthorizationContext | null;
  }> {
    const uniqueCodes = this.normalizePermissionCodes(
      permissionCodes,
    );

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

    const permissions = Object.fromEntries(
      decisions.map((decision) => [
        decision.code,
        {
          scope: decision.scope!,
          source: decision.source as
            | "DIRECT"
            | "ROLE",
        },
      ]),
    ) as AuthorizationContext["permissions"];

    return {
      allowed: true,
      decisions,
      context: {
        userId,
        permissions,
      },
    };
  }

  async resolveRequiredCompanyPermissions(
    userId: string,
    companyId: string,
    permissionCodes: readonly string[],
  ): Promise<{
    allowed: boolean;
    decisions: Array<
      AuthorizationDecision<CompanyAuthorizationScope>
    >;
    context: CompanyAuthorizationContext | null;
  }> {
    const uniqueCodes = this.normalizePermissionCodes(
      permissionCodes,
    );

    const companyMember =
      await this.authorizationRepository.findActiveCompanyMember(
        userId,
        companyId,
      );

    if (!companyMember) {
      return {
        allowed: false,
        decisions: uniqueCodes.map((code) => ({
          code,
          allowed: false,
          scope: null,
          source: "NONE" as const,
        })),
        context: null,
      };
    }

    if (uniqueCodes.length === 0) {
      return {
        allowed: true,
        decisions: [],
        context: {
          userId,
          companyId,
          companyMemberId: companyMember.id,
          permissions: {},
        },
      };
    }

    const decisions = await Promise.all(
      uniqueCodes.map((code) =>
        this.permissionResolver.resolveCompanyPermission(
          companyMember.id,
          companyId,
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

    const permissions = Object.fromEntries(
      decisions.map((decision) => [
        decision.code,
        {
          scope: decision.scope!,
          source: decision.source as
            | "DIRECT"
            | "ROLE",
        },
      ]),
    ) as CompanyAuthorizationContext["permissions"];

    return {
      allowed: true,
      decisions,
      context: {
        userId,
        companyId,
        companyMemberId: companyMember.id,
        permissions,
      },
    };
  }

  private normalizePermissionCodes(
    permissionCodes: readonly string[],
  ): string[] {
    return [
      ...new Set(
        permissionCodes
          .map((code) => code.trim())
          .filter(Boolean),
      ),
    ];
  }
}
