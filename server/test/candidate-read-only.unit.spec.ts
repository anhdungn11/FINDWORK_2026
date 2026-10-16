import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AuthRepository } from "../src/modules/auth/auth.repository";
import { AccessTokenGuard } from "../src/modules/auth/guards/access-token.guard";
import { TokenService } from "../src/modules/auth/services/token.service";
import { AuthorizationService } from "../src/modules/authorization/authorization.service";
import { PermissionGuard } from "../src/modules/authorization/guards/permission.guard";
import { CandidateController } from "../src/modules/candidate/candidate.controller";
import { CandidateOnboardingDraftService } from "../src/modules/candidate/candidate-onboarding-draft.service";
import { CandidateOnboardingImportService } from "../src/modules/candidate/candidate-onboarding-import.service";
import { CandidateService } from "../src/modules/candidate/candidate.service";

describe("candidate privacy GET", () => {
  it("returns null without writing when a profile has no privacy row", async () => {
    const repository = {
      findProfileByUserId: jest.fn().mockResolvedValue({ id: "profile" }),
      getPrivacy: jest.fn().mockResolvedValue(null),
      updatePrivacy: jest.fn(),
    };
    const service = new CandidateService(repository as never, {} as never);

    await expect(service.getPrivacy("owner")).resolves.toBeNull();
    expect(repository.findProfileByUserId).toHaveBeenCalledWith("owner");
    expect(repository.getPrivacy).toHaveBeenCalledWith("owner");
    expect(repository.updatePrivacy).not.toHaveBeenCalled();
  });

  it("returns an existing privacy row without writing", async () => {
    const privacy = { candidateProfileId: "profile", searchableProfile: false, allowJobMatching: true };
    const repository = {
      findProfileByUserId: jest.fn().mockResolvedValue({ id: "profile" }),
      getPrivacy: jest.fn().mockResolvedValue(privacy),
      updatePrivacy: jest.fn(),
    };
    const service = new CandidateService(repository as never, {} as never);

    await expect(service.getPrivacy("owner")).resolves.toBe(privacy);
    expect(repository.updatePrivacy).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/candidate/privacy response", () => {
  let app: INestApplication;
  const getPrivacy = jest.fn();
  const resolvePermissions = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CandidateController],
      providers: [
        { provide: CandidateService, useValue: { getPrivacy } },
        { provide: CandidateOnboardingDraftService, useValue: {} },
        { provide: CandidateOnboardingImportService, useValue: {} },
        AccessTokenGuard,
        PermissionGuard,
        { provide: TokenService, useValue: { verifyAccessToken: async () => ({ sub: "owner", sid: "session" }) } },
        { provide: AuthRepository, useValue: { findAccessSession: async () => ({
          id: "session", userId: "owner", revokedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          user: { id: "owner", email: "owner@example.test", status: "ACTIVE", emailVerifiedAt: new Date() },
        }) } },
        { provide: AuthorizationService, useValue: { resolveRequiredSystemPermissions: resolvePermissions } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => app?.close());
  beforeEach(() => {
    jest.clearAllMocks();
    resolvePermissions.mockResolvedValue({ allowed: true, context: { userId: "owner" } });
  });

  it("responds 200 with an empty body when the privacy row is missing", async () => {
    getPrivacy.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .get("/api/v1/candidate/privacy")
      .set("Authorization", "Bearer isolated-test-token")
      .expect(200);

    expect(response.text).toBe("");
    expect(getPrivacy).toHaveBeenCalledWith("owner");
  });

  it("still requires authentication and profile.view permission", async () => {
    await request(app.getHttpServer()).get("/api/v1/candidate/privacy").expect(401);
    resolvePermissions.mockResolvedValue({ allowed: false, context: null });
    await request(app.getHttpServer())
      .get("/api/v1/candidate/privacy")
      .set("Authorization", "Bearer isolated-test-token")
      .expect(403);
    expect(getPrivacy).not.toHaveBeenCalled();
  });

  it("returns an existing privacy row unchanged", async () => {
    const privacy = {
      candidateProfileId: "profile", searchableProfile: false,
      showEmail: false, showPhone: false, allowResumeDownload: false,
      allowJobMatching: true,
    };
    getPrivacy.mockResolvedValue(privacy);

    const response = await request(app.getHttpServer())
      .get("/api/v1/candidate/privacy")
      .set("Authorization", "Bearer isolated-test-token")
      .expect(200);

    expect(response.body).toEqual(privacy);
    expect(getPrivacy).toHaveBeenCalledWith("owner");
  });
});
