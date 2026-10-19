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
    await prisma.systemUserRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds }, action: "admin.user.status" } });
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

  it("manages tenant members and completes the verification review with persisted audit", async () => {
    const owner = await createAuthenticatedUser("manage-owner");
    const peer = await createAuthenticatedUser("manage-peer");
    const outsider = await createAuthenticatedUser("manage-outsider");
    const reviewer = await createAuthenticatedUser("manage-reviewer");
    const created = await request(app.getHttpServer()).post(API)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Review Company", slug: slug("review") }).expect(201);
    const companyId = created.body.id as string;
    await request(app.getHttpServer()).post(API)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .send({ name: "Other Company", slug: slug("other") }).expect(201);

    const viewer = await prisma.role.findFirstOrThrow({
      where: { companyId, normalizedName: "viewer" }, select: { id: true },
    });
    const member = await prisma.companyMember.create({
      data: { companyId, userId: peer.id, status: "ACTIVE" }, select: { id: true },
    });
    await prisma.companyMemberRole.create({ data: {
      companyId, companyMemberId: member.id, roleId: viewer.id, assignedByUserId: owner.id,
    } });
    const membersPath = `${API}/${companyId}/members`;
    await request(app.getHttpServer()).get(membersPath)
      .set("Authorization", `Bearer ${outsider.accessToken}`).expect(403);
    await request(app.getHttpServer()).patch(`${membersPath}/${member.id}/role`)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .send({ role: "ADMIN" }).expect(403);
    await request(app.getHttpServer()).delete(`${membersPath}/${member.id}`)
      .set("Authorization", `Bearer ${outsider.accessToken}`).expect(403);
    await request(app.getHttpServer()).get(membersPath)
      .set("Authorization", `Bearer ${owner.accessToken}`).expect(200)
      .expect((r) => expect(r.body.data).toHaveLength(2));
    await request(app.getHttpServer()).patch(`${membersPath}/${member.id}/role`)
      .set("Authorization", `Bearer ${peer.accessToken}`)
      .send({ role: "RECRUITER" }).expect(403);
    await request(app.getHttpServer()).post(`${membersPath}/ownership-transfer`)
      .set("Authorization", `Bearer ${peer.accessToken}`)
      .send({ memberId: member.id }).expect(403);
    await request(app.getHttpServer()).patch(`${membersPath}/${member.id}/role`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ role: "RECRUITER" }).expect(200);
    expect((await prisma.companyMemberRole.findMany({ where: { companyMemberId: member.id },
      select: { role: { select: { name: true } } } })).map((row) => row.role.name)).toEqual(["RECRUITER"]);
    await request(app.getHttpServer()).patch(`${membersPath}/${member.id}/role`)
      .set("Authorization", `Bearer ${peer.accessToken}`)
      .send({ role: "ADMIN" }).expect(403);
    await request(app.getHttpServer()).post(`${membersPath}/ownership-transfer`)
      .set("Authorization", `Bearer ${peer.accessToken}`)
      .send({ memberId: member.id }).expect(403);

    await request(app.getHttpServer()).post(`${API}/${companyId}/verification-request`)
      .set("Authorization", `Bearer ${owner.accessToken}`).expect(400);
    await request(app.getHttpServer()).patch(`${API}/${companyId}/profile`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ legalName: "Review Company LLC", taxCode: "123456789" }).expect(200);
    await request(app.getHttpServer()).post(`${API}/${companyId}/verification-request`)
      .set("Authorization", `Bearer ${owner.accessToken}`).expect(200)
      .expect((r) => expect(r.body.verificationStatus).toBe("PENDING"));
    await request(app.getHttpServer()).post(`${API}/${companyId}/verification-request`)
      .set("Authorization", `Bearer ${owner.accessToken}`).expect(409);
    await request(app.getHttpServer()).patch(`/api/v1/admin/companies/${companyId}/verification`)
      .send({ status: "VERIFIED" }).expect(401);
    await request(app.getHttpServer()).patch(`/api/v1/admin/companies/${companyId}/verification`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ status: "VERIFIED" }).expect(403);
    const verificationRole = await prisma.role.findFirstOrThrow({
      where: { kind: "SYSTEM", systemCode: "VERIFICATION_ADMIN", isActive: true }, select: { id: true },
    });
    await prisma.systemUserRole.create({ data: { userId: reviewer.id, roleId: verificationRole.id } });
    const supportRole = await prisma.role.findFirstOrThrow({
      where: { kind: "SYSTEM", systemCode: "SUPPORT_ADMIN", isActive: true }, select: { id: true },
    });
    await prisma.systemUserRole.create({ data: { userId: reviewer.id, roleId: supportRole.id } });
    const dashboard = await request(app.getHttpServer()).get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${reviewer.accessToken}`).expect(200);
    const queue = await request(app.getHttpServer()).get("/api/v1/admin/companies?verificationStatus=PENDING")
      .set("Authorization", `Bearer ${reviewer.accessToken}`).expect(200);
    expect(queue.body.pagination.total).toBe(dashboard.body.pendingCompanies);
    expect(queue.body.data.every((company: { status: string; verificationStatus: string }) =>
      company.status === "ACTIVE" && company.verificationStatus === "PENDING")).toBe(true);
    await request(app.getHttpServer()).get(`/api/v1/admin/companies?verificationStatus=PENDING&q=Review`)
      .set("Authorization", `Bearer ${reviewer.accessToken}`).expect(200)
      .expect((r) => expect(r.body.data.some((row: { id: string }) => row.id === companyId)).toBe(true));
    await request(app.getHttpServer()).patch(`/api/v1/admin/companies/${companyId}/verification`)
      .set("Authorization", `Bearer ${reviewer.accessToken}`)
      .send({ status: "VERIFIED" }).expect(200);
    await request(app.getHttpServer()).patch(`/api/v1/admin/companies/${companyId}/verification`)
      .set("Authorization", `Bearer ${reviewer.accessToken}`)
      .send({ status: "REJECTED" }).expect(409);
    await request(app.getHttpServer()).get(`${API}/${companyId}`).expect(200)
      .expect((r) => expect(r.body.isVerified).toBe(true));
    await request(app.getHttpServer()).get(`${API}/${companyId}/profile`)
      .set("Authorization", `Bearer ${owner.accessToken}`).expect(200)
      .expect((r) => expect(r.body).toMatchObject({ legalName: "Review Company LLC", taxCode: "123456789",
        verificationStatus: "VERIFIED" }));
    expect(await prisma.company.findUniqueOrThrow({ where: { id: companyId },
      select: { verificationStatus: true } })).toEqual({ verificationStatus: "VERIFIED" });

    await request(app.getHttpServer()).delete(`${membersPath}/${member.id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`).expect(200);
    expect((await prisma.companyMember.findUniqueOrThrow({ where: { id: member.id } })).status).toBe("REMOVED");
    expect((await authorizationService.resolveRequiredCompanyPermissions(peer.id, companyId, ["company.view"])).allowed).toBe(false);
    await request(app.getHttpServer()).get(`${API}/${companyId}/profile`)
      .set("Authorization", `Bearer ${peer.accessToken}`).expect(403);
    expect(await prisma.auditLog.count({ where: { companyId, action: { in: [
      "company.member.role.update", "company.verification.request", "admin.company.verify", "company.member.remove",
    ] } } })).toBe(4);
  });

  it("transfers ownership only to an active member of the same company", async () => {
    const original = await createAuthenticatedUser("transfer-original");
    const successor = await createAuthenticatedUser("transfer-successor");
    const outsider = await createAuthenticatedUser("transfer-outsider");
    const created = await request(app.getHttpServer()).post(API)
      .set("Authorization", `Bearer ${original.accessToken}`)
      .send({ name: "Transfer Company", slug: slug("transfer") }).expect(201);
    const companyId = created.body.id as string;
    const viewer = await prisma.role.findFirstOrThrow({
      where: { companyId, normalizedName: "viewer" }, select: { id: true },
    });
    const member = await prisma.companyMember.create({
      data: { companyId, userId: successor.id, status: "ACTIVE" }, select: { id: true },
    });
    await prisma.companyMemberRole.create({ data: {
      companyId, companyMemberId: member.id, roleId: viewer.id, assignedByUserId: original.id,
    } });
    const transfer = `${API}/${companyId}/members/ownership-transfer`;
    await request(app.getHttpServer()).post(transfer)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .send({ memberId: member.id }).expect(403);
    const outsideCompany = await request(app.getHttpServer()).post(API)
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .send({ name: "Transfer Other", slug: slug("transfer-other") }).expect(201);
    const outsideMember = await prisma.companyMember.findFirstOrThrow({
      where: { companyId: outsideCompany.body.id, userId: outsider.id }, select: { id: true },
    });
    await request(app.getHttpServer()).post(transfer)
      .set("Authorization", `Bearer ${original.accessToken}`)
      .send({ memberId: outsideMember.id }).expect(404);
    const inactive = await createAuthenticatedUser("transfer-inactive");
    const inactiveMember = await prisma.companyMember.create({
      data: { companyId, userId: inactive.id, status: "INACTIVE" }, select: { id: true },
    });
    await request(app.getHttpServer()).post(transfer)
      .set("Authorization", `Bearer ${original.accessToken}`)
      .send({ memberId: inactiveMember.id }).expect(404);
    await request(app.getHttpServer()).post(transfer)
      .set("Authorization", `Bearer ${original.accessToken}`)
      .send({ memberId: member.id }).expect(200)
      .expect((r) => expect(r.body.ownerMemberId).toBe(member.id));
    const owners = await prisma.companyMember.findMany({
      where: { companyId, isOwner: true, status: "ACTIVE" }, select: { id: true },
    });
    expect(owners).toEqual([{ id: member.id }]);
    expect((await authorizationService.resolveRequiredCompanyPermissions(
      original.id, companyId, ["company.ownership.transfer"],
    )).allowed).toBe(false);
    await request(app.getHttpServer()).post(transfer)
      .set("Authorization", `Bearer ${original.accessToken}`)
      .send({ memberId: member.id }).expect(403);
    expect((await authorizationService.resolveRequiredCompanyPermissions(
      successor.id, companyId, ["company.ownership.transfer"],
    )).allowed).toBe(true);
    expect(await prisma.auditLog.count({ where: { companyId, action: "company.ownership.transfer" } })).toBe(1);
  });

  it("serializes competing ownership transfers and leaves one owner", async () => {
    const original = await createAuthenticatedUser("race-original");
    const nextA = await createAuthenticatedUser("race-a");
    const nextB = await createAuthenticatedUser("race-b");
    const created = await request(app.getHttpServer()).post(API)
      .set("Authorization", `Bearer ${original.accessToken}`)
      .send({ name: "Race Company", slug: slug("race") }).expect(201);
    const companyId = created.body.id as string;
    const viewer = await prisma.role.findFirstOrThrow({
      where: { companyId, normalizedName: "viewer" }, select: { id: true },
    });
    const targets: string[] = [];
    for (const user of [nextA, nextB]) {
      const member = await prisma.companyMember.create({
        data: { companyId, userId: user.id, status: "ACTIVE" }, select: { id: true },
      });
      targets.push(member.id);
      await prisma.companyMemberRole.create({ data: {
        companyId, companyMemberId: member.id, roleId: viewer.id, assignedByUserId: original.id,
      } });
    }
    const transfer = `${API}/${companyId}/members/ownership-transfer`;
    const results = await Promise.all(targets.map((memberId) => request(app.getHttpServer())
      .post(transfer).set("Authorization", `Bearer ${original.accessToken}`).send({ memberId })));
    expect(results.filter((result) => result.status === 200)).toHaveLength(1);
    expect(results.filter((result) => result.status === 403 || result.status === 409)).toHaveLength(1);
    const owner = await prisma.companyMember.findMany({
      where: { companyId, isOwner: true, status: "ACTIVE" }, select: { id: true },
    });
    expect(owner).toHaveLength(1);
    expect(targets).toContain(owner[0]?.id);
    expect(await prisma.auditLog.count({ where: { companyId, action: "company.ownership.transfer" } })).toBe(1);
  });

  it("lets USER_ADMIN suspend and reactivate ordinary accounts but protects platform role holders", async () => {
    const admin = await createAuthenticatedUser("user-admin");
    const auditor = await createAuthenticatedUser("audit-viewer");
    const ordinary = await createAuthenticatedUser("status-target");
    const privileged = await createAuthenticatedUser("status-privileged");
    const statusPath = `/api/v1/admin/users/${ordinary.id}/status`;
    await request(app.getHttpServer()).patch(statusPath)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ status: "SUSPENDED" }).expect(403);
    const roles = await prisma.role.findMany({ where: { kind: "SYSTEM", isActive: true,
      systemCode: { in: ["USER_ADMIN", "AUDIT_VIEWER", "VERIFICATION_ADMIN"] } },
      select: { id: true, systemCode: true } });
    for (const code of ["USER_ADMIN", "AUDIT_VIEWER", "VERIFICATION_ADMIN"]) {
      if (!roles.some((role) => role.systemCode === code)) throw new Error(`Missing approved test role ${code}`);
    }
    const roleId = (code: string) => roles.find((role) => role.systemCode === code)!.id;
    await prisma.systemUserRole.createMany({ data: [
      { userId: admin.id, roleId: roleId("USER_ADMIN") },
      { userId: auditor.id, roleId: roleId("AUDIT_VIEWER") },
      { userId: privileged.id, roleId: roleId("VERIFICATION_ADMIN") },
    ] });
    await request(app.getHttpServer()).get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${ordinary.accessToken}`).expect(200);
    await request(app.getHttpServer()).patch(statusPath)
      .set("Authorization", `Bearer ${auditor.accessToken}`)
      .send({ status: "SUSPENDED" }).expect(403);
    await request(app.getHttpServer()).patch(statusPath)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ status: "SUSPENDED" }).expect(200)
      .expect((r) => expect(r.body.status).toBe("SUSPENDED"));
    await request(app.getHttpServer()).get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${ordinary.accessToken}`).expect(401);
    await request(app.getHttpServer()).patch(statusPath)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ status: "ACTIVE" }).expect(200)
      .expect((r) => expect(r.body.status).toBe("ACTIVE"));
    await request(app.getHttpServer()).get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${ordinary.accessToken}`).expect(200);
    await request(app.getHttpServer()).patch(`/api/v1/admin/users/${privileged.id}/status`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ status: "SUSPENDED" }).expect(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: privileged.id } })).status).toBe("ACTIVE");
    expect(await prisma.auditLog.count({ where: { actorUserId: admin.id, targetId: ordinary.id,
      action: "admin.user.status" } })).toBe(2);
    await request(app.getHttpServer()).get("/api/v1/admin/audit")
      .set("Authorization", `Bearer ${auditor.accessToken}`).expect(200)
      .expect((r) => expect(r.body.data.some((row: { actorUserId: string; action: string }) =>
        row.actorUserId === admin.id && row.action === "admin.user.status")).toBe(true));
  });
});
