import "reflect-metadata";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { createHash, randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { ApiExceptionFilter } from "../src/common/exceptions/api-exception.filter";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { CompanyInvitationsRepository } from "../src/modules/company/company-invitations.repository";
import type { Prisma } from "../src/generated/prisma/client";
import { TokenService } from "../src/modules/auth/services/token.service";
import { CompanyInvitationDeliveryService } from "../src/modules/company/company-invitation-delivery.service";

const BASE = "/api/v1/companies";
const ACCEPT = "/api/v1/company-invitations/accept";
const PREFIX = `phase43c-${randomUUID().slice(0, 8)}`;
const DOMAIN = "@phase43c.test";
type User = { id: string; token: string; email: string };

describe("Phase 4.3C.1 Company Invitations integration (test database ONLY)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;
  let owner: User;
  let otherOwner: User;
  let admin: User;
  let hr: User;
  let viewer: User;
  let recipient: User;
  let recipient2: User;
  let companyA: string;
  let companyB: string;
  let failDelivery = false;
  const users: string[] = [];
  const captured = new Map<string, string>();

  const companyInvites = (id: string) => `${BASE}/${id}/invitations`;
  const bearer = (u: User) => ({ Authorization: `Bearer ${u.token}` });
  const email = (label: string) => `${PREFIX}-${label}${DOMAIN}`;

  beforeAll(async () => {
    // Deliberately mock ONLY delivery; the full HTTP + guards + DB stack stays real.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CompanyInvitationDeliveryService)
      .useValue({
        assertAvailable(): void { /* test harness only */ },
        async send(target: string, token: string): Promise<void> {
          if (failDelivery) throw new Error("TEST_DELIVERY_FAILED");
          captured.set(target, token);
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    const config = app.get(ConfigService);
    const database = decodeURIComponent(new URL(config.getOrThrow<string>("DATABASE_URL")).pathname.slice(1));
    if (database !== "findwork_test") throw new Error(`REFUSING destructive 4.3C tests on ${database}`);
    app.use(cookieParser());
    app.setGlobalPrefix(config.getOrThrow<string>("API_PREFIX"));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    tokenService = app.get(TokenService);
    owner = await createUser("owner");
    otherOwner = await createUser("other-owner");
    admin = await createUser("admin");
    hr = await createUser("hr");
    viewer = await createUser("viewer");
    recipient = await createUser("recipient");
    recipient2 = await createUser("recipient2");
    companyA = await createCompany(owner, "a");
    companyB = await createCompany(otherOwner, "b");
    await grantRole(companyA, admin, "ADMIN");
    await grantRole(companyA, hr, "HR_MANAGER");
    await grantRole(companyA, viewer, "VIEWER");
  });

  afterAll(async () => {
    try {
      if (!prisma) return;
      const ids = (await prisma.company.findMany({
        where: { slug: { startsWith: PREFIX } }, select: { id: true },
      })).map((c) => c.id);
      await prisma.auditLog.deleteMany({ where: { companyId: { in: ids } } });
      await prisma.companyMemberPermission.deleteMany({ where: { companyId: { in: ids } } });
      await prisma.companyMemberRole.deleteMany({ where: { companyId: { in: ids } } });
      await prisma.rolePermission.deleteMany({ where: { role: { companyId: { in: ids } } } });
      await prisma.role.deleteMany({ where: { companyId: { in: ids } } });
      await prisma.companyInvitation.deleteMany({ where: { companyId: { in: ids } } });
      await prisma.companyLocation.deleteMany({ where: { companyId: { in: ids } } });
      await prisma.companyMember.deleteMany({ where: { companyId: { in: ids } } });
      await prisma.company.deleteMany({ where: { id: { in: ids } } });
      await prisma.authSession.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    } finally {
      if (app) await app.close();
    }
  });

  async function createUser(label: string): Promise<User> {
    const id = randomUUID();
    const sessionId = randomUUID();
    const address = `${PREFIX}-${label}-${id.slice(0, 8)}${DOMAIN}`;
    await prisma.user.create({ data: {
      id, email: address, emailNormalized: address, passwordHash: "phase43c-test-only",
    } });
    users.push(id);
    await prisma.authSession.create({ data: {
      id: sessionId, userId: id, refreshTokenHash: `phase43c-${sessionId}`,
      expiresAt: new Date(Date.now() + 3_600_000),
    } });
    return { id, email: address, token: await tokenService.signAccessToken(id, sessionId) };
  }

  async function createCompany(user: User, suffix: string): Promise<string> {
    const r = await request(app.getHttpServer()).post(BASE).set(bearer(user))
      .send({ name: `43C Company ${suffix}`, slug: `${PREFIX}-${suffix}` }).expect(201);
    return r.body.id as string;
  }

  async function grantRole(companyId: string, u: User, roleName: string) {
    const member = await prisma.companyMember.create({ data: {
      companyId, userId: u.id, status: "ACTIVE", isOwner: false, removedAt: null,
    } });
    const role = await prisma.role.findFirstOrThrow({ where: { companyId, name: roleName } });
    await prisma.companyMemberRole.create({ data: {
      companyId, companyMemberId: member.id, roleId: role.id, assignedByUserId: owner.id,
    } });
    return member;
  }

  function invite(u: User, recipientEmail: string, target = companyA) {
    return request(app.getHttpServer()).post(companyInvites(target))
      .set(bearer(u)).send({ email: recipientEmail });
  }

  it("fails closed before persistence with an unconfigured production delivery provider", async () => {
    const stub = new CompanyInvitationDeliveryService();
    expect(() => stub.assertAvailable()).toThrow();
  });

  it("requires authentication for list, create and accept", async () => {
    await request(app.getHttpServer()).get(companyInvites(companyA)).expect(401);
    await request(app.getHttpServer()).post(companyInvites(companyA)).send({ email: email("anon") }).expect(401);
    await request(app.getHttpServer()).post(ACCEPT).send({ token: "a".repeat(43) }).expect(401);
  });

  it("rejects VIEWER, cross-company inviter and malformed/mass-assigned input", async () => {
    await invite(viewer, email("viewer-denied")).expect(403);
    await invite(otherOwner, email("cross-denied")).expect(403);
    await invite(owner, "not-an-email").expect(400);
    await request(app.getHttpServer()).post(companyInvites(companyA)).set(bearer(owner))
      .send({ email: email("escalate"), roleId: randomUUID() }).expect(400);
    await request(app.getHttpServer()).get(companyInvites(companyA)).set(bearer(viewer)).expect(403);
  });

  it("allows OWNER/ADMIN/HR_MANAGER to invite and never leaks token in API or database plaintext", async () => {
    for (const [u, label] of [[owner, "owner"], [admin, "admin"], [hr, "hr"]] as const) {
      const target = email(`allowed-${label}`);
      const result = await invite(u, target.toUpperCase()).expect(201);
      expect(result.body.emailNormalized).toBe(target);
      expect(result.body).not.toHaveProperty("token");
      expect(result.body).not.toHaveProperty("tokenHash");
      const secret = captured.get(target);
      expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const persisted = await prisma.companyInvitation.findUniqueOrThrow({ where: { id: result.body.id } });
      expect(persisted.tokenHash).toBe(createHash("sha256").update(secret!).digest("hex"));
      expect(persisted.tokenHash).not.toBe(secret);
    }
    const list = await request(app.getHttpServer()).get(companyInvites(companyA))
      .set(bearer(hr)).expect(200);
    expect(list.body.some((r: { emailNormalized: string }) => r.emailNormalized === email("allowed-owner"))).toBe(true);
    for (const entry of list.body) {
      expect(entry).not.toHaveProperty("token");
      expect(entry).not.toHaveProperty("tokenHash");
    }
  });

  it("rejects a duplicate pending invitation and direct-denied inviter", async () => {
    const address = email("duplicate");
    await invite(owner, address).expect(201);
    await invite(admin, address).expect(409);
    const member = await prisma.companyMember.findUniqueOrThrow({ where: {
      companyId_userId: { companyId: companyA, userId: hr.id },
    } });
    const permission = await prisma.permission.findUniqueOrThrow({ where: { code: "company.member.invite" } });
    await prisma.companyMemberPermission.create({ data: {
      companyId: companyA, companyMemberId: member.id,
      permissionId: permission.id, effect: "DENY", dataScope: null, assignedByUserId: owner.id,
    } });
    try { await invite(hr, email("direct-denied")).expect(403); }
    finally {
      await prisma.companyMemberPermission.delete({ where: {
        companyMemberId_permissionId: { companyMemberId: member.id, permissionId: permission.id },
      } });
    }
  });

  it("allows the invited account only, assigns safe VIEWER and cannot reuse token", async () => {
    await invite(owner, recipient.email).expect(201);
    const secret = captured.get(recipient.email)!;
    await request(app.getHttpServer()).post(ACCEPT).set(bearer(recipient2))
      .send({ token: secret }).expect(403);
    const accepted = await request(app.getHttpServer()).post(ACCEPT).set(bearer(recipient))
      .send({ token: secret }).expect(201);
    expect(accepted.body).toMatchObject({ companyId: companyA, role: "VIEWER" });
    const membership = await prisma.companyMember.findUniqueOrThrow({ where: {
      companyId_userId: { companyId: companyA, userId: recipient.id },
    }, include: { roles: { include: { role: true } } } });
    expect(membership.isOwner).toBe(false);
    expect(membership.roles.map((r) => r.role.name)).toEqual(["VIEWER"]);
    await request(app.getHttpServer()).post(ACCEPT).set(bearer(recipient))
      .send({ token: secret }).expect(404);
  });

  it("revokes a pending token, refuses cross-company revoke and never accepts revoked token", async () => {
    const target = email("revoke");
    const r = await invite(owner, target).expect(201);
    const revoke = (companyId: string) => `${companyInvites(companyId)}/${r.body.id}/revoke`;
    await request(app.getHttpServer()).post(revoke(companyB)).set(bearer(otherOwner)).expect(404);
    await request(app.getHttpServer()).post(revoke(companyA)).set(bearer(viewer)).expect(403);
    await request(app.getHttpServer()).post(revoke(companyA)).set(bearer(owner)).expect(201);
    await request(app.getHttpServer()).post(revoke(companyA)).set(bearer(owner)).expect(201);
    const invitee = await createUser("revoke");
    // The email used for this invitation is deliberately NOT registered, so even with the secret it cannot be accepted.
    await request(app.getHttpServer()).post(ACCEPT).set(bearer(invitee))
      .send({ token: captured.get(target) }).expect(404);
  });

  it("allows different companies to invite the same email without crossing tenants", async () => {
    const address = email("shared");
    await invite(owner, address, companyA).expect(201);
    await invite(otherOwner, address, companyB).expect(201);
    const a = await request(app.getHttpServer()).get(companyInvites(companyA)).set(bearer(owner)).expect(200);
    const b = await request(app.getHttpServer()).get(companyInvites(companyB)).set(bearer(otherOwner)).expect(200);
    expect(a.body.some((r: { companyId: string; emailNormalized: string }) =>
      r.companyId === companyB && r.emailNormalized === address)).toBe(false);
    expect(b.body.some((r: { companyId: string; emailNormalized: string }) =>
      r.companyId === companyA && r.emailNormalized === address)).toBe(false);
  });

  it("refuses existing membership, including its inactive state", async () => {
    await invite(owner, viewer.email).expect(409);
    const membership = await prisma.companyMember.findUniqueOrThrow({ where: {
      companyId_userId: { companyId: companyA, userId: viewer.id },
    } });
    await prisma.companyMember.update({ where: { id: membership.id }, data: { status: "INACTIVE" } });
    try { await invite(owner, viewer.email).expect(409); }
    finally { await prisma.companyMember.update({ where: { id: membership.id }, data: { status: "ACTIVE" } }); }
  });

  it("rejects suspended companies, expires old tokens, and permits a fresh invitation", async () => {
    await prisma.company.update({ where: { id: companyA }, data: { status: "SUSPENDED" } });
    try { await invite(owner, email("suspended")).expect(403); }
    finally { await prisma.company.update({ where: { id: companyA }, data: { status: "ACTIVE" } }); }
    const address = recipient2.email;
    const first = await invite(owner, address).expect(201);
    // Backdate both timestamps while preserving the DB invariant expiresAt > createdAt.
    const clock = Date.now();
    await prisma.companyInvitation.update({ where: { id: first.body.id },
      data: { createdAt: new Date(clock - 120_000), expiresAt: new Date(clock - 60_000) } });
    const oldSecret = captured.get(address)!;
    await request(app.getHttpServer()).post(ACCEPT).set(bearer(recipient2))
      .send({ token: oldSecret }).expect(410);
    const list = await request(app.getHttpServer()).get(companyInvites(companyA))
      .set(bearer(owner)).expect(200);
    expect(list.body.find((r: { id: string }) => r.id === first.body.id)?.status).toBe("EXPIRED");
    await invite(owner, address).expect(201);
    const original = await prisma.companyInvitation.findUniqueOrThrow({ where: { id: first.body.id } });
    expect(original.status).toBe("EXPIRED");
  });

  it("serializes two simultaneous invitations for a shared company/email", async () => {
    const address = email("concurrent-create");
    const [a, b] = await Promise.all([invite(owner, address), invite(admin, address)]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await prisma.companyInvitation.count({
      where: { companyId: companyA, emailNormalized: address, status: "PENDING" },
    })).toBe(1);
  });

  it("serializes simultaneous acceptance and creates exactly one membership", async () => {
    const address = recipient2.email;
    // Earlier test created a PENDING invite to this user: use its newest secret.
    const secret = captured.get(address)!;
    const [a, b] = await Promise.all([
      request(app.getHttpServer()).post(ACCEPT).set(bearer(recipient2)).send({ token: secret }),
      request(app.getHttpServer()).post(ACCEPT).set(bearer(recipient2)).send({ token: secret }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 404]);
    expect(await prisma.companyMember.count({ where: { companyId: companyA, userId: recipient2.id } })).toBe(1);
  });

  it("revokes an undeliverable invitation when an injected transport fails", async () => {
    failDelivery = true;
    const address = email("transport-failed");
    try { await invite(owner, address).expect(503); }
    finally { failDelivery = false; }
    expect(await prisma.companyInvitation.count({
      where: { companyId: companyA, emailNormalized: address, status: "PENDING" },
    })).toBe(0);
    expect(await prisma.companyInvitation.count({
      where: { companyId: companyA, emailNormalized: address, status: "REVOKED" },
    })).toBe(1);
  });


  function repositoryWithFailedAudit() {
    const faultyClient = {
      // accept() looks up the invitation before beginning its transaction.
      companyInvitation: prisma.companyInvitation,
      $transaction: <T>(
        operation: (tx: Prisma.TransactionClient) => Promise<T>,
        options?: { maxWait?: number; timeout?: number },
      ): Promise<T> => prisma.$transaction((tx) => operation(new Proxy(tx, {
        get(target, prop) {
          if (prop === "auditLog") {
            return new Proxy(target.auditLog, {
              get(delegate, method) {
                if (method === "create") {
                  return async () => { throw new Error("PHASE43C_AUDIT_FAILURE"); };
                }
                return Reflect.get(delegate, method);
              },
            });
          }
          return Reflect.get(target, prop);
        },
      })), options),
    } as unknown as PrismaService;
    return new CompanyInvitationsRepository(faultyClient);
  }

  it("rechecks company.member.invite when repository is called without HTTP guard", async () => {
    const repo = app.get(CompanyInvitationsRepository);
    const address = email("repo-viewer-denied");
    await expect(repo.create({
      companyId: companyA, actorUserId: viewer.id, email: address,
      tokenHash: createHash("sha256").update(randomUUID()).digest("hex"),
      expiresAt: new Date(Date.now() + 3600_000),
    })).rejects.toMatchObject({ status: 403 });
    expect(await prisma.companyInvitation.count({ where: { companyId: companyA, emailNormalized: address } })).toBe(0);
  });

  it("rolls back invitation creation if AuditLog fails inside transaction", async () => {
    const repo = repositoryWithFailedAudit();
    const address = email("rollback-create");
    await expect(repo.create({
      companyId: companyA, actorUserId: owner.id, email: address,
      tokenHash: createHash("sha256").update(randomUUID()).digest("hex"),
      expiresAt: new Date(Date.now() + 3600_000),
    })).rejects.toThrow("PHASE43C_AUDIT_FAILURE");
    expect(await prisma.companyInvitation.count({ where: { companyId: companyA, emailNormalized: address } })).toBe(0);
  });

  it("rolls back membership, role assignment and acceptance when AuditLog fails", async () => {
    const newRecipient = await createUser("rollback-accept");
    const response = await invite(owner, newRecipient.email).expect(201);
    const raw = captured.get(newRecipient.email)!;
    const hash = createHash("sha256").update(raw).digest("hex");
    const repo = repositoryWithFailedAudit();
    await expect(repo.accept(newRecipient.id, hash)).rejects.toThrow("PHASE43C_AUDIT_FAILURE");
    expect(await prisma.companyMember.count({ where: {
      companyId: companyA, userId: newRecipient.id,
    } })).toBe(0);
    const invitation = await prisma.companyInvitation.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(invitation.status).toBe("PENDING");
    expect(invitation.acceptedAt).toBeNull();
  });

  it("records audited events without any raw invitation secrets", async () => {
    const logs = await prisma.auditLog.findMany({
      where: { companyId: companyA, action: { startsWith: "company.invitation." } },
    });
    for (const log of logs) {
      const serialized = JSON.stringify(log);
      for (const token of captured.values()) expect(serialized).not.toContain(token);
    }
    expect(logs.some((l) => l.action === "company.invitation.create")).toBe(true);
    expect(logs.some((l) => l.action === "company.invitation.accept")).toBe(true);
    expect(logs.some((l) => l.action === "company.invitation.revoke")).toBe(true);
  });
});
