import "reflect-metadata";
import { type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS } from "../prisma/seed-data/permissions";
import { SYSTEM_ROLES } from "../prisma/seed-data/system-roles";
import { AdminController } from "../src/modules/admin/admin.controller";
import { PermissionGuard } from "../src/modules/authorization/guards/permission.guard";

const expected: Record<string, string[]> = {
  CANDIDATE: [],
  SUPPORT_ADMIN: ["user.view", "company.view", "job.view"],
  USER_ADMIN: ["user.view", "user.update"],
  AUDIT_VIEWER: ["audit.view"],
  VERIFICATION_ADMIN: ["company.view", "company.verify", "company.suspend"],
  MODERATION_ADMIN: ["company.view", "job.view", "job.moderate"],
};

function context(handler: (...args: never[]) => unknown, auth?: { userId: string }): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => AdminController,
    switchToHttp: () => ({ getRequest: () => auth ? { auth } : {} }),
  } as unknown as ExecutionContext;
}

describe("approved platform admin role boundary", () => {
  it("keeps each seeded administrative role least privileged and all grants SYSTEM scoped", () => {
    const registry = new Set(PERMISSIONS.map((permission) => permission.code));
    expect(new Set(SYSTEM_ROLES.map((role) => role.systemCode)).size).toBe(SYSTEM_ROLES.length);
    for (const role of SYSTEM_ROLES) {
      const adminGrants = role.permissions.filter((grant) => grant.scope === "SYSTEM");
      expect(adminGrants.map((grant) => grant.code).sort()).toEqual(expected[role.systemCode]?.sort());
      expect(role.permissions.every((grant) => registry.has(grant.code))).toBe(true);
    }
    expect(SYSTEM_ROLES.find((role) => role.systemCode === "CANDIDATE")?.permissions
      .every((grant) => grant.scope === "OWN")).toBe(true);
    const assigned = new Set(SYSTEM_ROLES.flatMap((role) => role.permissions.map((grant) => grant.code)));
    expect(assigned.has("user.update")).toBe(true);
    expect(assigned.has("audit.view")).toBe(true);
    expect(assigned.has("user.disable")).toBe(false);
    expect(SYSTEM_ROLES.every((role) => role.isProtected)).toBe(true);
    expect(SYSTEM_ROLES.find((role) => role.systemCode === "USER_ADMIN")?.permissions
      .some((grant) => grant.code === "role.assign" || grant.code === "permission.assign")).toBe(false);
  });

  it("returns 401 without authentication and 403 without a required SYSTEM grant", async () => {
    const resolveRequiredSystemPermissions = jest.fn().mockResolvedValue({ allowed: false, context: null });
    const guard = new PermissionGuard(new Reflector(), { resolveRequiredSystemPermissions } as never);
    await expect(guard.canActivate(context(AdminController.prototype.disableUser))).rejects.toMatchObject({ status: 401 });
    expect(resolveRequiredSystemPermissions).not.toHaveBeenCalled();
    await expect(guard.canActivate(context(AdminController.prototype.disableUser, { userId: "candidate" })))
      .rejects.toMatchObject({ status: 403 });
    expect(resolveRequiredSystemPermissions).toHaveBeenCalledWith("candidate", ["user.disable"]);
  });
});
