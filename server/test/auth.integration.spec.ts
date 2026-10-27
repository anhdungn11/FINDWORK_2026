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
import { assertSafeIntegrationDatabase } from "./integration-safety";

const API = "/api/v1/auth";

let testEmail: string;
let duplicateEmail: string;
let ownedUserIds: Set<string>;

const TEST_PASSWORD =
  "IntegrationPassword123!";

function getCookie(
  response: {
    headers: Record<
      string,
      string | string[] | undefined
    >;
  },
): string {
  const raw = response.headers["set-cookie"];

  const first = Array.isArray(raw)
    ? raw[0]
    : raw;

  if (!first) {
    throw new Error(
      "Expected refresh cookie but none was returned.",
    );
  }

  const cookie = first.split(";")[0];

  if (!cookie) {
    throw new Error(
      "Expected refresh cookie value but none was parsed.",
    );
  }

  return cookie;
}

function getFullCookieHeader(
  response: {
    headers: Record<
      string,
      string | string[] | undefined
    >;
  },
): string {
  const raw = response.headers["set-cookie"];

  const first = Array.isArray(raw)
    ? raw[0]
    : raw;

  return first ?? "";
}

describe("Auth integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordService: PasswordService;

  let passwordHash: string;
  let candidateRoleId: string;

  beforeAll(async () => {
    const moduleRef =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleRef.createNestApplication();

    const configService =
      app.get(ConfigService);

    app.use(cookieParser());

    app.setGlobalPrefix(
      configService.getOrThrow<string>(
        "API_PREFIX",
      ),
    );

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    app.useGlobalFilters(
      new ApiExceptionFilter(),
    );

    await app.init();

    prisma = app.get(PrismaService);
    await assertSafeIntegrationDatabase(prisma, configService);

    passwordService =
      app.get(PasswordService);

    passwordHash =
      await passwordService.hash(
        TEST_PASSWORD,
      );

    const candidateRole = await prisma.role.findUnique({
      where: { systemCode: "CANDIDATE" },
      select: { id: true, kind: true, isActive: true },
    });
    if (!candidateRole || candidateRole.kind !== "SYSTEM" || !candidateRole.isActive) {
      throw new Error("Auth integration requires the existing active CANDIDATE role.");
    }

    candidateRoleId = candidateRole.id;
  });

  beforeEach(() => {
    const marker = randomUUID().replace(/-/g, "");
    testEmail = `phase2.integration.${marker}@findwork.local`;
    duplicateEmail = `duplicate.${marker}@findwork.local`;
    ownedUserIds = new Set<string>();
  });

  afterEach(async () => {
    if (!prisma || !testEmail || !duplicateEmail) return;
    const users = await prisma.user.findMany({
      where: { emailNormalized: { in: [testEmail, duplicateEmail] } },
      select: { id: true },
    });
    const userIds = [...new Set([...users.map((user) => user.id), ...ownedUserIds])];
    if (userIds.length === 0) return;
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.systemUserPermission.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.systemUserRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.candidateOnboardingDraft.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.candidateProfile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    ownedUserIds.clear();
  });

  afterAll(async () => app?.close());

  async function seedUser(
    status:
      | "ACTIVE"
      | "SUSPENDED"
      | "DISABLED" = "ACTIVE",
  ) {
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        emailNormalized:
          testEmail.toLowerCase(),
        passwordHash,
        status,
      },
    });
    ownedUserIds.add(user.id);
    return user;
  }

  it("registers a user, assigns CANDIDATE, hashes the password, creates a session and sets HttpOnly refresh cookie", async () => {
    const email = testEmail.replace("phase2.integration", "Phase2.Integration")
      .replace("@findwork.local", "@Findwork.Local");

    const response =
      await request(app.getHttpServer())
        .post(`${API}/register`)
        .send({
          email,
          password: TEST_PASSWORD,
          accountType: "CANDIDATE",
        })
        .expect(201);
    ownedUserIds.add(response.body.user.id as string);

    expect(
      typeof response.body.accessToken,
    ).toBe("string");

    expect(
      response.body
        .accessTokenExpiresInSeconds,
    ).toBe(900);

    expect(
      response.body.refreshToken,
    ).toBeUndefined();

    expect(response.body.user).toEqual(
      expect.objectContaining({
        email,
        status: "ACTIVE",
        emailVerified: false,
        accountType: "CANDIDATE",
      }),
    );

    const fullCookie =
      getFullCookieHeader(response);

    expect(fullCookie).toContain(
      "findwork_refresh=",
    );
    expect(fullCookie).toContain(
      "HttpOnly",
    );
    expect(fullCookie).toContain(
      "SameSite=Lax",
    );
    expect(fullCookie).toContain(
      "Path=/api/v1/auth",
    );

    const user =
      await prisma.user.findUniqueOrThrow({
        where: {
          emailNormalized:
            email.toLowerCase(),
        },
      });

    expect(user.passwordHash).not.toBe(
      TEST_PASSWORD,
    );

    expect(
      user.passwordHash.startsWith(
        "$argon2id$",
      ),
    ).toBe(true);

    const candidateAssignment =
      await prisma.systemUserRole.findUnique({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: candidateRoleId,
          },
        },
      });

    expect(candidateAssignment).not.toBeNull();

    expect(
      candidateAssignment?.assignedByUserId,
    ).toBeNull();

    const sessions =
      await prisma.authSession.findMany({
        where: {
          userId: user.id,
        },
      });

    expect(sessions).toHaveLength(1);

    const cookie =
      getCookie(response);

    const rawRefreshToken =
      cookie.slice(
        "findwork_refresh=".length,
      );

    const secret =
      rawRefreshToken.split(".")[1];

    const session = sessions[0];

    if (!session) {
      throw new Error(
        "Expected exactly one auth session.",
      );
    }

    expect(
      session.refreshTokenHash,
    ).not.toBe(secret);
  });

  it("rejects duplicate normalized email", async () => {
    const registered = await request(app.getHttpServer())
      .post(`${API}/register`)
      .send({
        email:
          duplicateEmail.replace("duplicate", "Duplicate").replace("@findwork.local", "@Findwork.Local"),
        password: TEST_PASSWORD,
        accountType: "CANDIDATE",
      })
      .expect(201);
    ownedUserIds.add(registered.body.user.id as string);

    const response =
      await request(app.getHttpServer())
        .post(`${API}/register`)
        .send({
          email:
            duplicateEmail,
          password: TEST_PASSWORD,
          accountType: "CANDIDATE",
        })
        .expect(409);

    expect(response.body.code).toBe(
      "AUTH_EMAIL_ALREADY_REGISTERED",
    );
  });

  it("rejects unknown DTO fields", async () => {
    const response =
      await request(app.getHttpServer())
        .post(`${API}/register`)
        .send({
          email:
            testEmail.replace("phase2.integration", "validation"),
          password: TEST_PASSWORD,
          accountType: "CANDIDATE",
          admin: true,
        })
        .expect(400);

    expect(response.body.code).toBe(
      "VALIDATION_ERROR",
    );
    expect(response.body.details).toContain("property admin should not exist");
  });

  it("requires an explicit account type on the retained registration route", async () => {
    const response = await request(app.getHttpServer())
      .post(`${API}/register`)
      .send({ email: testEmail, password: TEST_PASSWORD })
      .expect(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(response.body.details).toEqual(expect.arrayContaining([
      expect.stringContaining("accountType"),
    ]));
    expect(await prisma.user.count({ where: { emailNormalized: testEmail.toLowerCase() } })).toBe(0);
  });

  it("logs in an active user and returns identical errors for wrong and nonexistent credentials", async () => {
    await seedUser();

    const success =
      await request(app.getHttpServer())
        .post(`${API}/login`)
        .send({
          email: testEmail,
          password: TEST_PASSWORD,
        })
        .expect(200);

    expect(
      typeof success.body.accessToken,
    ).toBe("string");

    expect(
      getFullCookieHeader(success),
    ).toContain("HttpOnly");

    const wrongPassword =
      await request(app.getHttpServer())
        .post(`${API}/login`)
        .send({
          email: testEmail,
          password: "WrongPassword123!",
        })
        .expect(401);

    const missingUser =
      await request(app.getHttpServer())
        .post(`${API}/login`)
        .send({
          email:
            testEmail.replace("phase2.integration", "missing"),
          password: TEST_PASSWORD,
        })
        .expect(401);

    expect(
      wrongPassword.body.code,
    ).toBe(
      "AUTH_INVALID_CREDENTIALS",
    );

    expect(
      missingUser.body.code,
    ).toBe(
      "AUTH_INVALID_CREDENTIALS",
    );
  });

  it("rejects SUSPENDED and DISABLED accounts after valid password verification", async () => {
    const user =
      await seedUser("SUSPENDED");

    const suspended =
      await request(app.getHttpServer())
        .post(`${API}/login`)
        .send({
          email: testEmail,
          password: TEST_PASSWORD,
        })
        .expect(403);

    expect(suspended.body.code).toBe(
      "AUTH_ACCOUNT_UNAVAILABLE",
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        status: "DISABLED",
      },
    });

    const disabled =
      await request(app.getHttpServer())
        .post(`${API}/login`)
        .send({
          email: testEmail,
          password: TEST_PASSWORD,
        })
        .expect(403);

    expect(disabled.body.code).toBe(
      "AUTH_ACCOUNT_UNAVAILABLE",
    );
  });

  it("protects /me and immediately rejects access after the account becomes unavailable", async () => {
    const user = await seedUser();

    const login =
      await request(app.getHttpServer())
        .post(`${API}/login`)
        .send({
          email: testEmail,
          password: TEST_PASSWORD,
        })
        .expect(200);

    const accessToken =
      login.body.accessToken as string;

    const me =
      await request(app.getHttpServer())
        .get(`${API}/me`)
        .set(
          "Authorization",
          `Bearer ${accessToken}`,
        )
        .expect(200);

    expect(me.body.email).toBe(
      testEmail,
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        status: "SUSPENDED",
      },
    });

    const afterSuspension =
      await request(app.getHttpServer())
        .get(`${API}/me`)
        .set(
          "Authorization",
          `Bearer ${accessToken}`,
        )
        .expect(401);

    expect(
      afterSuspension.body.code,
    ).toBe(
      "AUTH_SESSION_INVALID",
    );

    const missing =
      await request(app.getHttpServer())
        .get(`${API}/me`)
        .expect(401);

    expect(missing.body.code).toBe(
      "AUTH_ACCESS_TOKEN_REQUIRED",
    );

    const malformed =
      await request(app.getHttpServer())
        .get(`${API}/me`)
        .set(
          "Authorization",
          "Bearer not-a-jwt",
        )
        .expect(401);

    expect(malformed.body.code).toBe(
      "AUTH_ACCESS_TOKEN_INVALID",
    );
  });

  it("rotates refresh tokens and rejects the old token without extending absolute session expiry", async () => {
    await seedUser();

    const login =
      await request(app.getHttpServer())
        .post(`${API}/login`)
        .send({
          email: testEmail,
          password: TEST_PASSWORD,
        })
        .expect(200);

    const oldCookie = getCookie(login);

    const sessionId =
      oldCookie
        .slice(
          "findwork_refresh=".length,
        )
        .split(".")[0];

    const sessionBefore =
      await prisma.authSession.findUniqueOrThrow({
        where: {
          id: sessionId,
        },
      });

    const refreshed =
      await request(app.getHttpServer())
        .post(`${API}/refresh`)
        .set("Cookie", oldCookie)
        .expect(200);

    const newCookie =
      getCookie(refreshed);

    expect(newCookie).not.toBe(
      oldCookie,
    );

    const sessionAfter =
      await prisma.authSession.findUniqueOrThrow({
        where: {
          id: sessionId,
        },
      });

    expect(
      sessionAfter.expiresAt.getTime(),
    ).toBe(
      sessionBefore.expiresAt.getTime(),
    );

    const oldTokenAttempt =
      await request(app.getHttpServer())
        .post(`${API}/refresh`)
        .set("Cookie", oldCookie)
        .expect(401);

    expect(
      oldTokenAttempt.body.code,
    ).toBe(
      "AUTH_SESSION_INVALID",
    );
  });

  it("allows exactly one winner when the same refresh token is used concurrently", async () => {
    await seedUser();

    const login =
      await request(app.getHttpServer())
        .post(`${API}/login`)
        .send({
          email: testEmail,
          password: TEST_PASSWORD,
        })
        .expect(200);

    const cookie = getCookie(login);

    const [first, second] =
      await Promise.all([
        request(app.getHttpServer())
          .post(`${API}/refresh`)
          .set("Cookie", cookie),
        request(app.getHttpServer())
          .post(`${API}/refresh`)
          .set("Cookie", cookie),
      ]);

    const statuses = [
      first.status,
      second.status,
    ].sort();

    expect(statuses).toEqual([
      200,
      401,
    ]);
  });

  it("logout is idempotent and revoked session immediately invalidates its access token", async () => {
    await seedUser();

    const login =
      await request(app.getHttpServer())
        .post(`${API}/login`)
        .send({
          email: testEmail,
          password: TEST_PASSWORD,
        })
        .expect(200);

    const cookie = getCookie(login);

    const accessToken =
      login.body.accessToken as string;

    await request(app.getHttpServer())
      .post(`${API}/logout`)
      .set("Cookie", cookie)
      .expect(204);

    await request(app.getHttpServer())
      .post(`${API}/logout`)
      .set("Cookie", cookie)
      .expect(204);

    const me =
      await request(app.getHttpServer())
        .get(`${API}/me`)
        .set(
          "Authorization",
          `Bearer ${accessToken}`,
        )
        .expect(401);

    expect(me.body.code).toBe(
      "AUTH_SESSION_INVALID",
    );
  });

  it("rejects cookie-auth mutations from an unapproved browser Origin", async () => {
    const response =
      await request(app.getHttpServer())
        .post(`${API}/refresh`)
        .set(
          "Origin",
          "https://evil.example",
        )
        .expect(403);

    expect(response.body.code).toBe(
      "AUTH_ORIGIN_FORBIDDEN",
    );
  });
});
