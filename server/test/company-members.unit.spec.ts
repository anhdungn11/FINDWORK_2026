import { GUARDS_METADATA } from "@nestjs/common/constants";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { REQUIRED_COMPANY_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-company-permissions.decorator";
import { CompanyPermissionGuard } from "../src/modules/authorization/guards/company-permission.guard";
import { CompanyMembersController } from "../src/modules/company/company-members.controller";
import { CompanyMembersService } from "../src/modules/company/company-members.service";

const companyId = "33333333-3333-4333-8333-333333333333";
const actorId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";

function fixture() {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: companyId }]),
    company: { findUnique: jest.fn().mockResolvedValue({ status: "ACTIVE" }) },
    companyMember: {
      findFirst: jest.fn().mockResolvedValueOnce({ id: actorId, isOwner: true })
        .mockResolvedValue({ id: memberId, isOwner: false, roles: [{ role: { name: "VIEWER" } }] }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: memberId }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    permission: { findUnique: jest.fn().mockResolvedValue({ isDeprecated: false,
      companyMemberPermissions: [], rolePermissions: [{ dataScope: "COMPANY" }] }) },
    role: { findFirst: jest.fn().mockResolvedValue({ id: "44444444-4444-4444-8444-444444444444" }) },
    companyMemberRole: { deleteMany: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const db = { $transaction: jest.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)) };
  return { tx, service: new CompanyMembersService(db as never) };
}

describe("company member management", () => {
  it("requires distinct company scoped permissions", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CompanyMembersController)).toEqual([AccessTokenGuard, CompanyPermissionGuard]);
    expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY, CompanyMembersController.prototype.list)).toEqual(["company.member.view"]);
    expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY, CompanyMembersController.prototype.updateRole)).toEqual(["company.member.update", "company.role.manage"]);
    expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY, CompanyMembersController.prototype.remove)).toEqual(["company.member.remove"]);
  });

  it("changes an active tenant member role and audits the write", async () => {
    const { tx, service } = fixture();
    await service.updateRole(companyId, memberId, actorId, { role: "RECRUITER" });
    expect(tx.companyMember.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { id: memberId, companyId, status: "ACTIVE", removedAt: null },
    }));
    expect(tx.companyMemberRole.deleteMany).toHaveBeenCalledWith({ where: { companyId, companyMemberId: memberId } });
    expect(tx.companyMemberRole.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      companyId, companyMemberId: memberId, assignedByUserId: actorId,
    }) });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "company.member.role.update" }) });
  });

  it("protects owners and honors a current direct deny before any write", async () => {
    const owner = fixture();
    owner.tx.companyMember.findFirst.mockResolvedValueOnce({ id: memberId, isOwner: true });
    await expect(owner.service.remove(companyId, memberId, actorId)).rejects.toMatchObject({ status: 403 });
    expect(owner.tx.companyMember.updateMany).not.toHaveBeenCalled();

    const denied = fixture();
    denied.tx.permission.findUnique.mockResolvedValueOnce({ isDeprecated: false,
      companyMemberPermissions: [{ effect: "DENY", dataScope: "COMPANY", expiresAt: null }],
      rolePermissions: [{ dataScope: "COMPANY" }] });
    await expect(denied.service.updateRole(companyId, memberId, actorId, { role: "ADMIN" }))
      .rejects.toMatchObject({ status: 403 });
    expect(denied.tx.companyMemberRole.deleteMany).not.toHaveBeenCalled();
  });

  it("removes membership so subsequent authorization cannot use it", async () => {
    const { tx, service } = fixture();
    await expect(service.remove(companyId, memberId, actorId)).resolves.toEqual({ id: memberId, status: "REMOVED" });
    expect(tx.companyMember.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: memberId, companyId, status: "ACTIVE", removedAt: null },
      data: expect.objectContaining({ status: "REMOVED" }),
    }));
  });
});
