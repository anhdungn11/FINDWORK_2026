import "reflect-metadata";
import {
  type INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { ApiExceptionFilter } from "../src/common/exceptions/api-exception.filter";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { PasswordService } from "../src/modules/auth/services/password.service";
import { TokenService } from "../src/modules/auth/services/token.service";
import { assertSafeIntegrationDatabase } from "./integration-safety";

const API = "/api/v1/candidate";
const TEST_PASSWORD = "CandidateIntegration123!";

describe("Candidate integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordService: PasswordService;
  let tokenService: TokenService;
  let passwordHash: string;
  let fixturePrefix: string;
  const ownedUserIds = new Set<string>();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    const configService = app.get(ConfigService);
    app.use(cookieParser());
    app.setGlobalPrefix(configService.getOrThrow<string>("API_PREFIX"));
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    await assertSafeIntegrationDatabase(prisma, configService);
    passwordService = app.get(PasswordService);
    tokenService = app.get(TokenService);
    passwordHash = await passwordService.hash(TEST_PASSWORD);

    await assertCandidateAuthorizationSeed();
  });

  beforeEach(() => {
    fixturePrefix = `phase4.1.candidate.${randomUUID()}.`;
  });

  afterEach(async () => {
    await cleanupTestUsers();
  });

  afterAll(async () => app?.close());

  async function assertCandidateAuthorizationSeed(): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { systemCode: "CANDIDATE" },
      select: {
        kind: true,
        isActive: true,
        permissions: {
          where: {
            permission: {
              code: { in: ["profile.view", "profile.update"] },
            },
          },
          select: {
            dataScope: true,
            permission: { select: { code: true } },
          },
        },
      },
    });

    const scopes = new Map(
      role?.permissions.map((grant) => [
        grant.permission.code,
        grant.dataScope,
      ]) ?? [],
    );

    if (
      !role ||
      role.kind !== "SYSTEM" ||
      !role.isActive ||
      scopes.get("profile.view") !== "OWN" ||
      scopes.get("profile.update") !== "OWN"
    ) {
      throw new Error(
        "Candidate integration tests require the seeded CANDIDATE role with profile.view/profile.update at OWN scope.",
      );
    }
  }

  async function cleanupTestUsers(): Promise<void> {
    const userIds = [...ownedUserIds];
    if (userIds.length === 0) return;

    await prisma.candidateOnboardingDraft.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.candidateProfile.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.systemUserPermission.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.systemUserRole.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.authSession.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    ownedUserIds.clear();
  }

  async function seedAuthenticatedUser(label: string) {
    const normalizedLabel = `${label}.${randomUUID()}`;
    const email = `${fixturePrefix}${normalizedLabel}@findwork.local`;
    const user = await prisma.user.create({
      data: {
        email,
        emailNormalized: email.toLowerCase(),
        passwordHash,
        status: "ACTIVE",
      },
    });
    ownedUserIds.add(user.id);

    const sessionId = randomUUID();
    await prisma.authSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: randomUUID(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const accessToken = await tokenService.signAccessToken(user.id, sessionId);
    return { user, accessToken };
  }

  function createProfile(accessToken: string, fullName = "Candidate Test") {
    return request(app.getHttpServer())
      .post(`${API}/profile`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        fullName,
        careerStatus: "LOOKING_FOR_JOB",
        countryCode: "vn",
      });
  }

  function bootstrap(accessToken: string) {
    return request(app.getHttpServer())
      .get(`${API}/bootstrap`)
      .set("Authorization", `Bearer ${accessToken}`);
  }

  it("GET bootstrap reports a new account without creating Profile, Draft, or role assignment", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("bootstrap-new");
    const before = await Promise.all([
      prisma.candidateProfile.count({ where: { userId: user.id } }),
      prisma.candidateOnboardingDraft.count({ where: { userId: user.id } }),
      prisma.systemUserRole.count({ where: { userId: user.id } }),
    ]);

    const first = await bootstrap(accessToken).expect(200);
    const second = await bootstrap(accessToken).expect(200);
    expect(first.body).toEqual({
      profile: { state: "not_created", canCreateProfile: true, canViewProfile: false },
      draft: { state: "missing" },
    });
    expect(second.body).toEqual(first.body);
    expect(await Promise.all([
      prisma.candidateProfile.count({ where: { userId: user.id } }),
      prisma.candidateOnboardingDraft.count({ where: { userId: user.id } }),
      prisma.systemUserRole.count({ where: { userId: user.id } }),
    ])).toEqual(before);
  });

  it("GET bootstrap reports an existing Profile with Candidate view authorization", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("bootstrap-profile");
    await createProfile(accessToken).expect(201);
    const response = await bootstrap(accessToken).expect(200);
    expect(response.body).toEqual({
      profile: { state: "exists", canCreateProfile: false, canViewProfile: true },
      draft: { state: "missing" },
    });
    expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(1);
  });

  it("GET bootstrap keeps Profile and Draft independent", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("bootstrap-draft");
    await prisma.candidateOnboardingDraft.create({
      data: { userId: user.id, content: {}, stepIndex: 2 },
    });
    expect((await bootstrap(accessToken).expect(200)).body).toEqual({
      profile: { state: "not_created", canCreateProfile: true, canViewProfile: false },
      draft: { state: "exists", version: 1 },
    });

    await createProfile(accessToken).expect(201);
    expect((await bootstrap(accessToken).expect(200)).body).toEqual({
      profile: { state: "exists", canCreateProfile: false, canViewProfile: true },
      draft: { state: "exists", version: 1 },
    });
  });

  it("GET bootstrap does not promise view access for a Profile without a grant", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("bootstrap-no-view");
    await prisma.candidateProfile.create({ data: { userId: user.id, fullName: "Fixture Candidate" } });
    expect((await bootstrap(accessToken).expect(200)).body).toEqual({
      profile: { state: "exists", canCreateProfile: false, canViewProfile: false },
      draft: { state: "missing" },
    });
  });

  it("GET bootstrap rejects invalid tokens and expired fixture sessions", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("bootstrap-expired");
    await request(app.getHttpServer()).get(`${API}/bootstrap`)
      .set("Authorization", "Bearer invalid").expect(401);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.authSession.updateMany({
      where: { userId: user.id },
      data: { createdAt: twoHoursAgo, expiresAt: oneHourAgo },
    });
    await bootstrap(accessToken).expect(401);
  });

  it("GET bootstrap never exposes another account's Profile or Draft", async () => {
    const first = await seedAuthenticatedUser("bootstrap-owner");
    const second = await seedAuthenticatedUser("bootstrap-other");
    await createProfile(first.accessToken).expect(201);
    await prisma.candidateOnboardingDraft.create({
      data: { userId: first.user.id, content: { personal: { fullName: "Private Fixture" } }, stepIndex: 1 },
    });

    const other = await request(app.getHttpServer())
      .get(`${API}/bootstrap?userId=${first.user.id}`)
      .set("Authorization", `Bearer ${second.accessToken}`).expect(200);
    expect(other.body).toEqual({
      profile: { state: "not_created", canCreateProfile: true, canViewProfile: false },
      draft: { state: "missing" },
    });
    expect(JSON.stringify(other.body)).not.toContain("Private Fixture");
    expect((await bootstrap(first.accessToken).expect(200)).body).toEqual({
      profile: { state: "exists", canCreateProfile: false, canViewProfile: true },
      draft: { state: "exists", version: 1 },
    });
  });

  // A real-DB test cannot hide or inactivate the shared CANDIDATE seed row safely.
  it.skip("BLOCKED: GET bootstrap when the shared CANDIDATE role is inactive", () => {});
  it.skip("BLOCKED: GET bootstrap when the shared CANDIDATE role is missing", () => {});

  it("requires authentication to start candidate context", async () => {
    await request(app.getHttpServer())
      .post(`${API}/profile`)
      .send({ fullName: "No Auth" })
      .expect(401);
  });

  it("creates profile, private defaults, and CANDIDATE role atomically", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("bootstrap");

    const created = await createProfile(accessToken, "  Nguyen Candidate  ").expect(201);

    expect(created.body.fullName).toBe("Nguyen Candidate");
    expect(created.body.countryCode).toBe("VN");
    expect(created.body.privacySetting).toEqual(
      expect.objectContaining({
        searchableProfile: false,
        showEmail: false,
        showPhone: false,
        allowResumeDownload: false,
        allowJobMatching: true,
      }),
    );

    const candidateRole = await prisma.role.findUniqueOrThrow({
      where: { systemCode: "CANDIDATE" },
      select: { id: true },
    });
    const assignment = await prisma.systemUserRole.findUnique({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: candidateRole.id,
        },
      },
    });

    expect(assignment).not.toBeNull();
    expect(assignment?.assignedByUserId).toBeNull();

    await request(app.getHttpServer())
      .get(`${API}/profile`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
  });

  it("rejects duplicate candidate profile creation", async () => {
    const { accessToken } = await seedAuthenticatedUser("duplicate");
    await createProfile(accessToken).expect(201);

    const response = await createProfile(accessToken).expect(409);
    expect(response.body.code).toBe("CANDIDATE_PROFILE_ALREADY_EXISTS");
  });

  it("denies candidate reads before candidate permission bootstrap", async () => {
    const { accessToken } = await seedAuthenticatedUser("permission");

    const response = await request(app.getHttpServer())
      .get(`${API}/profile`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(403);

    expect(response.body.code).toBe("AUTHORIZATION_FORBIDDEN");
  });

  it("enforces GPA value/scale pairing", async () => {
    const { accessToken } = await seedAuthenticatedUser("gpa");
    await createProfile(accessToken).expect(201);

    const response = await request(app.getHttpServer())
      .post(`${API}/education`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        school: "Test University",
        degree: "Bachelor",
        major: "Information Technology",
        startMonth: 9,
        startYear: 2024,
        gpa: 3.2,
      })
      .expect(400);

    expect(response.body.code).toBe("CANDIDATE_GPA_INVALID");
  });

  it("prevents cross-candidate education updates", async () => {
    const first = await seedAuthenticatedUser("owner-a");
    const second = await seedAuthenticatedUser("owner-b");
    await createProfile(first.accessToken, "Owner A").expect(201);
    await createProfile(second.accessToken, "Owner B").expect(201);

    const education = await request(app.getHttpServer())
      .post(`${API}/education`)
      .set("Authorization", `Bearer ${first.accessToken}`)
      .send({
        school: "Private University",
        degree: "Bachelor",
        major: "Computer Science",
        startMonth: 1,
        startYear: 2024,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`${API}/education/${education.body.id}`)
      .set("Authorization", `Bearer ${second.accessToken}`)
      .send({ school: "Stolen Update" })
      .expect(404);

    expect(response.body.code).toBe("CANDIDATE_EDUCATION_NOT_FOUND");
  });

  it("enforces exactly one skill source", async () => {
    const { accessToken } = await seedAuthenticatedUser("skill-xor");
    await createProfile(accessToken).expect(201);

    const response = await request(app.getHttpServer())
      .post(`${API}/skills`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        customSkillName: "   ",
        level: "INTERMEDIATE",
      })
      .expect(400);

    expect(response.body.code).toBe("CANDIDATE_SKILL_SOURCE_INVALID");
  });

  it("keeps the profile private by default and allows explicit privacy updates", async () => {
    const { accessToken } = await seedAuthenticatedUser("privacy");
    await createProfile(accessToken).expect(201);

    const initial = await request(app.getHttpServer())
      .get(`${API}/privacy`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(initial.body.searchableProfile).toBe(false);

    const updated = await request(app.getHttpServer())
      .patch(`${API}/privacy`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ searchableProfile: true, showPhone: true })
      .expect(200);

    expect(updated.body.searchableProfile).toBe(true);
    expect(updated.body.showPhone).toBe(true);
  });

  it("rejects null for non-nullable PATCH fields", async () => {
    const { accessToken } = await seedAuthenticatedUser("null-patch");
    await createProfile(accessToken).expect(201);

    await request(app.getHttpServer())
      .patch(`${API}/profile`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ fullName: null })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`${API}/privacy`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ searchableProfile: null })
      .expect(400);

    const skill = await request(app.getHttpServer())
      .post(`${API}/skills`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        customSkillName: "TypeScript",
        level: "INTERMEDIATE",
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`${API}/skills/${skill.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ level: null })
      .expect(400);
  });

  it("atomically replaces career preference child collections", async () => {
    const { accessToken } = await seedAuthenticatedUser("preference");
    await createProfile(accessToken).expect(201);

    const first = await request(app.getHttpServer())
      .put(`${API}/career-preference`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        locationMode: "SELECTED",
        salaryType: "NEGOTIABLE",
        desiredPositions: ["Backend Developer", "Software Engineer"],
        preferredEmploymentTypes: ["FULL_TIME"],
        preferredWorkplaceTypes: ["HYBRID"],
      })
      .expect(200);

    expect(first.body.desiredPositions).toHaveLength(2);

    const second = await request(app.getHttpServer())
      .put(`${API}/career-preference`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        locationMode: "NATIONWIDE",
        salaryType: "NOT_IMPORTANT",
        desiredPositions: ["Platform Engineer"],
        preferredEmploymentTypes: [],
        preferredWorkplaceTypes: ["REMOTE"],
      })
      .expect(200);

    expect(second.body.desiredPositions).toHaveLength(1);
    expect(second.body.desiredPositions[0].title).toBe("Platform Engineer");
    expect(second.body.preferredEmploymentTypes).toHaveLength(0);
    expect(second.body.preferredLocations).toHaveLength(0);
  });

  it("prevents changing a language source while certificates still depend on it", async () => {
    const { accessToken } = await seedAuthenticatedUser("language-certificate");
    await createProfile(accessToken).expect(201);

    const language = await request(app.getHttpServer())
      .post(`${API}/languages`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        customLanguageName: "Esperanto",
        overallLevel: "BASIC",
        listeningLevel: "BASIC",
        speakingLevel: "BASIC",
        readingLevel: "BASIC",
        writingLevel: "BASIC",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${API}/languages/${language.body.id}/certificates`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        customCertificateName: "Esperanto Certificate",
        issuedDate: "2026-01-01",
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`${API}/languages/${language.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ customLanguageName: "Interlingua" })
      .expect(409);

    expect(response.body.code).toBe("CANDIDATE_LANGUAGE_HAS_CERTIFICATES");
  });

  function importDraftContent(email: string) {
    return {
      personal: { fullName: "Import Fixture", email, phone: "", dateOfBirth: "", gender: "", countryCode: "VN", provinceCode: "", wardCode: "", addressLine: "", bio: "", avatarUrl: "" },
      education: [], experience: [], skills: [], languages: [],
      preferences: { desiredPositions: ["Engineer"], preferredCategoryCodes: [], locationPreference: { mode: "selected", provinceCodes: [] }, employmentTypes: [], workplaceTypes: [], salaryExpectation: { type: "range", min: null, max: null, currency: "VND", period: "month" }, desiredCareerLevel: "", availability: { type: "", availableFrom: "" }, willingToRelocate: false },
      resume: { resumeName: "", resumeUrl: "", fileName: "", fileSize: null, mimeType: "", hasExistingResume: false, createLater: true },
      privacy: { searchableProfile: false, showEmail: false, showPhone: false, allowResumeDownload: false, allowJobMatching: true },
    };
  }

  function importDraft(accessToken: string, version = 1, confirmOmitUnsupportedAssets?: boolean) {
    return request(app.getHttpServer()).post(`${API}/profile/import-onboarding`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ version, confirmPrivacy: true, ...(confirmOmitUnsupportedAssets === undefined ? {} : { confirmOmitUnsupportedAssets }) });
  }

  it("imports an owned draft atomically with private defaults and retains the draft", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("import-success");
    await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content: importDraftContent(user.email), stepIndex: 0 } });
    const result = await importDraft(accessToken).expect(201);
    expect(result.body).toMatchObject({ userId: user.id, fullName: "Import Fixture", privacySetting: { searchableProfile: false, showEmail: false, showPhone: false, allowResumeDownload: false, allowJobMatching: true } });
    expect(result.body.careerPreference.desiredPositions).toEqual(expect.arrayContaining([expect.objectContaining({ title: "Engineer" })]));
    expect(await prisma.candidateOnboardingDraft.count({ where: { userId: user.id, version: 1 } })).toBe(1);
    expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(1);
    await importDraft(accessToken).expect(409);
  });

  it("imports changed draft privacy but stores only backend defaults and retains draft choices", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("import-privacy-diff");
    const content = importDraftContent(user.email);
    content.privacy = { searchableProfile: true, showEmail: true, showPhone: true, allowResumeDownload: true, allowJobMatching: false };
    await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });
    await importDraft(accessToken).expect(201);
    expect(await prisma.candidatePrivacySetting.findFirst({ where: { candidateProfile: { userId: user.id } } })).toMatchObject({ searchableProfile: false, showEmail: false, showPhone: false, allowResumeDownload: false, allowJobMatching: true });
    expect((await prisma.candidateOnboardingDraft.findUniqueOrThrow({ where: { userId: user.id } })).content).toEqual(content);
  });

  it.each([
    ["avatar", (content: ReturnType<typeof importDraftContent>) => { content.personal.avatarUrl = "blob:sensitive-avatar"; }, ["avatar"]],
    ["resume", (content: ReturnType<typeof importDraftContent>) => { content.resume.fileName = "private-cv.pdf"; content.resume.fileSize = 100 as never; }, ["resume"]],
    ["both", (content: ReturnType<typeof importDraftContent>) => { content.personal.avatarUrl = "blob:sensitive-avatar"; content.resume.resumeUrl = "https://private.example.test/cv"; }, ["avatar", "resume"]],
  ])("rejects unsupported %s without confirmation and creates no candidate rows", async (label, mutate, groups) => {
    const { user, accessToken } = await seedAuthenticatedUser(`import-asset-${label}`);
    const content = importDraftContent(user.email); mutate(content);
    await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });
    const response = await importDraft(accessToken).expect(400);
    expect(response.body.code).toBe("CANDIDATE_IMPORT_UNSUPPORTED_ASSETS");
    expect(response.body.details).toEqual({ unsupportedAssets: groups });
    expect(JSON.stringify(response.body)).not.toMatch(/sensitive-avatar|private-cv\.pdf|private\.example/);
    expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.systemUserRole.count({ where: { userId: user.id } })).toBe(0);
    expect((await prisma.candidateOnboardingDraft.findUniqueOrThrow({ where: { userId: user.id } })).content).toEqual(content);
  });

  it("omits only confirmed unsupported assets while importing supported fields", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("import-asset-confirmed");
    const content = importDraftContent(user.email);
    content.personal.avatarUrl = "blob:sensitive-avatar";
    content.resume.fileName = "private-cv.pdf";
    content.privacy.showEmail = true;
    await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });
    const response = await importDraft(accessToken, 1, true).expect(201);
    expect(response.body).toMatchObject({ fullName: "Import Fixture", avatarAssetKey: null, privacySetting: { searchableProfile: false, showEmail: false, showPhone: false, allowResumeDownload: false, allowJobMatching: true } });
    expect(await prisma.resume.count({ where: { candidateProfile: { userId: user.id } } })).toBe(0);
    expect((await prisma.candidateOnboardingDraft.findUniqueOrThrow({ where: { userId: user.id } })).content).toEqual(content);
  });

  it("rejects missing, stale, foreign and invalid drafts without creating a profile", async () => {
    const owner = await seedAuthenticatedUser("import-owner");
    const other = await seedAuthenticatedUser("import-other");
    await importDraft(owner.accessToken).expect(404);
    await prisma.candidateOnboardingDraft.create({ data: { userId: owner.user.id, content: importDraftContent(owner.user.email), stepIndex: 6 } });
    await importDraft(owner.accessToken, 2).expect(409);
    await importDraft(other.accessToken).expect(404);
    await request(app.getHttpServer()).post(`${API}/profile/import-onboarding?userId=${owner.user.id}`)
      .set("Authorization", `Bearer ${other.accessToken}`).send({ version: 1, confirmPrivacy: true }).expect(404);
    await request(app.getHttpServer()).post(`${API}/profile/import-onboarding`)
      .set("Authorization", `Bearer ${owner.accessToken}`).send({ version: 1, confirmPrivacy: false }).expect(400);
    expect(await prisma.candidateProfile.count({ where: { userId: { in: [owner.user.id, other.user.id] } } })).toBe(0);
  });

  it("classifies an unknown or unloaded reference and leaves every owned table unchanged", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("import-reference");
    const content = importDraftContent(user.email);
    content.personal.provinceCode = "INVALID";
    await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });
    const catalogLoaded = (await prisma.province.count()) > 0;
    const response = await importDraft(accessToken).expect(catalogLoaded ? 400 : 503);
    expect(response.body.code).toBe(catalogLoaded ? "CANDIDATE_REFERENCE_INVALID" : "CANDIDATE_REFERENCE_CATALOG_UNAVAILABLE");
    expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.systemUserRole.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.candidateOnboardingDraft.count({ where: { userId: user.id } })).toBe(1);
  });

  it("permits only one concurrent import for the same account", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("import-race");
    await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content: importDraftContent(user.email), stepIndex: 6 } });
    const responses = await Promise.all([importDraft(accessToken), importDraft(accessToken)]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(1);
  });
});
