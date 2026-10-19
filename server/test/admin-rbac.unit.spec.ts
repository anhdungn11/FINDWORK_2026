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
    for (const role of SYSTEM_ROLES) {
      const adminGrants = role.permissions.filter((grant) => grant.scope === "SYSTEM");
      expect(adminGrants.map((grant) => grant.code).sort()).toEqual(expected[role.systemCode]?.sort());
      expect(role.permissions.every((grant) => registry.has(grant.code))).toBe(true);
    }
    expect(SYSTEM_ROLES.find((role) => role.systemCode === "CANDIDATE")?.permissions
      .every((grant) => grant.scope === "OWN")).toBe(true);
    const assigned = new Set(SYSTEM_ROLES.flatMap((role) => role.permissions.map((grant) => grant.code)));
    for (const code of ["user.update", "user.disable", "audit.view"]) expect(assigned.has(code)).toBe(false);
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
