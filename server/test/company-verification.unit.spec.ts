import { GUARDS_METADATA } from "@nestjs/common/constants";
import { CompanyProfileLocationsController } from "../src/modules/company/company-profile-locations.controller";
import { CompanyProfileLocationsRepository } from "../src/modules/company/company-profile-locations.repository";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { CompanyPermissionGuard } from "../src/modules/authorization/guards/company-permission.guard";
import { REQUIRED_COMPANY_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-company-permissions.decorator";

const companyId = "33333333-3333-4333-8333-333333333333";
const actorUserId = "11111111-1111-4111-8111-111111111111";

function fixture(verificationStatus: "UNVERIFIED" | "REJECTED" | "PENDING" | "VERIFIED", legalName: string | null = "Real Legal Name", taxCode: string | null = "123456") {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: companyId }]),
    company: {
      findUnique: jest.fn().mockResolvedValue({ status: "ACTIVE" }),
      findUniqueOrThrow: jest.fn().mockResolvedValueOnce({ verificationStatus, legalName, taxCode }).mockResolvedValue({ id: companyId, verificationStatus: "PENDING" }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    companyMember: { findFirst: jest.fn().mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222" }) },
    permission: { findUnique: jest.fn().mockResolvedValue({
      isDeprecated: false, companyMemberPermissions: [], rolePermissions: [{ dataScope: "COMPANY" }],
    }) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const db = { $transaction: jest.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)) };
  return { tx, repo: new CompanyProfileLocationsRepository(db as never) };
}

describe("company verification request", () => {
  it("requires the company permission guard and company.update", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CompanyProfileLocationsController))
      .toEqual([AccessTokenGuard, CompanyPermissionGuard]);
    expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY, CompanyProfileLocationsController.prototype.requestVerification))
      .toEqual(["company.update"]);
  });

  it("persists and audits a complete unverified request atomically", async () => {
    const { tx, repo } = fixture("UNVERIFIED");
    await expect(repo.requestVerification(companyId, actorUserId)).resolves.toMatchObject({ verificationStatus: "PENDING" });
    expect(tx.company.updateMany).toHaveBeenCalledWith({
      where: { id: companyId, verificationStatus: "UNVERIFIED", status: "ACTIVE" },
      data: { verificationStatus: "PENDING", verifiedAt: null },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      actorUserId, companyId, action: "company.verification.request",
    }) }));
  });

  it("rejects incomplete, pending, and unauthorized requests without writes", async () => {
    for (const [status, legalName, expectedStatus] of [
      ["UNVERIFIED", null, 400], ["PENDING", "Real Legal Name", 409],
    ] as const) {
      const { tx, repo } = fixture(status, legalName);
      await expect(repo.requestVerification(companyId, actorUserId)).rejects.toMatchObject({ status: expectedStatus });
      expect(tx.company.updateMany).not.toHaveBeenCalled();
    }
    const { tx, repo } = fixture("UNVERIFIED");
    tx.permission.findUnique.mockResolvedValueOnce({ isDeprecated: false, companyMemberPermissions: [], rolePermissions: [] });
    await expect(repo.requestVerification(companyId, actorUserId)).rejects.toMatchObject({ status: 403 });
    expect(tx.company.updateMany).not.toHaveBeenCalled();
  });
});
