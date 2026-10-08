export type SystemAuthorizationScope =
  | "OWN"
  | "SYSTEM";

export type CompanyAuthorizationScope =
  | "ASSIGNED"
  | "COMPANY";

export type AuthorizationDecisionSource =
  | "DIRECT"
  | "ROLE"
  | "NONE"
  | "DEPRECATED"
  | "INVALID";

export interface AuthorizationDecision<
  TScope extends
    | SystemAuthorizationScope
    | CompanyAuthorizationScope = SystemAuthorizationScope,
> {
  code: string;
  allowed: boolean;
  scope: TScope | null;
  source: AuthorizationDecisionSource;
}

export interface GrantedAuthorizationPermission<
  TScope extends
    | SystemAuthorizationScope
    | CompanyAuthorizationScope = SystemAuthorizationScope,
> {
  scope: TScope;
  source: "DIRECT" | "ROLE";
}

export interface AuthorizationContext {
  userId: string;
  permissions: Record<
    string,
    GrantedAuthorizationPermission<SystemAuthorizationScope>
  >;
}

export interface CompanyAuthorizationContext {
  userId: string;
  companyId: string;
  companyMemberId: string;
  permissions: Record<
    string,
    GrantedAuthorizationPermission<CompanyAuthorizationScope>
  >;
}

interface PermissionDirectOverrideSnapshot {
  effect: "ALLOW" | "DENY";
  dataScope:
    | "OWN"
    | "ASSIGNED"
    | "COMPANY"
    | "SYSTEM"
    | null;
  expiresAt: Date | null;
}

export interface SystemPermissionGrantSnapshot {
  code: string;
  isDeprecated: boolean;
  directOverride: PermissionDirectOverrideSnapshot | null;
  roleScopes: Array<
    "OWN" | "ASSIGNED" | "COMPANY" | "SYSTEM"
  >;
}

export interface CompanyPermissionGrantSnapshot {
  code: string;
  isDeprecated: boolean;
  directOverride: PermissionDirectOverrideSnapshot | null;
  roleScopes: Array<
    "OWN" | "ASSIGNED" | "COMPANY" | "SYSTEM"
  >;
}
