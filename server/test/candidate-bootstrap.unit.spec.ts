import "reflect-metadata";
import { BadRequestException, type INestApplication, RequestMethod, ValidationPipe } from "@nestjs/common";
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiExceptionFilter } from "../src/common/exceptions/api-exception.filter";
import { AuthRepository } from "../src/modules/auth/auth.repository";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { TokenService } from "../src/modules/auth/services/token.service";
import { AuthorizationService } from "../src/modules/authorization/authorization.service";
import { CandidateController } from "../src/modules/candidate/candidate.controller";
import { CandidateOnboardingDraftService } from "../src/modules/candidate/candidate-onboarding-draft.service";
import { CandidateOnboardingImportService } from "../src/modules/candidate/candidate-onboarding-import.service";
import { CandidateService } from "../src/modules/candidate/candidate.service";

const validRole = () => ({
  id: "candidate-role", kind: "SYSTEM", isActive: true,
  permissions: [
    { permission: { code: "profile.view" }, dataScope: "OWN" },
    { permission: { code: "profile.update" }, dataScope: "OWN" },
  ],
});

describe("candidate bootstrap business logic", () => {
  const repository = {
    getBootstrapState: jest.fn(),
    findCandidateRole: jest.fn(),
  };
  const authorization = { resolveRequiredSystemPermissions: jest.fn() };
  const service = new CandidateService(repository as never, authorization as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.getBootstrapState.mockResolvedValue({ profileExists: false, draftVersion: null });
    repository.findCandidateRole.mockResolvedValue(validRole());
    authorization.resolveRequiredSystemPermissions.mockResolvedValue({ allowed: false, context: null });
  });

  it("shows an active new account can create without already holding Candidate role", async () => {
    expect(await service.getBootstrap("self")).toEqual({
      profile: { state: "not_created", canCreateProfile: true, canViewProfile: false },
      draft: { state: "missing" },
    });
    expect(repository.getBootstrapState).toHaveBeenCalledWith("self");
    expect(authorization.resolveRequiredSystemPermissions).toHaveBeenCalledWith("self", ["profile.view"]);
  });

  it("reports permission independently when a Candidate role exists before Profile", async () => {
    authorization.resolveRequiredSystemPermissions.mockResolvedValue({ allowed: true, context: { userId: "self" } });
    expect(await service.getBootstrap("self")).toEqual({
      profile: { state: "not_created", canCreateProfile: true, canViewProfile: true },
      draft: { state: "missing" },
    });
  });

  it.each([
    [true, null, true, "exists", "missing"],
    [true, null, false, "exists", "missing"],
    [false, 3, false, "not_created", "exists"],
    [true, 3, true, "exists", "exists"],
    [false, null, false, "not_created", "missing"],
  ])("keeps Profile and Draft independent (profile=%s, draft=%s, view=%s)", async (
    profileExists, draftVersion, canView, profileState, draftState,
  ) => {
    repository.getBootstrapState.mockResolvedValue({ profileExists, draftVersion });
    authorization.resolveRequiredSystemPermissions.mockResolvedValue({
      allowed: canView, context: canView ? { userId: "self" } : null,
    });
    const result = await service.getBootstrap("self");
    expect(result.profile).toEqual({ state: profileState, canCreateProfile: !profileExists, canViewProfile: canView });
    expect(result.draft).toEqual(draftVersion === null ? { state: draftState } : { state: draftState, version: draftVersion });
  });

  it.each([null, { ...validRole(), isActive: false }, { ...validRole(), permissions: [] }])(
    "does not advertise Profile creation when Candidate role configuration is missing or invalid",
    async (role) => {
      repository.findCandidateRole.mockResolvedValue(role);
      expect((await service.getBootstrap("self")).profile.canCreateProfile).toBe(false);
    },
  );

  it("keeps direct view authorization independent of an inactive Candidate role", async () => {
    repository.findCandidateRole.mockResolvedValue({ ...validRole(), isActive: false });
    authorization.resolveRequiredSystemPermissions.mockResolvedValue({ allowed: true, context: { userId: "self" } });
    expect((await service.getBootstrap("self")).profile).toEqual({
      state: "not_created", canCreateProfile: false, canViewProfile: true,
    });
  });

  it("requires the same valid authorization context as PermissionGuard", async () => {
    authorization.resolveRequiredSystemPermissions.mockResolvedValue({ allowed: true, context: null });
    expect((await service.getBootstrap("self")).profile.canViewProfile).toBe(false);
  });

  it("propagates database errors rather than inventing a missing state", async () => {
    repository.getBootstrapState.mockRejectedValue(new Error("DB unavailable"));
    await expect(service.getBootstrap("self")).rejects.toThrow("DB unavailable");
  });
});

describe("GET /api/v1/candidate/bootstrap authentication", () => {
  let app: INestApplication;
  const bootstrap = jest.fn();
  const importOnboarding = jest.fn();
  const verifyAccessToken = jest.fn();
  const findAccessSession = jest.fn();

  it("keeps bootstrap under AccessTokenGuard without profile.view, and preserves existing routes", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CandidateController)).toContain(AccessTokenGuard);
    for (const [name, path, method] of [
      ["bootstrap", "bootstrap", RequestMethod.GET],
      ["createProfile", "profile", RequestMethod.POST],
      ["getProfile", "profile", RequestMethod.GET],
      ["updateProfile", "profile", RequestMethod.PATCH],
      ["loadOnboardingDraft", "onboarding-draft", RequestMethod.GET],
      ["saveOnboardingDraft", "onboarding-draft", RequestMethod.PUT],
    ] as const) {
      expect(Reflect.getMetadata(PATH_METADATA, CandidateController.prototype[name])).toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, CandidateController.prototype[name])).toBe(method);
    }
    expect(Reflect.getMetadata(GUARDS_METADATA, CandidateController.prototype.bootstrap)).toBeUndefined();
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CandidateController],
      providers: [
        AccessTokenGuard,
        { provide: AuthorizationService, useValue: {} },
        { provide: CandidateService, useValue: { getBootstrap: bootstrap } },
        { provide: CandidateOnboardingDraftService, useValue: {} },
        { provide: CandidateOnboardingImportService, useValue: { import: importOnboarding } },
        { provide: TokenService, useValue: { verifyAccessToken } },
        { provide: AuthRepository, useValue: { findAccessSession } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    jest.clearAllMocks();
    verifyAccessToken.mockResolvedValue({ sub: "self", sid: "session" });
    findAccessSession.mockResolvedValue({
      id: "session", userId: "self", revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "self", email: "self@example.test", status: "ACTIVE", emailVerifiedAt: null },
    });
    bootstrap.mockResolvedValue({
      profile: { state: "not_created", canCreateProfile: true, canViewProfile: false }, draft: { state: "missing" },
    });
  });

  it("rejects anonymous and invalid tokens without calling Bootstrap", async () => {
    await request(app.getHttpServer()).get("/api/v1/candidate/bootstrap").expect(401);
    verifyAccessToken.mockRejectedValue(new Error("expired token"));
    await request(app.getHttpServer()).get("/api/v1/candidate/bootstrap").set("Authorization", "Bearer invalid").expect(401);
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it("rejects expired sessions without calling Bootstrap", async () => {
    findAccessSession.mockResolvedValue({
      id: "session", userId: "self", revokedAt: null, expiresAt: new Date(0),
      user: { id: "self", email: "self@example.test", status: "ACTIVE", emailVerifiedAt: null },
    });
    await request(app.getHttpServer()).get("/api/v1/candidate/bootstrap").set("Authorization", "Bearer valid").expect(401);
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it("uses only the authenticated account ID and returns no personal or draft JSON", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/candidate/bootstrap?userId=other")
      .set("Authorization", "Bearer valid").expect(200);
    expect(bootstrap).toHaveBeenCalledWith("self");
    expect(response.body).toEqual({
      profile: { state: "not_created", canCreateProfile: true, canViewProfile: false }, draft: { state: "missing" },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/email|content|other/);
  });

  it("propagates backend failures as HTTP 500", async () => {
    bootstrap.mockRejectedValue(new Error("DB unavailable"));
    await request(app.getHttpServer()).get("/api/v1/candidate/bootstrap").set("Authorization", "Bearer valid").expect(500);
  });

  it("protects import with the access token and uses only the principal account", async () => {
    await request(app.getHttpServer()).post("/api/v1/candidate/profile/import-onboarding").send({ version: 3, confirmPrivacy: true }).expect(401);
    expect(importOnboarding).not.toHaveBeenCalled();
    importOnboarding.mockResolvedValue({ id: "profile", userId: "self" });
    const response = await request(app.getHttpServer())
      .post("/api/v1/candidate/profile/import-onboarding?userId=other")
      .set("Authorization", "Bearer valid")
      .send({ version: 3, confirmPrivacy: true }).expect(201);
    expect(importOnboarding).toHaveBeenCalledWith("self", { version: 3, confirmPrivacy: true });
    expect(response.body).toEqual({ id: "profile", userId: "self" });
    await request(app.getHttpServer())
      .post("/api/v1/candidate/profile/import-onboarding")
      .set("Authorization", "Bearer valid")
      .send({ version: 3, confirmPrivacy: true, confirmOmitUnsupportedAssets: true }).expect(201);
    expect(importOnboarding).toHaveBeenLastCalledWith("self", { version: 3, confirmPrivacy: true, confirmOmitUnsupportedAssets: true });
  });

  it("rejects invalid import requests before calling the importer", async () => {
    await request(app.getHttpServer()).post("/api/v1/candidate/profile/import-onboarding")
      .set("Authorization", "Bearer valid").send({ version: 3, confirmPrivacy: false }).expect(400);
    await request(app.getHttpServer()).post("/api/v1/candidate/profile/import-onboarding")
      .set("Authorization", "Bearer valid").send({ version: 3, confirmPrivacy: true, userId: "other" }).expect(400);
    await request(app.getHttpServer()).post("/api/v1/candidate/profile/import-onboarding")
      .set("Authorization", "Bearer valid").send({ version: 3, confirmPrivacy: true, confirmOmitUnsupportedAssets: "true" }).expect(400);
    expect(importOnboarding).not.toHaveBeenCalled();
  });

  it("returns machine-readable asset groups without leaking asset values", async () => {
    importOnboarding.mockRejectedValue(new BadRequestException({
      code: "CANDIDATE_IMPORT_UNSUPPORTED_ASSETS",
      message: "Confirm omission of unsupported onboarding assets before importing.",
      details: { unsupportedAssets: ["avatar", "resume"] },
    }));
    const response = await request(app.getHttpServer()).post("/api/v1/candidate/profile/import-onboarding")
      .set("Authorization", "Bearer valid").send({ version: 3, confirmPrivacy: true }).expect(400);
    expect(response.body).toMatchObject({ code: "CANDIDATE_IMPORT_UNSUPPORTED_ASSETS", details: { unsupportedAssets: ["avatar", "resume"] } });
    expect(JSON.stringify(response.body)).not.toMatch(/data:image|blob:|private\.pdf/);
  });
});
