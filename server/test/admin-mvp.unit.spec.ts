import { GUARDS_METADATA } from "@nestjs/common/constants";
import { AdminController } from "../src/modules/admin/admin.controller";
import { AdminService } from "../src/modules/admin/admin.service";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { PermissionGuard } from "../src/modules/authorization/guards/permission.guard";
import { REQUIRED_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-permissions.decorator";

const actorId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";
const companyId = "33333333-3333-4333-8333-333333333333";
const jobId = "44444444-4444-4444-8444-444444444444";

function fakeDb() {
  const tx = {
    user: { findUnique: jest.fn().mockResolvedValue({ status: "ACTIVE" }), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue({ id: targetId, status: "SUSPENDED" }) },
    company: { findUnique: jest.fn().mockResolvedValue({ status: "ACTIVE", verificationStatus: "PENDING" }), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue({ id: companyId }) },
    job: { findUnique: jest.fn().mockResolvedValue({ companyId, status: "PUBLISHED", version: 1 }), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue({ id: jobId }) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const list = { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) };
  return { tx, db: { $transaction: jest.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)), user: { ...list, findUnique: jest.fn().mockResolvedValue({ id: targetId }) }, company: { ...list, findUnique: jest.fn().mockResolvedValue({ id: companyId }) }, job: { ...list, findUnique: jest.fn().mockResolvedValue({ id: jobId }) }, application: { count: jest.fn().mockResolvedValue(0) }, auditLog: { ...list } } };
}

describe("platform admin MVP security", () => {
  it("requires access, system permission guard, and separate mutation permissions", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminController)).toEqual([AccessTokenGuard, PermissionGuard]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AdminController.prototype.dashboard)).toEqual(["user.view", "company.view", "job.view"]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AdminController.prototype.disableUser)).toEqual(["user.disable"]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AdminController.prototype.closeJob)).toEqual(["job.moderate"]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AdminController.prototype.audits)).toEqual(["audit.view"]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AdminController.prototype.user)).toEqual(["user.view"]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AdminController.prototype.company)).toEqual(["company.view"]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AdminController.prototype.job)).toEqual(["job.view"]);
  });

  it("does not accept a company-scoped ADMIN grant for the platform dashboard", () => {
    const { db } = fakeDb();
    const controller = new AdminController(new AdminService(db as never));
    expect(() => controller.dashboard({ authorization: { permissions: {
      "user.view": { scope: "SYSTEM" },
      "company.view": { scope: "COMPANY" },
      "job.view": { scope: "SYSTEM" },
    } } } as never)).toThrow(expect.objectContaining({ status: 403 }));
    expect(db.user.count).not.toHaveBeenCalled();
  });

  it("does not select password hashes in user listing and pages on server", async () => {
    const { db } = fakeDb();
    await new AdminService(db as never).users({ page: 2, pageSize: 10, q: "example" });
    expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10,
      where: { email: { contains: "example", mode: "insensitive" } } }));
    const select = db.user.findMany.mock.calls[0][0].select;
    expect(select.passwordHash).toBeUndefined();
    expect(select.email).toBe(true);
  });

  it("requires SYSTEM scope for detail reads and returns 404 for missing records", async () => {
    const { db } = fakeDb();
    const controller = new AdminController(new AdminService(db as never));
    expect(() => controller.user({ authorization: { permissions: { "user.view": { scope: "COMPANY" } } } } as never, targetId))
      .toThrow(expect.objectContaining({ status: 403 }));
    expect(db.user.findUnique).not.toHaveBeenCalled();
    db.user.findUnique.mockResolvedValueOnce(null);
    await expect(new AdminService(db as never).user(targetId)).rejects.toMatchObject({ status: 404 });
    await new AdminService(db as never).user(targetId);
    expect(db.user.findUnique.mock.calls[1][0].select.passwordHash).toBeUndefined();
    db.company.findUnique.mockResolvedValueOnce(null);
    await expect(new AdminService(db as never).company(companyId)).rejects.toMatchObject({ status: 404 });
    db.job.findUnique.mockResolvedValueOnce(null);
    await expect(new AdminService(db as never).job(jobId)).rejects.toMatchObject({ status: 404 });
  });

  it("allows verification decisions only for pending active companies", async () => {
    const { tx, db } = fakeDb();
    tx.company.findUnique.mockResolvedValueOnce({ status: "ACTIVE", verificationStatus: "UNVERIFIED" });
    await expect(new AdminService(db as never).setCompanyVerification(actorId, companyId, "VERIFIED"))
      .rejects.toMatchObject({ status: 409 });
    expect(tx.company.updateMany).not.toHaveBeenCalled();
    await new AdminService(db as never).setCompanyVerification(actorId, companyId, "VERIFIED");
    expect(tx.company.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: companyId, status: "ACTIVE", verificationStatus: "PENDING" },
    }));
  });

  it("rejects self status mutation before opening a transaction", async () => {
    const { db } = fakeDb();
    await expect(new AdminService(db as never).setUserStatus(actorId, actorId, "SUSPENDED")).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("audits user status change and restricts compare-and-swap by old status", async () => {
    const { tx, db } = fakeDb();
    await new AdminService(db as never).setUserStatus(actorId, targetId, "SUSPENDED");
    expect(tx.user.updateMany).toHaveBeenCalledWith({ where: { id: targetId, status: "ACTIVE" }, data: { status: "SUSPENDED" } });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorUserId: actorId, action: "admin.user.status", targetId }) }));
  });

  it("closes a job with version check and audit in one transaction", async () => {
    const { tx, db } = fakeDb();
    await new AdminService(db as never).closeJob(actorId, jobId);
    expect(tx.job.updateMany).toHaveBeenCalledWith({ where: { id: jobId, status: "PUBLISHED", version: 1 }, data: { status: "CLOSED", version: { increment: 1 } } });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorUserId: actorId, action: "admin.job.close", companyId, targetId: jobId }) }));
  });

  it("hides audit payloads in listing", async () => {
    const { db } = fakeDb();
    await new AdminService(db as never).audits({ page: 1, pageSize: 20 });
    const select = db.auditLog.findMany.mock.calls[0][0].select;
    expect(select.beforeData).toBeUndefined();
    expect(select.afterData).toBeUndefined();
    expect(select.metadata).toBeUndefined();
  });
});
