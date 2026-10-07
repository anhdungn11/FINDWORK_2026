export type SystemAuthorizationScope =
  | "OWN"
  | "SYSTEM";

export type AuthorizationDecisionSource =
  | "DIRECT"
  | "ROLE"
  | "NONE"
  | "DEPRECATED"
  | "INVALID";

export interface AuthorizationDecision {
  code: string;
  allowed: boolean;
  scope: SystemAuthorizationScope | null;
  source: AuthorizationDecisionSource;
}

export interface GrantedAuthorizationPermission {
  scope: SystemAuthorizationScope;
  source: "DIRECT" | "ROLE";
}

export interface AuthorizationContext {
  userId: string;
  permissions: Record<
    string,
    GrantedAuthorizationPermission
  >;
}

export interface SystemPermissionGrantSnapshot {
  code: string;
  isDeprecated: boolean;
  directOverride: {
    effect: "ALLOW" | "DENY";
    dataScope:
      | "OWN"
      | "ASSIGNED"
      | "COMPANY"
      | "SYSTEM"
      | null;
    expiresAt: Date | null;
  } | null;
  roleScopes: Array<
    "OWN" | "ASSIGNED" | "COMPANY" | "SYSTEM"
  >;
}
