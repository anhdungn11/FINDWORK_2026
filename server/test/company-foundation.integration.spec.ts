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
import type { Prisma } from "../src/generated/prisma/client";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { CompanyRepository } from "../src/modules/company/company.repository";
import { AuthorizationService } from "../src/modules/authorization/authorization.service";
import { TokenService } from "../src/modules/auth/services/token.service";

const API = "/api/v1/companies";
const PREFIX = `phase43a-${randomUUID().slice(0, 8)}`;
const TEST_EMAIL_DOMAIN = "@phase43a.test";
const EXPECTED_GRANTS: Record<string, string[]> = {
  OWNER: [
    "company.view", "company.update", "company.member.view",
    "company.member.invite", "company.member.update", "company.member.remove",
    "company.role.view", "company.role.manage", "company.audit.view",
    "company.ownership.transfer",
  ],
  ADMIN: [
    "company.view", "company.update", "company.member.view",
    "company.member.invite", "company.member.update", "company.member.remove",
    "company.role.view", "company.role.manage",
  ],
  HR_MANAGER: [
    "company.view", "company.member.view", "company.member.invite",
    "company.role.view",
  ],
  RECRUITER: ["company.view"],
  HIRING_MANAGER: ["company.view"],
  VIEWER: ["company.view"],
};

/** Strictly scoped, destructive integration tests. Only use findwork_test. */
describe("Phase 4.3A Company Foundation integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;
  let authorizationService: AuthorizationService;
  const userIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    const config = app.get(ConfigService);
    const databaseName = new URL(config.getOrThrow<string>("DATABASE_URL"))
      .pathname.replace(/^\//, "");
    if (databaseName !== "findwork_test") {
      throw new Error(`Refusing destructive company tests against ${databaseName}`);
    }

    app.use(cookieParser());
    app.setGlobalPrefix(config.getOrThrow<string>("API_PREFIX"));
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    tokenService = app.get(TokenService);
    authorizationService = app.get(AuthorizationService);
  });

  afterAll(async () => {
    if (!prisma) return;
    // Identify ONLY this suite's companies/users; never broad-delete company data.
    const companies = await prisma.company.findMany({
      where: { slug: { startsWith: PREFIX } },
      select: { id: true },
    });
    const companyIds = companies.map((company) => company.id);

    await prisma.auditLog.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.companyMemberPermission.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.companyMemberRole.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.rolePermission.deleteMany({ where: { role: { companyId: { in: companyIds } } } });
    await prisma.role.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.companyInvitation.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.companyLocation.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.companyMember.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  async function createAuthenticatedUser(label: string) {
    const id = randomUUID();
    const sessionId = randomUUID();
    const email = `${PREFIX}-${label}-${id.slice(0, 8)}${TEST_EMAIL_DOMAIN}`;
    await prisma.user.create({
      data: {
        id,
        email,
        emailNormalized: email.toLowerCase(),
        passwordHash: "phase43a-integration-test-only",
      },
    });
    userIds.push(id);
    await prisma.authSession.create({
      data: {
        id: sessionId,
        userId: id,
        refreshTokenHash: `phase43a-${sessionId}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const accessToken = await tokenService.signAccessToken(id, sessionId);
    return { id, accessToken };
  }

  function slug(suffix: string) {
    return `${PREFIX}-${suffix}`;
  }

  it("requires a valid access token", async () => {
    await request(app.getHttpServer())
      .post(API)
      .send({ name: "Unauthenticated Company", slug: slug("unauth") })
      .expect(401);
  });

  it("atomically creates Company, ACTIVE owner, six roles, grants and audit", async () => {
    const user = await createAuthenticatedUser("owner");
    const response = await request(app.getHttpServer())
      .post(API)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "Phase 43A Test", slug: slug("success") })
      .expect(201);

    expect(Object.keys(response.body).sort()).toEqual([
      "createdAt", "id", "name", "slug", "status", "verificationStatus",
    ].sort());
    expect(response.body).toMatchObject({
      name: "Phase 43A Test",
      slug: slug("success"),
      status: "ACTIVE",
      verificationStatus: "UNVERIFIED",
    });

    const members = await prisma.companyMember.findMany({
      where: { companyId: response.body.id },
    });
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({
      userId: user.id,
      status: "ACTIVE",
      isOwner: true,
      removedAt: null,
    });

    const roles = await prisma.role.findMany({
      where: { companyId: response.body.id },
      include: {
        permissions: { include: { permission: { select: { code: true } } } },
        companyMembers: true,
      },
    });
    expect(roles).toHaveLength(6);
    expect(roles.map((role) => role.name).sort()).toEqual(
      Object.keys(EXPECTED_GRANTS).sort(),
    );
    for (const [roleName, grants] of Object.entries(EXPECTED_GRANTS)) {
      const role = roles.find((item) => item.name === roleName);
      expect(role).toBeDefined();
      expect(role).toMatchObject({ kind: "COMPANY", isActive: true, systemCode: null });
      expect(role!.permissions.map((p) => p.permission.code).sort()).toEqual(
        [...grants].sort(),
      );
      expect(role!.permissions.every((p) => p.dataScope === "COMPANY")).toBe(true);
      expect(role!.companyMembers).toHaveLength(roleName === "OWNER" ? 1 : 0);
    }
    const owner = roles.find((role) => role.name === "OWNER")!;
    expect(owner.isProtected).toBe(true);
    expect(owner.companyMembers[0]?.companyMemberId).toBe(members[0]?.id);

    expect(await prisma.auditLog.count({
      where: { companyId: response.body.id, action: "company.create" },
    })).toBe(1);
  });

  it("rejects mass-assignment and invalid slugs", async () => {
    const user = await createAuthenticatedUser("validate");
    await request(app.getHttpServer())
      .post(API)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "Malicious", slug: slug("malicious"), isOwner: true })
      .expect(400);

    await request(app.getHttpServer())
      .post(API)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ name: "Invalid Slug", slug: "Not a safe slug!" })
      .expect(400);

    expect(await prisma.company.count({
      where: { slug: slug("malicious") },
    })).toBe(0);
  });

  it("returns 409 on duplicate slug without adding partial membership or roles", async () => {
    const user = await createAuthenticatedUser("duplicates");
    const payload = { name: "Duplicate", slug: slug("duplicate") };
    const first = await request(app.getHttpServer())
      .post(API)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(payload)
      .expect(201);
    await request(app.getHttpServer())
      .post(API)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send(payload)
      .expect(409);
    expect(await prisma.company.count({ where: { slug: payload.slug } })).toBe(1);
    expect(await prisma.companyMember.count({ where: { companyId: first.body.id } })).toBe(1);
    expect(await prisma.role.count({ where: { companyId: first.body.id } })).toBe(6);
  });

  it("accepts only one concurrent create for a shared unique slug", async () => {
    const user = await createAuthenticatedUser("race");
    const payload = { name: "Race Company", slug: slug("race") };
    const [a, b] = await Promise.all([
      request(app.getHttpServer()).post(API)
        .set("Authorization", `Bearer ${user.accessToken}`).send(payload),
      request(app.getHttpServer()).post(API)
        .set("Authorization", `Bearer ${user.accessToken}`).send(payload),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await prisma.company.count({ where: { slug: payload.slug } })).toBe(1);
    const company = await prisma.company.findUniqueOrThrow({
      where: { slug: payload.slug }, select: { id: true },
    });
    expect(await prisma.companyMember.count({
      where: { companyId: company.id, isOwner: true, status: "ACTIVE" },
    })).toBe(1);
    expect(await prisma.role.count({ where: { companyId: company.id } })).toBe(6);
  });

  it("rolls back all created rows when the final audit step fails", async () => {
    const user = await createAuthenticatedUser("late-rollback");
    const requestedSlug = slug("late-rollback");
    const injectedError = "PHASE43A_TEST_ONLY_AUDIT_FAILURE";
    let faultInjected = false;
    let pendingCompanyId: string | null = null;

    // Wrap the REAL Prisma interactive transaction. Only intercept its final
    // audit write so earlier company/member/role writes genuinely execute.
    // No persistent database trigger, migration, or production code change.
    const faultInjectedPrisma = {
      $transaction: <T>(
        callback: (tx: Prisma.TransactionClient) => Promise<T>,
        options?: { maxWait?: number; timeout?: number },
      ): Promise<T> =>
        prisma.$transaction(
          (tx) =>
            callback(
              new Proxy(tx, {
                get(target, property) {
                  if (property === "auditLog") {
                    return new Proxy(target.auditLog, {
                      get(delegate, method) {
                        if (method === "create") {
                          return async (args: { data: { companyId: string } }) => {
                            faultInjected = true;
                            pendingCompanyId = args.data.companyId;
                            throw new Error(injectedError);
                          };
                        }
                        return Reflect.get(delegate, method);
                      },
                    });
                  }
                  return Reflect.get(target, property);
                },
              }),
            ),
          options,
        ),
    } as unknown as PrismaService;

    const repository = new CompanyRepository(faultInjectedPrisma);
    await expect(
      repository.createCompanyWithOwner({
        actorUserId: user.id,
        name: "Phase 43A Forced Rollback",
        slug: requestedSlug,
      }),
    ).rejects.toThrow(injectedError);

    expect(faultInjected).toBe(true);
    expect(pendingCompanyId).not.toBeNull();
    expect(await prisma.company.count({ where: { slug: requestedSlug } })).toBe(0);
    expect(await prisma.companyMember.count({ where: { companyId: pendingCompanyId! } })).toBe(0);
    expect(await prisma.role.count({ where: { companyId: pendingCompanyId! } })).toBe(0);
    expect(await prisma.companyMemberRole.count({ where: { companyId: pendingCompanyId! } })).toBe(0);
    expect(await prisma.rolePermission.count({ where: { role: { companyId: pendingCompanyId! } } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { companyId: pendingCompanyId! } })).toBe(0);
  });

  it("supports multiple companies per user and denies cross-company grants", async () => {
    const userA = await createAuthenticatedUser("multi-a");
    const userB = await createAuthenticatedUser("multi-b");
    const a1 = await request(app.getHttpServer())
      .post(API)
      .set("Authorization", `Bearer ${userA.accessToken}`)
      .send({ name: "Company A1", slug: slug("multi-a1") })
      .expect(201);
    const a2 = await request(app.getHttpServer())
      .post(API)
      .set("Authorization", `Bearer ${userA.accessToken}`)
      .send({ name: "Company A2", slug: slug("multi-a2") })
      .expect(201);
    const b1 = await request(app.getHttpServer())
      .post(API)
      .set("Authorization", `Bearer ${userB.accessToken}`)
      .send({ name: "Company B1", slug: slug("multi-b1") })
      .expect(201);

    expect(await prisma.companyMember.count({
      where: { userId: userA.id, status: "ACTIVE", isOwner: true },
    })).toBe(2);
    expect((await authorizationService.resolveRequiredCompanyPermissions(
      userA.id, a1.body.id, ["company.update"],
    )).allowed).toBe(true);
    expect((await authorizationService.resolveRequiredCompanyPermissions(
      userA.id, a2.body.id, ["company.update"],
    )).allowed).toBe(true);
    expect((await authorizationService.resolveRequiredCompanyPermissions(
      userA.id, b1.body.id, ["company.update"],
    )).allowed).toBe(false);
  });
});
