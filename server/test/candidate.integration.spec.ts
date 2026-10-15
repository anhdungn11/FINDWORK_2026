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
import type { Prisma } from "../src/generated/prisma/client";
import { CandidateOnboardingImportService } from "../src/modules/candidate/candidate-onboarding-import.service";
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
  const ownedJobCategoryIds = new Set<string>();

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
    for (const id of ownedJobCategoryIds) {
      await prisma.jobCategory.delete({ where: { id } });
      ownedJobCategoryIds.delete(id);
    }
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

  describe("Candidate import PostgreSQL", () => {
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

  function customImportSkill(name: string, id = "custom-skill") {
    return { id, skillCode: "other", customSkillName: name, level: "advanced", yearsOfExperience: "1.5", isHighlighted: true };
  }

  function importLanguage(code: string, customName = "", id = "custom-language") {
    return { id, languageCode: code, customLanguageName: customName, overallLevel: "basic", listeningLevel: "basic", speakingLevel: "basic", readingLevel: "basic", writingLevel: "basic", certificates: [] };
  }

  describe("custom import acceptance", () => {
    it("persists a custom skill with null FK and no new master skill", async () => {
      const { user, accessToken } = await seedAuthenticatedUser("custom-skill");
      const content = importDraftContent(user.email);
      content.skills = [customImportSkill("Kỹ năng chuyên ngành")] as never;
      const masterCount = await prisma.skill.count();
      await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });

      const response = await importDraft(accessToken).expect(201);
      const saved = await prisma.candidateSkill.findFirstOrThrow({ where: { candidateProfile: { userId: user.id } } });
      expect(response.body.userId).toBe(user.id);
      expect(saved).toMatchObject({ candidateProfileId: response.body.id, skillId: null, customSkillName: "Kỹ năng chuyên ngành" });
      expect(await prisma.skill.count()).toBe(masterCount);
      expect(await prisma.candidatePrivacySetting.findFirst({ where: { candidateProfileId: response.body.id } })).toMatchObject({ searchableProfile: false, showEmail: false, showPhone: false, allowResumeDownload: false, allowJobMatching: true });
      const role = await prisma.role.findUniqueOrThrow({ where: { systemCode: "CANDIDATE" }, select: { id: true } });
      expect(await prisma.systemUserRole.count({ where: { userId: user.id, roleId: role.id } })).toBe(1);
      expect((await prisma.candidateOnboardingDraft.findUniqueOrThrow({ where: { userId: user.id } })).content).toEqual(content);
      await importDraft(accessToken).expect(409);
      expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(1);
    });

    it("persists a custom language with null FK and no new master language", async () => {
      const { user, accessToken } = await seedAuthenticatedUser("custom-language");
      const content = importDraftContent(user.email);
      content.languages = [importLanguage("other", "Ngoại ngữ riêng")] as never;
      const masterCount = await prisma.language.count();
      await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });

      const response = await importDraft(accessToken).expect(201);
      const saved = await prisma.candidateLanguage.findFirstOrThrow({ where: { candidateProfile: { userId: user.id } } });
      expect(saved).toMatchObject({ candidateProfileId: response.body.id, languageId: null, customLanguageName: "Ngoại ngữ riêng" });
      expect(await prisma.language.count()).toBe(masterCount);
      expect((await prisma.candidateOnboardingDraft.findUniqueOrThrow({ where: { userId: user.id } })).content).toEqual(content);
    });

    it("imports custom rows alongside active language and job category references", async () => {
      const activeLanguage = await prisma.language.findFirst({ where: { isActive: true }, select: { id: true, code: true } });
      const activeCategory = await prisma.jobCategory.findFirst({ where: { isActive: true }, select: { id: true, code: true } });
      if (!activeLanguage || !activeCategory) throw new Error("Custom import acceptance requires existing active Language and JobCategory references.");
      const { user, accessToken } = await seedAuthenticatedUser("custom-mixed");
      const content = importDraftContent(user.email);
      content.skills = [customImportSkill("Kỹ năng chuyên ngành")] as never;
      content.languages = [importLanguage("other", "Ngoại ngữ riêng"), importLanguage(activeLanguage.code, "", "catalog-language")] as never;
      content.preferences.preferredCategoryCodes = [activeCategory.code] as never;
      await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });

      await importDraft(accessToken).expect(201);
      expect(await prisma.candidateSkill.findMany({ where: { candidateProfile: { userId: user.id } }, select: { skillId: true, customSkillName: true } })).toEqual([{ skillId: null, customSkillName: "Kỹ năng chuyên ngành" }]);
      expect(await prisma.candidateLanguage.findMany({ where: { candidateProfile: { userId: user.id } }, select: { languageId: true, customLanguageName: true } })).toEqual(expect.arrayContaining([
        { languageId: null, customLanguageName: "Ngoại ngữ riêng" },
        { languageId: activeLanguage.id, customLanguageName: null },
      ]));
      expect(await prisma.candidateLanguage.count({ where: { candidateProfile: { userId: user.id } } })).toBe(2);
      expect(await prisma.candidatePreferredCategory.count({ where: { careerPreference: { candidateProfile: { userId: user.id } }, jobCategoryId: activeCategory.id } })).toBe(1);
    });

    it.each([
      ["empty custom skill", (content: ReturnType<typeof importDraftContent>) => { content.skills = [customImportSkill("   ")] as never; }, "CANDIDATE_SKILL_SOURCE_INVALID"],
      ["conflicting skill source", (content: ReturnType<typeof importDraftContent>) => { content.skills = [{ ...customImportSkill("Conflicting"), skillCode: "catalog-code" }] as never; }, "CANDIDATE_SKILL_SOURCE_INVALID"],
      ["duplicate custom skills", (content: ReturnType<typeof importDraftContent>) => { content.skills = [customImportSkill("Craft"), customImportSkill("craft", "second")] as never; }, "CANDIDATE_SKILL_DUPLICATE"],
      ["empty custom language", (content: ReturnType<typeof importDraftContent>) => { content.languages = [importLanguage("other", "")] as never; }, "CANDIDATE_LANGUAGE_SOURCE_INVALID"],
      ["conflicting language source", (content: ReturnType<typeof importDraftContent>) => { content.languages = [importLanguage("en", "Conflicting")] as never; }, "CANDIDATE_LANGUAGE_SOURCE_INVALID"],
      ["duplicate custom languages", (content: ReturnType<typeof importDraftContent>) => { content.languages = [importLanguage("other", "Tongue"), importLanguage("other", "tongue", "second")] as never; }, "CANDIDATE_LANGUAGE_DUPLICATE"],
      ["unknown language code", (content: ReturnType<typeof importDraftContent>) => { content.languages = [importLanguage("zz-invalid")] as never; }, "CANDIDATE_REFERENCE_INVALID"],
      ["missing skill source", (content: ReturnType<typeof importDraftContent>) => { content.skills = [{ ...customImportSkill(""), skillCode: "" }] as never; }, "CANDIDATE_SKILL_SOURCE_INVALID"],
      ["malformed custom name", (content: ReturnType<typeof importDraftContent>) => { content.skills = [{ ...customImportSkill("Valid"), customSkillName: 42 }] as never; }, "CANDIDATE_ONBOARDING_INVALID"],
    ])("rejects %s before any profile write", async (label, mutate, code) => {
      const { user, accessToken } = await seedAuthenticatedUser(`invalid-${label.replace(/ /g, "-")}`);
      const content = importDraftContent(user.email);
      mutate(content);
      await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });
      const response = await importDraft(accessToken).expect(400);
      expect(response.body.code).toBe(code);
      expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(0);
      expect(await prisma.systemUserRole.count({ where: { userId: user.id } })).toBe(0);
      expect((await prisma.candidateOnboardingDraft.findUniqueOrThrow({ where: { userId: user.id } })).content).toEqual(content);
    });

    it("keeps a custom draft private to its authenticated owner", async () => {
      const owner = await seedAuthenticatedUser("custom-auth-owner");
      const other = await seedAuthenticatedUser("custom-auth-other");
      const content = importDraftContent(owner.user.email);
      content.skills = [customImportSkill("Private Custom Skill")] as never;
      await prisma.candidateOnboardingDraft.create({ data: { userId: owner.user.id, content, stepIndex: 6 } });
      await request(app.getHttpServer()).post(`${API}/profile/import-onboarding`).send({ version: 1, confirmPrivacy: true }).expect(401);
      await importDraft(other.accessToken).expect(404);
      expect(await prisma.candidateProfile.count({ where: { userId: { in: [owner.user.id, other.user.id] } } })).toBe(0);
      await importDraft(owner.accessToken).expect(201);
      expect(await prisma.candidateProfile.count({ where: { userId: owner.user.id } })).toBe(1);
      expect(await prisma.candidateProfile.count({ where: { userId: other.user.id } })).toBe(0);
    });

    it("rolls back custom skill and language rows after a database write-path failure", async () => {
      const { user } = await seedAuthenticatedUser("custom-rollback");
      const content = importDraftContent(user.email);
      content.skills = [customImportSkill("Rollback Skill")] as never;
      content.languages = [importLanguage("other", "Rollback Language")] as never;
      await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });
      const observed = { profile: 0, skill: 0, language: 0 };
      const faultingPrisma = {
        $transaction: (work: (tx: Prisma.TransactionClient) => Promise<unknown>, options: { isolationLevel: Prisma.TransactionIsolationLevel; timeout: number }) =>
          prisma.$transaction(async (tx) => {
            const faultingTx = new Proxy(tx, {
              get(target, property, receiver) {
                if (property === "candidateLanguage") return {
                  create: async (args: Parameters<typeof target.candidateLanguage.create>[0]) => {
                    await target.candidateLanguage.create(args);
                    observed.profile = await target.candidateProfile.count({ where: { userId: user.id } });
                    observed.skill = await target.candidateSkill.count({ where: { candidateProfile: { userId: user.id } } });
                    observed.language = await target.candidateLanguage.count({ where: { candidateProfile: { userId: user.id } } });
                    throw new Error("CP8A_CUSTOM_INJECTED_AFTER_DATABASE_WRITES");
                  },
                };
                return Reflect.get(target, property, receiver);
              },
            });
            return work(faultingTx);
          }, options),
      };
      await expect(new CandidateOnboardingImportService(faultingPrisma as never).import(user.id, { version: 1, confirmPrivacy: true }))
        .rejects.toThrow("CP8A_CUSTOM_INJECTED_AFTER_DATABASE_WRITES");
      expect(observed).toEqual({ profile: 1, skill: 1, language: 1 });
      expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(0);
      expect(await prisma.candidateSkill.count({ where: { candidateProfile: { userId: user.id } } })).toBe(0);
      expect(await prisma.candidateLanguage.count({ where: { candidateProfile: { userId: user.id } } })).toBe(0);
      expect(await prisma.systemUserRole.count({ where: { userId: user.id } })).toBe(0);
      expect((await prisma.candidateOnboardingDraft.findUniqueOrThrow({ where: { userId: user.id } })).content).toEqual(content);
    });
  });

  it("imports an owned draft atomically with private defaults and retains the draft", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("import-success");
    const content = importDraftContent(user.email);
    content.education = [{ id: "education-local", school: "Test University", degree: "Bachelor", major: "Engineering", location: "", startMonth: "1", startYear: "2020", endMonth: "12", endYear: "2024", isStudying: false, gpa: "3.5", gpaScale: "4", achievements: "", description: "" }] as never;
    content.experience = [{ id: "experience-local", company: "Test Company", position: "Engineer", employmentType: "full-time", workplaceType: "remote", location: "", startMonth: "1", startYear: "2025", endMonth: "", endYear: "", isCurrent: true, description: "", achievements: "", skillsUsed: ["Private Fixture Skill"] }] as never;
    content.skills = [{ id: "skill-local", skillCode: "other", customSkillName: "Private Fixture Skill", level: "advanced", yearsOfExperience: "1.5", isHighlighted: true }] as never;
    content.languages = [{ id: "language-local", languageCode: "other", customLanguageName: "Private Fixture Language", overallLevel: "basic", listeningLevel: "basic", speakingLevel: "basic", readingLevel: "basic", writingLevel: "basic", certificates: [{ id: "certificate-local", certificateTypeCode: "", customCertificateName: "Private Fixture Certificate", level: "", overallScore: "", scores: [], issuedDate: "", expiryDate: "", issuer: "", credentialId: "", verificationUrl: "" }] }] as never;
    await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 0 } });
    const result = await importDraft(accessToken).expect(201);
    expect(result.body).toMatchObject({ userId: user.id, fullName: "Import Fixture", privacySetting: { searchableProfile: false, showEmail: false, showPhone: false, allowResumeDownload: false, allowJobMatching: true } });
    expect(result.body.careerPreference.desiredPositions).toEqual(expect.arrayContaining([expect.objectContaining({ title: "Engineer" })]));
    expect(result.body.education).toHaveLength(1);
    expect(result.body.experience).toHaveLength(1);
    expect(result.body.experience[0].skills).toHaveLength(1);
    expect(result.body.skills).toHaveLength(1);
    expect(result.body.languages).toHaveLength(1);
    expect(result.body.skills[0]).toMatchObject({ skillId: null, customSkillName: "Private Fixture Skill" });
    expect(result.body.languages[0]).toMatchObject({ languageId: null, customLanguageName: "Private Fixture Language" });
    expect(result.body.languages[0].certificates).toHaveLength(1);
    expect(await prisma.candidateOnboardingDraft.count({ where: { userId: user.id, version: 1 } })).toBe(1);
    expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(1);
    const role = await prisma.role.findUniqueOrThrow({ where: { systemCode: "CANDIDATE" }, select: { id: true } });
    expect(await prisma.systemUserRole.count({ where: { userId: user.id, roleId: role.id } })).toBe(1);
    expect(await prisma.candidatePrivacySetting.count({ where: { candidateProfile: { userId: user.id } } })).toBe(1);
    await importDraft(accessToken).expect(409);
    const childCounts = await Promise.all([
      prisma.candidateEducation.count({ where: { candidateProfile: { userId: user.id } } }),
      prisma.candidateExperience.count({ where: { candidateProfile: { userId: user.id } } }),
      prisma.candidateExperienceSkill.count({ where: { experience: { candidateProfile: { userId: user.id } } } }),
      prisma.candidateSkill.count({ where: { candidateProfile: { userId: user.id } } }),
      prisma.candidateLanguage.count({ where: { candidateProfile: { userId: user.id } } }),
      prisma.candidateLanguageCertificate.count({ where: { candidateLanguage: { candidateProfile: { userId: user.id } } } }),
      prisma.candidateCareerPreference.count({ where: { candidateProfile: { userId: user.id } } }),
      prisma.candidateDesiredPosition.count({ where: { careerPreference: { candidateProfile: { userId: user.id } } } }),
    ]);
    expect(childCounts).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
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

  it("rejects invalid non-asset profile data even after asset omission consent", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("import-invalid-with-consent");
    const content = importDraftContent(user.email);
    content.personal.avatarUrl = "blob:sensitive-avatar";
    content.personal.fullName = "";
    await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });
    const response = await importDraft(accessToken, 1, true).expect(400);
    expect(response.body.code).toBe("CANDIDATE_ONBOARDING_INVALID");
    expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(0);
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

  it("requires a valid access token and never exposes another account's import draft", async () => {
    const owner = await seedAuthenticatedUser("import-auth-owner");
    const other = await seedAuthenticatedUser("import-auth-other");
    const content = importDraftContent(owner.user.email);
    content.personal.fullName = "Private Owner Fixture";
    await prisma.candidateOnboardingDraft.create({ data: { userId: owner.user.id, content, stepIndex: 6 } });
    await request(app.getHttpServer()).post(`${API}/profile/import-onboarding`).send({ version: 1, confirmPrivacy: true }).expect(401);
    await request(app.getHttpServer()).post(`${API}/profile/import-onboarding`)
      .set("Authorization", "Bearer invalid").send({ version: 1, confirmPrivacy: true }).expect(401);
    const foreign = await request(app.getHttpServer()).post(`${API}/profile/import-onboarding?userId=${owner.user.id}`)
      .set("Authorization", `Bearer ${other.accessToken}`).send({ version: 1, confirmPrivacy: true }).expect(404);
    expect(JSON.stringify(foreign.body)).not.toMatch(/Private Owner Fixture|import-auth-owner/);
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

  it("imports an existing active job category code as its database UUID", async () => {
    const active = await prisma.jobCategory.findFirst({ where: { isActive: true }, select: { id: true, code: true } });
    if (!active) throw new Error("Candidate import requires one existing active JobCategory for reference verification.");
    const { user, accessToken } = await seedAuthenticatedUser("import-active-reference");
    const content = importDraftContent(user.email);
    (content.preferences.preferredCategoryCodes as string[]) = [active.code];
    await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });
    const response = await importDraft(accessToken).expect(201);
    expect(response.body.careerPreference.preferredCategories).toEqual(expect.arrayContaining([expect.objectContaining({ jobCategoryId: active.id })]));
    expect(await prisma.candidatePreferredCategory.count({ where: { careerPreference: { candidateProfile: { userId: user.id } }, jobCategoryId: active.id } })).toBe(1);
  });

  it("rejects an unknown code in a populated catalog without a partial import", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("import-unknown-reference");
    const content = importDraftContent(user.email);
    (content.preferences.preferredCategoryCodes as string[]) = [`missing-${randomUUID()}`];
    await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });
    const response = await importDraft(accessToken).expect(400);
    expect(response.body.code).toBe("CANDIDATE_REFERENCE_INVALID");
    expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.candidateOnboardingDraft.count({ where: { userId: user.id } })).toBe(1);
  });

  it("rejects a uniquely owned inactive category fixture and cleans it by ID", async () => {
    const inactive = await prisma.jobCategory.create({ data: { code: `cp8a-inactive-${randomUUID()}`, name: "CP8A inactive test fixture", isActive: false } });
    ownedJobCategoryIds.add(inactive.id);
    const { user, accessToken } = await seedAuthenticatedUser("import-inactive-reference");
    const content = importDraftContent(user.email);
    (content.preferences.preferredCategoryCodes as string[]) = [inactive.code];
    await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });
    const response = await importDraft(accessToken).expect(400);
    expect(response.body.code).toBe("CANDIDATE_REFERENCE_INVALID");
    expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(0);
  });

  it("rolls back actual profile, privacy, role and education writes after an injected transaction fault", async () => {
    const { user } = await seedAuthenticatedUser("import-rollback");
    const content = importDraftContent(user.email);
    content.education = [{ id: "education-rollback", school: "Rollback Fixture School", degree: "Bachelor", major: "Engineering", location: "", startMonth: "1", startYear: "2020", endMonth: "", endYear: "", isStudying: true, gpa: "", gpaScale: "", achievements: "", description: "" }] as never;
    await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content, stepIndex: 6 } });
    const observed = { profile: 0, privacy: 0, role: 0, education: 0 };
    const faultingPrisma = {
      $transaction: (work: (tx: Prisma.TransactionClient) => Promise<unknown>, options: { isolationLevel: Prisma.TransactionIsolationLevel; timeout: number }) =>
        prisma.$transaction(async (tx) => {
          const faultingTx = new Proxy(tx, {
            get(target, property, receiver) {
              if (property === "candidateEducation") return {
                create: async (args: Parameters<typeof target.candidateEducation.create>[0]) => {
                  await target.candidateEducation.create(args);
                  observed.profile = await target.candidateProfile.count({ where: { userId: user.id } });
                  observed.privacy = await target.candidatePrivacySetting.count({ where: { candidateProfile: { userId: user.id } } });
                  observed.role = await target.systemUserRole.count({ where: { userId: user.id } });
                  observed.education = await target.candidateEducation.count({ where: { candidateProfile: { userId: user.id } } });
                  throw new Error("CP8A_INJECTED_AFTER_DATABASE_WRITES");
                },
              };
              return Reflect.get(target, property, receiver);
            },
          });
          return work(faultingTx);
        }, options),
    };
    await expect(new CandidateOnboardingImportService(faultingPrisma as never).import(user.id, { version: 1, confirmPrivacy: true }))
      .rejects.toThrow("CP8A_INJECTED_AFTER_DATABASE_WRITES");
    expect(observed).toEqual({ profile: 1, privacy: 1, role: 1, education: 1 });
    expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.candidatePrivacySetting.count({ where: { candidateProfile: { userId: user.id } } })).toBe(0);
    expect(await prisma.systemUserRole.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.candidateEducation.count({ where: { candidateProfile: { userId: user.id } } })).toBe(0);
    expect(await prisma.candidateOnboardingDraft.count({ where: { userId: user.id } })).toBe(1);
  });

  it("permits only one concurrent import for the same account", async () => {
    const { user, accessToken } = await seedAuthenticatedUser("import-race");
    await prisma.candidateOnboardingDraft.create({ data: { userId: user.id, content: importDraftContent(user.email), stepIndex: 6 } });
    const responses = await Promise.all([importDraft(accessToken), importDraft(accessToken)]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.candidateProfile.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.candidatePrivacySetting.count({ where: { candidateProfile: { userId: user.id } } })).toBe(1);
    expect(await prisma.candidateCareerPreference.count({ where: { candidateProfile: { userId: user.id } } })).toBe(1);
    expect(await prisma.systemUserRole.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.candidateOnboardingDraft.count({ where: { userId: user.id } })).toBe(1);
  });
  });
});
