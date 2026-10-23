import { GUARDS_METADATA } from "@nestjs/common/constants";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { CompanyPermissionGuard } from "../src/modules/authorization/guards/company-permission.guard";
import { REQUIRED_COMPANY_PERMISSIONS_KEY } from "../src/modules/authorization/decorators/require-company-permissions.decorator";
import { CompanyController } from "../src/modules/company/company.controller";
import { CompanyProfileLocationsController } from "../src/modules/company/company-profile-locations.controller";
import { CompanyMediaService } from "../src/modules/company/company-media.service";
import { LocalCompanyMediaStorage, mediaTypeForKey, validateCompanyImage } from "../src/modules/company/company-media.storage";
import { CompanyProfileLocationsRepository } from "../src/modules/company/company-profile-locations.repository";

const companyId = "11111111-1111-4111-8111-111111111111";
const otherCompanyId = "22222222-2222-4222-8222-222222222222";
const actorId = "33333333-3333-4333-8333-333333333333";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pX8AAAAASUVORK5CYII=", "base64");

describe("company media", () => {
  it("requires company-wide update permission for mutation and leaves public reads unguarded", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CompanyProfileLocationsController))
      .toEqual([AccessTokenGuard, CompanyPermissionGuard]);
    for (const method of ["uploadMedia", "removeMedia"] as const) {
      expect(Reflect.getMetadata(REQUIRED_COMPANY_PERMISSIONS_KEY,
        CompanyProfileLocationsController.prototype[method])).toEqual(["company.update"]);
    }
    expect(Reflect.getMetadata(GUARDS_METADATA, CompanyController.prototype.getPublicMedia)).toBeUndefined();
  });

  it("accepts bounded image bytes and rejects SVG, MIME mismatch and excessive dimensions", () => {
    expect(validateCompanyImage(png, "image/png", "logo")).toBe("image/png");
    expect(() => validateCompanyImage(png, "image/jpeg", "logo")).toThrow("COMPANY_MEDIA_TYPE_INVALID");
    expect(() => validateCompanyImage(Buffer.from("<svg></svg>"), "image/svg+xml", "logo"))
      .toThrow("COMPANY_MEDIA_TYPE_INVALID");
    const huge = Buffer.from(png);
    huge.writeUInt32BE(8192, 16);
    expect(() => validateCompanyImage(huge, "image/png", "logo")).toThrow("COMPANY_MEDIA_DIMENSIONS_INVALID");
    expect(() => validateCompanyImage(Buffer.alloc(1_048_577), "image/png", "logo"))
      .toThrow("COMPANY_MEDIA_SIZE_INVALID");
  });

  it("stores generated tenant keys, denies foreign keys and removes only matching assets", async () => {
    const root = await mkdtemp(join(tmpdir(), "findwork-company-media-"));
    try {
      const storage = new LocalCompanyMediaStorage({ get: () => root } as never);
      const key = await storage.put(companyId, "logo", "image/png", png);
      expect(mediaTypeForKey(key, companyId, "logo")).toBe("image/png");
      expect(mediaTypeForKey(key, otherCompanyId, "logo")).toBeNull();
      await expect(storage.get(key, otherCompanyId, "logo")).rejects.toThrow("Invalid company media key");
      await storage.remove(key, otherCompanyId, "logo");
      expect(await storage.get(key, companyId, "logo")).toEqual(png);
      await storage.remove(key, companyId, "logo");
      await expect(storage.get(key, companyId, "logo")).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("requires configured storage before removal and never mutates an invalid upload", async () => {
    const repo = { replaceMediaKey: jest.fn(), getPublicMediaKey: jest.fn() };
    const storage = { ready: jest.fn().mockRejectedValue(new Error("unavailable")), put: jest.fn(), remove: jest.fn() };
    const service = new CompanyMediaService(repo as never, storage as never);
    await expect(service.remove(companyId, actorId, "logo")).rejects.toThrow("unavailable");
    await expect(service.upload(companyId, actorId, "logo", { buffer: Buffer.from("bad"), mimetype: "image/png" }))
      .rejects.toMatchObject({ status: 400 });
    expect(repo.replaceMediaKey).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("removes an uncommitted upload if authorization changes before the database transaction", async () => {
    const repo = { replaceMediaKey: jest.fn().mockRejectedValue(new Error("permission revoked")) };
    const storage = { put: jest.fn().mockResolvedValue(`${companyId}/logo/44444444-4444-4444-8444-444444444444.png`),
      remove: jest.fn().mockResolvedValue(undefined) };
    const service = new CompanyMediaService(repo as never, storage as never);
    await expect(service.upload(companyId, actorId, "logo", { buffer: png, mimetype: "image/png" }))
      .rejects.toThrow("permission revoked");
    expect(storage.remove).toHaveBeenCalledWith(expect.any(String), companyId, "logo");
  });

  it("checks current membership and grant inside the audited asset-key transaction", async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: companyId }]),
      company: {
        findUnique: jest.fn().mockResolvedValue({ status: "ACTIVE" }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ logoAssetKey: null, coverAssetKey: null }),
        update: jest.fn().mockResolvedValue({}),
      },
      companyMember: { findFirst: jest.fn().mockResolvedValue({ id: "member" }) },
      permission: { findUnique: jest.fn().mockResolvedValue({
        isDeprecated: false, companyMemberPermissions: [], rolePermissions: [{ dataScope: "COMPANY" }],
      }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const repo = new CompanyProfileLocationsRepository({
      $transaction: jest.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx)),
    } as never);
    const key = `${companyId}/logo/44444444-4444-4444-8444-444444444444.png`;
    await expect(repo.replaceMediaKey(companyId, actorId, "logo", key))
      .resolves.toEqual({ previousKey: null, changed: true });
    expect(tx.company.update).toHaveBeenCalledWith({ where: { id: companyId }, data: { logoAssetKey: key } });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      actorUserId: actorId, companyId, action: "company.media.logo.replace",
      beforeData: { present: false }, afterData: { present: true },
    }) });
    tx.permission.findUnique.mockResolvedValueOnce({ isDeprecated: false, companyMemberPermissions: [], rolePermissions: [] });
    tx.company.update.mockClear();
    await expect(repo.replaceMediaKey(companyId, actorId, "logo", key)).rejects.toMatchObject({ status: 403 });
    expect(tx.company.update).not.toHaveBeenCalled();
  });
});
