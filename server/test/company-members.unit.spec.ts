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
    role: { findFirst: jest.fn().mockResolvedValue({ id: "44444444-4444-4444-8444-444444444444" }),
      findMany: jest.fn().mockResolvedValue([
        { id: "55555555-5555-4555-8555-555555555555", normalizedName: "owner", isProtected: true },
        { id: "66666666-6666-4666-8666-666666666666", normalizedName: "admin", isProtected: false },
      ]) },
    companyMemberRole: { deleteMany: jest.fn(), create: jest.fn(), createMany: jest.fn() },
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
    expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY, CompanyMembersController.prototype.transferOwnership)).toEqual(["company.ownership.transfer"]);
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

  it("transfers owner flags and protected roles in one transaction", async () => {
    const { tx, service } = fixture();
    await expect(service.transferOwnership(companyId, actorId, memberId)).resolves.toEqual({
      companyId, previousOwnerMemberId: actorId, ownerMemberId: memberId,
    });
    expect(tx.companyMember.updateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({ id: actorId, isOwner: true }), data: { isOwner: false },
    }));
    expect(tx.companyMember.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ id: memberId, isOwner: false }), data: { isOwner: true },
    }));
    expect(tx.companyMemberRole.createMany).toHaveBeenCalledWith({ data: expect.arrayContaining([
      expect.objectContaining({ companyMemberId: actorId, roleId: "66666666-6666-4666-8666-666666666666" }),
      expect.objectContaining({ companyMemberId: memberId, roleId: "55555555-5555-4555-8555-555555555555" }),
    ]) });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "company.ownership.transfer" }) });
  });

  it("does not transfer ownership to the actor or a member of another tenant", async () => {
    const same = fixture();
    await expect(same.service.transferOwnership(companyId, actorId, actorId)).rejects.toMatchObject({ status: 403 });
    expect(same.tx.companyMember.updateMany).not.toHaveBeenCalled();
    const other = fixture();
    other.tx.companyMember.findFirst.mockResolvedValueOnce(null);
    await expect(other.service.transferOwnership(companyId, actorId, memberId)).rejects.toMatchObject({ status: 404 });
    expect(other.tx.companyMember.updateMany).not.toHaveBeenCalled();
  });
});
