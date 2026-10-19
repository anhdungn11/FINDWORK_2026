import { SYSTEM_ROLES } from "./system-roles";

export const ADMIN_ROLE_CODES = ["USER_ADMIN", "AUDIT_VIEWER"] as const;
export const ADMIN_ROLE_DEFINITIONS = ADMIN_ROLE_CODES.map((code) => {
  const role = SYSTEM_ROLES.find((item) => item.systemCode === code);
  if (!role || !role.isProtected || role.permissions.some((grant) => grant.scope !== "SYSTEM")) {
    throw new Error(`Invalid scoped admin role definition: ${code}`);
  }
  return role;
});

export function adminGrantMode(args: string[], allowWrite: string | undefined): "dry-run" | "apply" {
  const apply = args.includes("--apply");
  if (args.some((arg) => !["--dry-run", "--apply", "--approve-test-grants"].includes(arg)) ||
    (apply && args.includes("--dry-run")) || (!apply && args.includes("--approve-test-grants"))) {
    throw new Error("Usage: npm run admin:grants -- [--dry-run | --apply --approve-test-grants]");
  }
  if (apply && (!args.includes("--approve-test-grants") || allowWrite !== "YES")) {
    throw new Error("Apply requires explicit approval, --approve-test-grants and ADMIN_ROLE_GRANTS_ALLOW_WRITE=YES.");
  }
  return apply ? "apply" : "dry-run";
}

export interface ExistingAdminRole {
  id: string;
  systemCode: string | null;
  kind: "SYSTEM" | "COMPANY";
  companyId: string | null;
  normalizedName: string;
  isProtected: boolean;
  isActive: boolean;
  assignedUserCount: number;
  grants: Array<{ code: string; scope: string }>;
}

export interface AdminGrantPlan {
  roles: Array<{
    code: string;
    missingRole: boolean;
    missingGrants: string[];
    assignedUserCount: number;
    conflicts: string[];
  }>;
  missingPermissions: string[];
  canApply: boolean;
  hasChanges: boolean;
}

export function assertAdminGrantTarget(nodeEnv: string | undefined, databaseUrl: string | undefined): void {
  let url: URL;
  try { url = new URL(databaseUrl ?? ""); }
  catch { throw new Error("Admin grants require a valid local test DATABASE_URL."); }
  if (nodeEnv !== "test" || !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" || url.port !== "5432" ||
    decodeURIComponent(url.pathname) !== "/findwork_test" ||
    url.searchParams.get("schema") !== "public") {
    throw new Error("Admin grants require NODE_ENV=test and 127.0.0.1:5432/findwork_test?schema=public.");
  }
}

export function assertConnectedAdminGrantTarget(identity: {
  database: string; schema: string; address: string | null; port: number | null;
} | undefined): asserts identity is {
  database: string; schema: string; address: string | null; port: number | null;
} {
  if (identity?.database !== "findwork_test" || identity.schema !== "public" ||
    !["127.0.0.1", "127.0.0.1/32"].includes(identity.address ?? "") || identity.port !== 5432) {
    throw new Error("Connected PostgreSQL server is not local findwork_test/public:5432.");
  }
}

export function planAdminRoleGrants(
  existingRoles: ExistingAdminRole[],
  availablePermissions: Array<{ code: string; isDeprecated: boolean }>,
): AdminGrantPlan {
  const available = new Set(availablePermissions.filter((permission) => !permission.isDeprecated)
    .map((permission) => permission.code));
  const needed = new Set(ADMIN_ROLE_DEFINITIONS.flatMap((role) => role.permissions.map((grant) => grant.code)));
  const missingPermissions = [...needed].filter((code) => !available.has(code)).sort();
  const roles = ADMIN_ROLE_DEFINITIONS.map((definition) => {
    const current = existingRoles.find((role) => role.systemCode === definition.systemCode);
    const expected = new Map(definition.permissions.map((grant) => [grant.code, grant.scope]));
    const missingGrants = definition.permissions.filter((grant) =>
      !current?.grants.some((existing) => existing.code === grant.code && existing.scope === grant.scope))
      .map((grant) => `${grant.code}:${grant.scope}`);
    const conflicts: string[] = [];
    if (current && (current.kind !== "SYSTEM" || current.companyId !== null ||
      current.normalizedName !== definition.name.trim().toLowerCase() ||
      !current.isProtected || !current.isActive)) conflicts.push("role metadata differs from approved definition");
    if (current?.grants.some((grant) => expected.get(grant.code) !== grant.scope)) {
      conflicts.push("role has unexpected or incorrectly scoped grants");
    }
    if (current && missingGrants.length > 0 && current.assignedUserCount > 0) {
      conflicts.push("role has assignees; adding grants could elevate existing users");
    }
    return { code: definition.systemCode, missingRole: !current, missingGrants,
      assignedUserCount: current?.assignedUserCount ?? 0, conflicts };
  });
  return { roles, missingPermissions, canApply: missingPermissions.length === 0 &&
    roles.every((role) => role.conflicts.length === 0),
    hasChanges: roles.some((role) => role.missingRole || role.missingGrants.length > 0) };
}
