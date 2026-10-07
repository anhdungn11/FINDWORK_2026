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

const API = "/api/v1/candidate";
const EMAIL_PREFIX = "phase4.1.candidate.";
const TEST_PASSWORD = "CandidateIntegration123!";

describe("Candidate integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordService: PasswordService;
  let tokenService: TokenService;
  let passwordHash: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    const configService = app.get(ConfigService);
    const databaseUrl = configService.getOrThrow<string>("DATABASE_URL");
    const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");

    if (databaseName !== "findwork_test") {
      throw new Error(
        `Refusing destructive integration tests against ${databaseName}`,
      );
    }

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
    passwordService = app.get(PasswordService);
    tokenService = app.get(TokenService);
    passwordHash = await passwordService.hash(TEST_PASSWORD);

    await assertCandidateAuthorizationSeed();
  });

  beforeEach(async () => {
    await cleanupTestUsers();
  });

  afterAll(async () => {
    await cleanupTestUsers();
    await app.close();
  });

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
    const users = await prisma.user.findMany({
      where: {
        emailNormalized: { startsWith: EMAIL_PREFIX },
      },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    if (userIds.length === 0) return;

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
  }

  async function seedAuthenticatedUser(label: string) {
    const normalizedLabel = `${label}.${randomUUID()}`;
    const email = `${EMAIL_PREFIX}${normalizedLabel}@findwork.local`;
    const user = await prisma.user.create({
      data: {
        email,
        emailNormalized: email.toLowerCase(),
        passwordHash,
        status: "ACTIVE",
      },
    });

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
});
