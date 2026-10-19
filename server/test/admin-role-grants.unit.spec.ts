import {
  ADMIN_ROLE_DEFINITIONS, adminGrantMode, assertAdminGrantTarget, assertConnectedAdminGrantTarget,
  planAdminRoleGrants, type ExistingAdminRole,
} from "../prisma/seed-data/admin-role-grants";

const permissions = ["user.view", "user.update", "audit.view"]
  .map((code) => ({ code, isDeprecated: false }));

function role(code: "USER_ADMIN" | "AUDIT_VIEWER", grants: ExistingAdminRole["grants"]): ExistingAdminRole {
  const definition = ADMIN_ROLE_DEFINITIONS.find((item) => item.systemCode === code)!;
  return { id: code, systemCode: code, kind: "SYSTEM", companyId: null,
    normalizedName: definition.name.toLowerCase(), isProtected: true, isActive: true,
    assignedUserCount: 0, grants };
}

describe("scoped admin role grant plan", () => {
  it("defaults to read-only and requires two explicit apply gates", () => {
    expect(adminGrantMode([], undefined)).toBe("dry-run");
    expect(adminGrantMode(["--dry-run"], "YES")).toBe("dry-run");
    expect(() => adminGrantMode(["--apply"], "YES")).toThrow();
    expect(() => adminGrantMode(["--apply", "--approve-test-grants"], undefined)).toThrow();
    expect(adminGrantMode(["--apply", "--approve-test-grants"], "YES")).toBe("apply");
  });
  it("reports only the two proposed missing roles and grants, without users or secrets", () => {
    const plan = planAdminRoleGrants([], permissions);
    expect(plan).toEqual({
      roles: [
        { code: "USER_ADMIN", missingRole: true, missingGrants: ["user.view:SYSTEM", "user.update:SYSTEM"],
          assignedUserCount: 0, conflicts: [] },
        { code: "AUDIT_VIEWER", missingRole: true, missingGrants: ["audit.view:SYSTEM"],
          assignedUserCount: 0, conflicts: [] },
      ],
      missingPermissions: [], canApply: true, hasChanges: true,
    });
    expect(JSON.stringify(plan)).not.toContain("password");
  });

  it("is unchanged on replay after the intended grants exist", () => {
    const roles = ADMIN_ROLE_DEFINITIONS.map((definition) => role(
      definition.systemCode as "USER_ADMIN" | "AUDIT_VIEWER",
      definition.permissions.map((grant) => ({ code: grant.code, scope: grant.scope })),
    ));
    expect(planAdminRoleGrants(roles, permissions)).toMatchObject({ canApply: true, hasChanges: false });
  });

  it("refuses wrong scope, unexpected grant, missing registry permission and assigned users needing elevation", () => {
    const wrong = role("USER_ADMIN", [{ code: "user.view", scope: "OWN" },
      { code: "role.assign", scope: "SYSTEM" }]);
    wrong.assignedUserCount = 1;
    const plan = planAdminRoleGrants([wrong], permissions.filter((p) => p.code !== "audit.view"));
    expect(plan.canApply).toBe(false);
    expect(plan.missingPermissions).toEqual(["audit.view"]);
    expect(plan.roles[0]?.conflicts).toContain("role has unexpected or incorrectly scoped grants");
    expect(plan.roles[0]?.conflicts).toContain("role has assignees; adding grants could elevate existing users");
  });

  it("requires an exact local test URL and connected PostgreSQL identity", () => {
    const safe = "postgresql://test:placeholder@127.0.0.1:5432/findwork_test?schema=public";
    expect(() => assertAdminGrantTarget("test", safe)).not.toThrow();
    for (const [environment, url] of [
      ["production", safe], ["test", safe.replace("findwork_test", "findwork_dev")],
      ["test", safe.replace("127.0.0.1", "remote.example")],
      ["test", safe.replace("schema=public", "schema=private")],
    ]) expect(() => assertAdminGrantTarget(environment, url)).toThrow();
    expect(() => assertConnectedAdminGrantTarget({ database: "findwork_test", schema: "public",
      address: "127.0.0.1/32", port: 5432 })).not.toThrow();
    expect(() => assertConnectedAdminGrantTarget({ database: "findwork_dev", schema: "public",
      address: "127.0.0.1/32", port: 5432 })).toThrow();
  });
});
