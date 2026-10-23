import "reflect-metadata";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { ApiExceptionFilter } from "../src/common/exceptions/api-exception.filter";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { CompanyPermissionGuard } from "../src/modules/authorization/guards/company-permission.guard";
import { CompanyMediaService } from "../src/modules/company/company-media.service";
import { CompanyMediaStorage, LocalCompanyMediaStorage } from "../src/modules/company/company-media.storage";
import { CompanyProfileLocationsController } from "../src/modules/company/company-profile-locations.controller";
import { CompanyProfileLocationsRepository } from "../src/modules/company/company-profile-locations.repository";
import { CompanyProfileLocationsService } from "../src/modules/company/company-profile-locations.service";
import { CompanyController } from "../src/modules/company/company.controller";
import { CompanyService } from "../src/modules/company/company.service";

const companyId = "11111111-1111-4111-8111-111111111111";
const otherCompanyId = "22222222-2222-4222-8222-222222222222";
const locationId = "33333333-3333-4333-8333-333333333333";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pX8AAAAASUVORK5CYII=", "base64");

describe("company media HTTP contract without a database", () => {
  let app: INestApplication;
  let root: string;
  const keys = new Map<string, string>();
  const url = (id: string, kind = "logo") => `/api/v1/companies/${id}/media/${kind}`;
  const profile = {
    getProfile: jest.fn().mockResolvedValue({ id: companyId, name: "Existing Employer" }),
    updateProfile: jest.fn().mockResolvedValue({ id: companyId, name: "Renamed Employer" }),
    listLocations: jest.fn().mockResolvedValue([]),
    createLocation: jest.fn().mockResolvedValue({ id: locationId, isHeadquarters: true }),
    promoteHeadquarters: jest.fn().mockResolvedValue({ id: locationId, isHeadquarters: true }),
  };

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "findwork-media-http-"));
    const repo = {
      getPublicMediaKey: jest.fn(async (id: string, kind: string) => keys.get(`${id}/${kind}`) ?? null),
      replaceMediaKey: jest.fn(async (id: string, _actor: string, kind: string, key: string | null) => {
        const name = `${id}/${kind}`;
        const previousKey = keys.get(name) ?? null;
        if (key) keys.set(name, key); else keys.delete(name);
        return { previousKey, changed: previousKey !== key };
      }),
    };
    const accessGuard = { canActivate: (context: { switchToHttp: () => { getRequest: () => { auth?: unknown } } }) => {
      context.switchToHttp().getRequest().auth = { userId: "owner" };
      return true;
    } };
    const permissionGuard = { canActivate: (context: { switchToHttp: () => { getRequest: () => { params: { companyId: string }; companyAuthorization?: unknown } } }) => {
      const req = context.switchToHttp().getRequest();
      if (req.params.companyId !== companyId) return false;
      req.companyAuthorization = { permissions: {
        "company.view": { scope: "COMPANY" }, "company.update": { scope: "COMPANY" },
      } };
      return true;
    } };
    const moduleRef = await Test.createTestingModule({
      controllers: [CompanyController, CompanyProfileLocationsController],
      providers: [
        CompanyMediaService,
        { provide: CompanyMediaStorage, useValue: new LocalCompanyMediaStorage({ get: () => root } as never) },
        { provide: CompanyProfileLocationsRepository, useValue: repo },
        { provide: CompanyService, useValue: { getPublic: () => ({ id: companyId }) } },
        { provide: CompanyProfileLocationsService, useValue: profile },
      ],
    }).overrideGuard(AccessTokenGuard).useValue(accessGuard)
      .overrideGuard(CompanyPermissionGuard).useValue(permissionGuard).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix("api/v1");
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("uploads, serves fresh bytes after replacement/reload, and removes the image", async () => {
    await request(app.getHttpServer()).get(`/api/v1/companies/${companyId}`).expect(200);
    await request(app.getHttpServer()).get(url(companyId)).expect(404);
    expect((await request(app.getHttpServer()).put(url(companyId))
      .attach("file", png, { filename: "logo.png", contentType: "image/png" }).expect(200)).body)
      .toEqual({ kind: "logo", available: true });
    const first = await request(app.getHttpServer()).get(url(companyId)).expect(200);
    expect(first.headers["content-type"]).toMatch(/^image\/png/);
    expect(first.headers["cache-control"]).toBe("no-store");
    expect(first.body).toEqual(png);
    const originalKey = keys.get(`${companyId}/logo`);
    await request(app.getHttpServer()).put(url(companyId))
      .attach("file", png, { filename: "new-logo.png", contentType: "image/png" }).expect(200);
    expect(keys.get(`${companyId}/logo`)).not.toBe(originalKey);
    // A second GET models a new page load using the same stable URL after replacement.
    expect((await request(app.getHttpServer()).get(url(companyId)).expect(200)).body).toEqual(png);
    expect((await request(app.getHttpServer()).delete(url(companyId)).expect(200)).body)
      .toEqual({ kind: "logo", available: false });
    await request(app.getHttpServer()).get(url(companyId)).expect(404);
  });

  it("rejects malformed media and foreign company mutations", async () => {
    const invalid = await request(app.getHttpServer()).put(url(companyId))
      .attach("file", Buffer.from("<svg></svg>"), { filename: "bad.png", contentType: "image/png" })
      .expect(400);
    expect(invalid.body.code).toBe("COMPANY_MEDIA_TYPE_INVALID");
    const missing = await request(app.getHttpServer()).put(url(companyId)).send({}).expect(400);
    expect(missing.body.code).toBe("COMPANY_MEDIA_FILE_REQUIRED");
    const oversized = await request(app.getHttpServer()).put(url(companyId))
      .attach("file", Buffer.alloc(2_097_153), { filename: "large.png", contentType: "image/png" })
      .expect(413);
    expect(oversized.body.code).toBe("REQUEST_FAILED");
    await request(app.getHttpServer()).put(url(otherCompanyId))
      .attach("file", png, { filename: "logo.png", contentType: "image/png" })
      .expect(403);
    await request(app.getHttpServer()).delete(url(otherCompanyId)).expect(403);
  });

  it("keeps profile, location, and headquarters HTTP routes available", async () => {
    expect((await request(app.getHttpServer()).get(`/api/v1/companies/${companyId}/profile`).expect(200)).body)
      .toEqual({ id: companyId, name: "Existing Employer" });
    expect((await request(app.getHttpServer()).patch(`/api/v1/companies/${companyId}/profile`)
      .send({ name: "Renamed Employer" }).expect(200)).body)
      .toEqual({ id: companyId, name: "Renamed Employer" });
    await request(app.getHttpServer()).get(`/api/v1/companies/${companyId}/locations`).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/companies/${companyId}/locations`)
      .send({ countryCode: "VN", addressLine: "Example" }).expect(201);
    await request(app.getHttpServer()).put(`/api/v1/companies/${companyId}/locations/${locationId}/headquarters`)
      .expect(200);
    expect(profile.promoteHeadquarters).toHaveBeenCalledWith(companyId, locationId, "owner");
  });
});
