import "reflect-metadata";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { ApiExceptionFilter } from "../src/common/exceptions/api-exception.filter";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { CompanyInvitationsRepository } from "../src/modules/company/company-invitations.repository";
import type { Prisma } from "../src/generated/prisma/client";
import { TokenService } from "../src/modules/auth/services/token.service";
import { CompanyInvitationDeliveryService } from "../src/modules/company/company-invitation-delivery.service";
import { EmailCryptoService } from "../src/infrastructure/email/email-crypto.service";
import { EmailDeliverySettings } from "../src/infrastructure/email/email-delivery-settings.service";
import { EmailOutboxRepository } from "../src/infrastructure/email/email-outbox.repository";
import { EmailVerificationService } from "../src/modules/auth/email-verification/email-verification.service";
import { EmailProviderService } from "../src/infrastructure/email/email-provider.service";
import { validateEnvironment } from "../src/config/env.validation";

const BASE = "/api/v1/companies";
const ACCEPT = "/api/v1/company-invitations/accept";
const PREFIX = `phase43c-${randomUUID().slice(0, 8)}`;
const DOMAIN = "@phase43c.test";
type User = { id: string; token: string; email: string };

describe("Phase 4.3C.2D Company Invitations enqueue (local findwork_test ONLY)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;
  let crypto: EmailCryptoService;
  let delivery: CompanyInvitationDeliveryService;
  let outboxRepo: EmailOutboxRepository;
  let invitationsRepo: CompanyInvitationsRepository;
  let owner: User;
  let otherOwner: User;
  let admin: User;
  let hr: User;
  let viewer: User;
  let recipient: User;
  let recipient2: User;
  let companyA: string;
  let companyB: string;
  const users: string[] = [];
  const captured = new Map<string, string>();
  const testConfig: Record<string, unknown> = validateEnvironment({
    NODE_ENV: "test", DATABASE_URL: "postgresql://test:test@localhost:5432/findwork_test",
    JWT_ACCESS_SECRET: "invitation-test-jwt-secret-long-enough",
    REFRESH_TOKEN_PEPPER: "invitation-test-refresh-pepper-long-enough",
    EMAIL_DELIVERY_MODE: "resend", EMAIL_ACTIVE_KEY_ID: "invite-test-key",
    EMAIL_KEYRING_JSON: JSON.stringify({ "invite-test-key": randomBytes(32).toString("base64") }),
    EMAIL_VERIFY_URL: "https://example.invalid/verify-email",
    EMAIL_INVITATION_DELIVERY_ENABLED: "true",
    EMAIL_INVITATION_URL: "http://localhost:5173/company-invitations/accept",
    EMAIL_FROM: "test@example.invalid", EMAIL_RESEND_API_KEY: "fake-test-only-not-used",
  });
  const settings = new EmailDeliverySettings({
    get: (key: string, fallback?: unknown) => testConfig[key] ?? fallback,
  } as unknown as ConfigService);

  const companyInvites = (id: string) => `${BASE}/${id}/invitations`;
  const bearer = (u: User) => ({ Authorization: `Bearer ${u.token}` });
  const email = (label: string) => `${PREFIX}-${label}${DOMAIN}`;

  beforeAll(async () => {
    // Real enqueue and crypto, fake configuration, and no provider or worker calls.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailDeliverySettings).useValue(settings)
      .overrideProvider(EmailProviderService).useValue({
        sendVerification() { throw new Error("NO_TEST_NETWORK"); },
      })
      .compile();
    app = moduleRef.createNestApplication();
    const config = app.get(ConfigService);
    const databaseUrl = new URL(config.getOrThrow<string>("DATABASE_URL"));
    const database = decodeURIComponent(databaseUrl.pathname.slice(1));
    if (database !== "findwork_test" || !["localhost", "127.0.0.1", "[::1]"].includes(databaseUrl.hostname) ||
        (databaseUrl.searchParams.has("schema") && databaseUrl.searchParams.get("schema") !== "public")) {
      throw new Error("REFUSING company invitation tests outside local findwork_test");
    }
    app.use(cookieParser());
    app.setGlobalPrefix(config.getOrThrow<string>("API_PREFIX"));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    tokenService = app.get(TokenService);
    crypto = app.get(EmailCryptoService);
    delivery = app.get(CompanyInvitationDeliveryService);
    outboxRepo = app.get(EmailOutboxRepository);
    invitationsRepo = app.get(CompanyInvitationsRepository);
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
      await prisma.emailOutbox.deleteMany({ where: { companyInvitation: { companyId: { in: ids } } } });
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

  async function secretFor(address: string, invitationId?: string): Promise<string> {
    const invitation = invitationId
      ? await prisma.companyInvitation.findUniqueOrThrow({ where: { id: invitationId } })
      : await prisma.companyInvitation.findFirstOrThrow({
        where: { emailNormalized: address }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
    expect(invitation.emailNormalized).toBe(address);
    const job = await prisma.emailOutbox.findFirstOrThrow({ where: { companyInvitationId: invitation.id } });
    const payload = crypto.decrypt(job.id, job.kind, invitation.id, {
      payloadCiphertext: Buffer.from(job.payloadCiphertext ?? []),
      payloadNonce: Buffer.from(job.payloadNonce ?? []),
      payloadTag: Buffer.from(job.payloadTag ?? []),
      encryptionKeyId: job.encryptionKeyId!,
    }) as { rawToken: string };
    captured.set(address, payload.rawToken);
    return payload.rawToken;
  }

  async function jobFor(invitationId: string) {
    return prisma.emailOutbox.findFirstOrThrow({ where: {
      kind: "COMPANY_INVITATION", companyInvitationId: invitationId,
    } });
  }

  async function expectCancelled(invitationId: string) {
    const job = await jobFor(invitationId);
    expect(job.status).toBe("CANCELLED");
    expect(job.cancelledAt).not.toBeNull();
    expect(job.claimedBy).toBeNull();
    expect(job.leaseUntil).toBeNull();
    expect(job.payloadCiphertext).toBeNull();
    expect(job.payloadNonce).toBeNull();
    expect(job.payloadTag).toBeNull();
    expect(job.encryptionKeyId).toBeNull();
    return job;
  }

  it("fails closed when invitation delivery is disabled", async () => {
    const address = email("flag-disabled");
    const previousCreateAudits = await prisma.auditLog.count({ where: {
      companyId: companyA, action: "company.invitation.create",
    } });
    testConfig.EMAIL_INVITATION_DELIVERY_ENABLED = "false";
    try {
      expect(() => settings.assertCanQueueInvitation()).toThrow();
      expect(() => settings.assertCanQueue()).not.toThrow();
      await invite(owner, address).expect(503);
    } finally {
      testConfig.EMAIL_INVITATION_DELIVERY_ENABLED = "true";
    }
    expect(await prisma.companyInvitation.count({ where: { companyId: companyA, emailNormalized: address } })).toBe(0);
    expect(await prisma.emailOutbox.count({ where: { companyInvitation: { emailNormalized: address } } })).toBe(0);
    expect(await prisma.auditLog.count({ where: {
      companyId: companyA, action: "company.invitation.create",
    } })).toBe(previousCreateAudits);
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
      const secret = await secretFor(target);
      expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const persisted = await prisma.companyInvitation.findUniqueOrThrow({ where: { id: result.body.id } });
      const ttl = await prisma.$queryRaw<Array<{ seconds: number; fromNow: number }>>`
        SELECT EXTRACT(EPOCH FROM ("expiresAt" - "createdAt"))::double precision AS seconds,
          EXTRACT(EPOCH FROM ("expiresAt" - NOW()))::double precision AS "fromNow"
        FROM "CompanyInvitation" WHERE "id" = ${persisted.id}::uuid
      `;
      expect(ttl[0]!.seconds).toBeGreaterThan(7 * 24 * 3600 - 10);
      expect(ttl[0]!.seconds).toBeLessThan(7 * 24 * 3600 + 10);
      expect(ttl[0]!.fromNow).toBeGreaterThan(7 * 24 * 3600 - 10);
      expect(ttl[0]!.fromNow).toBeLessThan(7 * 24 * 3600 + 10);
      expect(persisted.tokenHash).toBe(createHash("sha256").update(secret!).digest("hex"));
      expect(persisted.tokenHash).not.toBe(secret);
      const jobs = await prisma.emailOutbox.findMany({ where: { companyInvitationId: persisted.id } });
      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toMatchObject({ kind: "COMPANY_INVITATION", status: "QUEUED",
        idempotencyKey: `invite:${persisted.id}`, verificationTokenId: null });
      expect(Buffer.from(jobs[0]!.payloadCiphertext ?? []).toString("utf8")).not.toContain(secret!);
      expect(JSON.stringify({ ...jobs[0], payloadCiphertext: undefined })).not.toContain(secret!);
      expect(() => crypto.decrypt(randomUUID(), "COMPANY_INVITATION", persisted.id, {
        payloadCiphertext: Buffer.from(jobs[0]!.payloadCiphertext ?? []),
        payloadNonce: Buffer.from(jobs[0]!.payloadNonce ?? []),
        payloadTag: Buffer.from(jobs[0]!.payloadTag ?? []),
        encryptionKeyId: jobs[0]!.encryptionKeyId!,
      })).toThrow();
      expect(() => crypto.decrypt(jobs[0]!.id, "VERIFY_EMAIL", persisted.id, {
        payloadCiphertext: Buffer.from(jobs[0]!.payloadCiphertext ?? []),
        payloadNonce: Buffer.from(jobs[0]!.payloadNonce ?? []),
        payloadTag: Buffer.from(jobs[0]!.payloadTag ?? []),
        encryptionKeyId: jobs[0]!.encryptionKeyId!,
      })).toThrow();
      expect(() => crypto.decrypt(jobs[0]!.id, "COMPANY_INVITATION", randomUUID(), {
        payloadCiphertext: Buffer.from(jobs[0]!.payloadCiphertext ?? []),
        payloadNonce: Buffer.from(jobs[0]!.payloadNonce ?? []),
        payloadTag: Buffer.from(jobs[0]!.payloadTag ?? []),
        encryptionKeyId: jobs[0]!.encryptionKeyId!,
      })).toThrow();
      expect(await prisma.auditLog.count({ where: { companyId: companyA,
        action: "company.invitation.create", targetId: persisted.id } })).toBe(1);
    }
    const list = await request(app.getHttpServer()).get(companyInvites(companyA))
      .set(bearer(hr)).expect(200);
    expect(list.body.some((r: { emailNormalized: string }) => r.emailNormalized === email("allowed-owner"))).toBe(true);
    for (const entry of list.body) {
      expect(entry).not.toHaveProperty("token");
      expect(entry).not.toHaveProperty("tokenHash");
    }
  });

  it("uses PostgreSQL time for seven-day TTL despite a skewed Node clock", async () => {
    const dbNow = (await prisma.$queryRaw<Array<{ millis: number }>>`
      SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::double precision AS millis
    `)[0]!.millis;
    for (const [label, skew] of [["ahead", 14], ["behind", -14]] as const) {
      const nowSpy = jest.spyOn(Date, "now").mockReturnValue(dbNow + skew * 24 * 3600_000);
      let invitation: { id: string };
      try {
        invitation = await invitationsRepo.create({
          companyId: companyA, actorUserId: owner.id, email: email(`ttl-${label}`),
          rawToken: randomBytes(32).toString("base64url"),
          ttlMilliseconds: 7 * 24 * 3600_000,
        }, (tx, input) => delivery.enqueue(tx, input));
      } finally { nowSpy.mockRestore(); }
      const ttl = await prisma.$queryRaw<Array<{ seconds: number }>>`
        SELECT EXTRACT(EPOCH FROM ("expiresAt" - NOW()))::double precision AS seconds
        FROM "CompanyInvitation" WHERE "id" = ${invitation!.id}::uuid
      `;
      expect(ttl[0]!.seconds).toBeGreaterThan(7 * 24 * 3600 - 10);
      expect(ttl[0]!.seconds).toBeLessThan(7 * 24 * 3600 + 10);
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

  it("uses PostgreSQL time for an unexpired direct denial when Node is ahead", async () => {
    const member = await prisma.companyMember.findUniqueOrThrow({ where: {
      companyId_userId: { companyId: companyA, userId: hr.id },
    } });
    const permission = await prisma.permission.findUniqueOrThrow({ where: { code: "company.member.invite" } });
    await prisma.companyMemberPermission.create({ data: {
      companyId: companyA, companyMemberId: member.id,
      permissionId: permission.id, effect: "DENY", dataScope: null, assignedByUserId: owner.id,
    } });
    try {
      await prisma.$executeRaw`
        UPDATE "CompanyMemberPermission" SET "expiresAt" = NOW() + INTERVAL '1 hour'
        WHERE "companyMemberId" = ${member.id}::uuid AND "permissionId" = ${permission.id}::uuid
      `;
      const actualNow = Date.now();
      jest.useFakeTimers({ doNotFake: ["setTimeout", "clearTimeout", "setImmediate", "clearImmediate", "nextTick"] });
      jest.setSystemTime(new Date(actualNow + 2 * 3_600_000));
      try {
        await expect(invitationsRepo.create({
          companyId: companyA, actorUserId: hr.id, email: email("clock-ahead-denial"),
          rawToken: randomBytes(32).toString("base64url"), ttlMilliseconds: 3_600_000,
        }, (tx, input) => delivery.enqueue(tx, input))).rejects.toMatchObject({ status: 403 });
      } finally {
        jest.useRealTimers();
      }
    } finally {
      await prisma.companyMemberPermission.delete({ where: {
        companyMemberId_permissionId: { companyMemberId: member.id, permissionId: permission.id },
      } });
    }
  });

  it("allows the invited account only, assigns safe VIEWER and cannot reuse token", async () => {
    await invite(owner, recipient.email).expect(201);
    const invitation = await prisma.companyInvitation.findFirstOrThrow({
      where: { companyId: companyA, emailNormalized: recipient.email },
    });
    const secret = await secretFor(recipient.email, invitation.id);
    // Turning off future enqueue must not invalidate an already-issued token.
    testConfig.EMAIL_INVITATION_DELIVERY_ENABLED = "false";
    let accepted: request.Response;
    try {
      await request(app.getHttpServer()).post(ACCEPT).set(bearer(recipient2))
        .send({ token: secret }).expect(403);
      accepted = await request(app.getHttpServer()).post(ACCEPT).set(bearer(recipient))
        .send({ token: secret }).expect(201);
    } finally {
      testConfig.EMAIL_INVITATION_DELIVERY_ENABLED = "true";
    }
    expect(accepted.body).toMatchObject({ companyId: companyA, role: "VIEWER" });
    const membership = await prisma.companyMember.findUniqueOrThrow({ where: {
      companyId_userId: { companyId: companyA, userId: recipient.id },
    }, include: { roles: { include: { role: true } } } });
    expect(membership.isOwner).toBe(false);
    expect(membership.roles.map((r) => r.role.name)).toEqual(["VIEWER"]);
    await expectCancelled(invitation.id);
    await request(app.getHttpServer()).post(ACCEPT).set(bearer(recipient))
      .send({ token: secret }).expect(404);
  });

  it("revokes a pending token, refuses cross-company revoke and never accepts revoked token", async () => {
    const target = email("revoke");
    const r = await invite(owner, target).expect(201);
    const secret = await secretFor(target, r.body.id);
    const revoke = (companyId: string) => `${companyInvites(companyId)}/${r.body.id}/revoke`;
    await request(app.getHttpServer()).post(revoke(companyB)).set(bearer(otherOwner)).expect(404);
    await request(app.getHttpServer()).post(revoke(companyA)).set(bearer(viewer)).expect(403);
    await request(app.getHttpServer()).post(revoke(companyA)).set(bearer(owner)).expect(201);
    await request(app.getHttpServer()).post(revoke(companyA)).set(bearer(owner)).expect(201);
    await expectCancelled(r.body.id);
    expect(await prisma.auditLog.count({ where: { companyId: companyA,
      action: "company.invitation.revoke", targetId: r.body.id } })).toBe(1);
    const invitee = await createUser("revoke");
    // The email used for this invitation is deliberately NOT registered, so even with the secret it cannot be accepted.
    await request(app.getHttpServer()).post(ACCEPT).set(bearer(invitee))
      .send({ token: secret }).expect(404);
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
    const oldSecret = await secretFor(address, first.body.id);
    await request(app.getHttpServer()).post(ACCEPT).set(bearer(recipient2))
      .send({ token: oldSecret }).expect(410);
    const list = await request(app.getHttpServer()).get(companyInvites(companyA))
      .set(bearer(owner)).expect(200);
    expect(list.body.find((r: { id: string }) => r.id === first.body.id)?.status).toBe("EXPIRED");
    await invite(owner, address).expect(201);
    const original = await prisma.companyInvitation.findUniqueOrThrow({ where: { id: first.body.id } });
    expect(original.status).toBe("EXPIRED");
    await expectCancelled(first.body.id);
  });

  it("serializes two simultaneous invitations for a shared company/email", async () => {
    const address = email("concurrent-create");
    let signalEntered!: () => void;
    let releaseEnqueue!: () => void;
    const entered = new Promise<void>((resolve) => { signalEntered = resolve; });
    const held = new Promise<void>((resolve) => { releaseEnqueue = resolve; });
    const realEnqueue = delivery.enqueue.bind(delivery);
    const delayed = jest.spyOn(delivery, "enqueue").mockImplementationOnce(async (tx, input) => {
      signalEntered();
      await held;
      await realEnqueue(tx, input);
    });
    let signalSecondLock!: () => void;
    const secondLockStarted = new Promise<void>((resolve) => { signalSecondLock = resolve; });
    const lockTarget = invitationsRepo as unknown as {
      lockCompany: (tx: Prisma.TransactionClient, id: string, active?: boolean) => Promise<void>;
    };
    const realLock = lockTarget.lockCompany.bind(invitationsRepo);
    let lockCalls = 0;
    const observedLock = jest.spyOn(lockTarget, "lockCompany").mockImplementation((tx, id, active) => {
      const locking = realLock(tx, id, active);
      if (++lockCalls === 2) signalSecondLock();
      return locking;
    });
    let a: request.Response;
    let b: request.Response;
    try {
      // First request holds the Company lock while the second begins.
      const first = invite(owner, address).then((response) => response);
      await entered;
      const second = invite(admin, address).then((response) => response);
      await secondLockStarted;
      releaseEnqueue();
      [a, b] = await Promise.all([first, second]);
    } finally {
      releaseEnqueue();
      delayed.mockRestore();
      observedLock.mockRestore();
    }
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const pending = await prisma.companyInvitation.findMany({
      where: { companyId: companyA, emailNormalized: address, status: "PENDING" },
    });
    expect(pending).toHaveLength(1);
    const jobs = await prisma.emailOutbox.findMany({ where: { companyInvitationId: pending[0]!.id } });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ kind: "COMPANY_INVITATION", status: "QUEUED",
      idempotencyKey: `invite:${pending[0]!.id}` });
    const secret = await secretFor(address, pending[0]!.id);
    expect(pending[0]!.tokenHash).toBe(createHash("sha256").update(secret).digest("hex"));
    expect(Buffer.from(jobs[0]!.payloadCiphertext ?? []).toString("utf8")).not.toContain(secret);
    expect(await prisma.auditLog.count({ where: { companyId: companyA,
      action: "company.invitation.create", targetId: pending[0]!.id } })).toBe(1);
  });

  it("rolls back an old expiry transition and its audit when replacement enqueue fails", async () => {
    const address = email("expired-rollback");
    const old = await invite(owner, address).expect(201);
    const now = Date.now();
    await prisma.companyInvitation.update({ where: { id: old.body.id }, data: {
      createdAt: new Date(now - 120_000), expiresAt: new Date(now - 60_000),
    } });
    const previousExpiryAudits = await prisma.auditLog.count({ where: {
      companyId: companyA, action: "company.invitation.expire", targetId: old.body.id,
    } });
    const failed = jest.spyOn(delivery, "enqueue").mockRejectedValueOnce(new Error("INJECTED_ENQUEUE_FAILURE"));
    try { await invite(owner, address).expect(500); }
    finally { failed.mockRestore(); }
    expect((await prisma.companyInvitation.findUniqueOrThrow({ where: { id: old.body.id } })).status).toBe("PENDING");
    expect(await prisma.companyInvitation.count({ where: { companyId: companyA, emailNormalized: address } })).toBe(1);
    const jobs = await prisma.emailOutbox.findMany({ where: { companyInvitationId: old.body.id } });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.status).toBe("QUEUED");
    expect(await prisma.auditLog.count({ where: { companyId: companyA,
      action: "company.invitation.expire", targetId: old.body.id } })).toBe(previousExpiryAudits);
    const secret = await secretFor(address, old.body.id);
    expect(Buffer.from(jobs[0]!.payloadCiphertext ?? []).toString("utf8")).not.toContain(secret);
  });

  it("expires retry-delayed and leased jobs in bounded concurrent cleanup without duplicate audits", async () => {
    await invitationsRepo.cleanupExpired(25);
    const ids: string[] = [];
    for (const label of ["expiry-retry", "expiry-lease-active", "expiry-lease-expired"]) {
      const response = await invite(owner, email(label)).expect(201);
      ids.push(response.body.id);
      const now = Date.now();
      await prisma.companyInvitation.update({ where: { id: response.body.id }, data: {
        createdAt: new Date(now - 120_000), expiresAt: new Date(now - 60_000),
      } });
    }
    await prisma.emailOutbox.update({ where: { id: (await jobFor(ids[0]!)).id }, data: {
      nextAttemptAt: new Date(Date.now() + 86_400_000),
    } });
    for (const [id, lease] of [[ids[1]!, 60_000], [ids[2]!, -60_000]] as const) {
      await prisma.emailOutbox.update({ where: { id: (await jobFor(id)).id }, data: {
        status: "PROCESSING", claimedBy: randomUUID(), attemptCount: 1,
        leaseUntil: new Date(Date.now() + lease),
      } });
    }
    // Separate maintenance instances can see the same candidate. Company locks serialize the transition.
    const secondMaintenance = new CompanyInvitationsRepository(prisma, outboxRepo);
    await Promise.all([invitationsRepo.cleanupExpired(1), secondMaintenance.cleanupExpired(1)]);
    for (let remaining = 0; remaining < 5; remaining++) {
      if (await invitationsRepo.cleanupExpired(1) === 0) break;
    }
    for (const id of ids) {
      expect((await prisma.companyInvitation.findUniqueOrThrow({ where: { id } })).status).toBe("EXPIRED");
      await expectCancelled(id);
      const cancellation = await prisma.$queryRaw<Array<{ seconds: number }>>`
        SELECT ABS(EXTRACT(EPOCH FROM ("cancelledAt" - NOW())))::double precision AS seconds
        FROM "EmailOutbox" WHERE "companyInvitationId" = ${id}::uuid
      `;
      expect(cancellation[0]!.seconds).toBeLessThan(10);
      expect(await prisma.auditLog.count({ where: { companyId: companyA,
        action: "company.invitation.expire", targetId: id } })).toBe(1);
    }
    expect(await invitationsRepo.cleanupExpired(25)).toBe(0);
  });

  it("scrubs stale active jobs of already terminal invitations without repeating lifecycle audits", async () => {
    const states = ["REVOKED", "ACCEPTED", "EXPIRED"] as const;
    const ids: string[] = [];
    for (const state of states) {
      const targetUser = state === "ACCEPTED" ? await createUser("stale-accepted") : null;
      const address = targetUser?.email ?? email(`stale-${state.toLowerCase()}`);
      const response = await invite(owner, address).expect(201);
      const id = response.body.id as string;
      ids.push(id);
      const original = await jobFor(id);
      if (state === "REVOKED") {
        await request(app.getHttpServer()).post(`${companyInvites(companyA)}/${id}/revoke`)
          .set(bearer(owner)).expect(201);
      } else if (state === "ACCEPTED") {
        const secret = await secretFor(address, id);
        await request(app.getHttpServer()).post(ACCEPT).set(bearer(targetUser!))
          .send({ token: secret }).expect(201);
      } else {
        const now = Date.now();
        await prisma.companyInvitation.update({ where: { id }, data: {
          createdAt: new Date(now - 120_000), expiresAt: new Date(now - 60_000),
        } });
        await invitationsRepo.cleanupExpired(25);
      }
      await expectCancelled(id);
      // Simulate a legacy CP1 row whose invitation became terminal before job cancellation existed.
      await prisma.emailOutbox.update({ where: { id: original.id }, data: {
        status: state === "ACCEPTED" ? "PROCESSING" : "QUEUED", cancelledAt: null,
        claimedBy: state === "ACCEPTED" ? randomUUID() : null,
        leaseUntil: state === "ACCEPTED" ? new Date(Date.now() + 60_000) : null,
        attemptCount: state === "ACCEPTED" ? 1 : 0,
        payloadCiphertext: original.payloadCiphertext, payloadNonce: original.payloadNonce,
        payloadTag: original.payloadTag, encryptionKeyId: original.encryptionKeyId,
      } });
    }
    const before = await prisma.auditLog.count({ where: { companyId: companyA,
      action: { in: ["company.invitation.revoke", "company.invitation.accept", "company.invitation.expire"] },
      targetId: { in: ids },
    } });
    await invitationsRepo.cleanupExpired(25);
    for (const id of ids) await expectCancelled(id);
    expect(await prisma.auditLog.count({ where: { companyId: companyA,
      action: { in: ["company.invitation.revoke", "company.invitation.accept", "company.invitation.expire"] },
      targetId: { in: ids },
    } })).toBe(before);
  });

  it("preserves SENT and FAILED jobs while cleaning invitation lifecycle state", async () => {
    const sent = await invite(owner, email("terminal-sent")).expect(201);
    const failed = await invite(owner, email("terminal-failed")).expect(201);
    const sentJob = await jobFor(sent.body.id);
    const failedJob = await jobFor(failed.body.id);
    await prisma.emailOutbox.update({ where: { id: sentJob.id }, data: {
      status: "SENT", sentAt: new Date(), payloadCiphertext: null, payloadNonce: null,
      payloadTag: null, encryptionKeyId: null,
    } });
    await prisma.emailOutbox.update({ where: { id: failedJob.id }, data: {
      status: "FAILED", payloadCiphertext: null, payloadNonce: null,
      payloadTag: null, encryptionKeyId: null,
    } });
    await request(app.getHttpServer()).post(`${companyInvites(companyA)}/${sent.body.id}/revoke`)
      .set(bearer(owner)).expect(201);
    const now = Date.now();
    await prisma.companyInvitation.update({ where: { id: failed.body.id }, data: {
      createdAt: new Date(now - 120_000), expiresAt: new Date(now - 60_000),
    } });
    await invitationsRepo.cleanupExpired(25);
    expect((await jobFor(sent.body.id)).status).toBe("SENT");
    expect((await jobFor(sent.body.id)).cancelledAt).toBeNull();
    expect((await jobFor(failed.body.id)).status).toBe("FAILED");
    expect((await jobFor(failed.body.id)).cancelledAt).toBeNull();
  });

  it("keeps VERIFY_EMAIL outbox rows unchanged during invitation cleanup", async () => {
    const verifyUser = await createUser("verify-isolation");
    const verify = app.get(EmailVerificationService);
    await verify.request(verifyUser.id);
    const token = await prisma.emailVerificationToken.findFirstOrThrow({ where: { userId: verifyUser.id } });
    const job = await prisma.emailOutbox.findFirstOrThrow({ where: { verificationTokenId: token.id } });
    try {
      await invitationsRepo.cleanupExpired(25);
      const after = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: job.id } });
      expect(after.kind).toBe("VERIFY_EMAIL");
      expect(after.status).toBe("QUEUED");
      expect(after.payloadCiphertext).toEqual(job.payloadCiphertext);
    } finally {
      await prisma.emailOutbox.delete({ where: { id: job.id } });
      await prisma.emailVerificationToken.delete({ where: { id: token.id } });
    }
  });

  it("serializes simultaneous acceptance and creates exactly one membership", async () => {
    const address = recipient2.email;
    // Earlier test created a PENDING invite to this user: use its newest secret.
    const secret = await secretFor(address);
    const [a, b] = await Promise.all([
      request(app.getHttpServer()).post(ACCEPT).set(bearer(recipient2)).send({ token: secret }),
      request(app.getHttpServer()).post(ACCEPT).set(bearer(recipient2)).send({ token: secret }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 404]);
    expect(await prisma.companyMember.count({ where: { companyId: companyA, userId: recipient2.id } })).toBe(1);
  });

  it("rolls back the invitation when encrypted enqueue fails", async () => {
    const address = email("enqueue-failed");
    const priorAudits = await prisma.auditLog.count({ where: { companyId: companyA, action: "company.invitation.create" } });
    let attemptedInvitationId: string | undefined;
    const failed = jest.spyOn(delivery, "enqueue").mockImplementationOnce(async (_tx, input) => {
      attemptedInvitationId = input.invitationId;
      throw new Error("INJECTED_ENQUEUE_FAILURE");
    });
    try { await invite(owner, address).expect(500); }
    finally { failed.mockRestore(); }
    expect(await prisma.companyInvitation.count({
      where: { companyId: companyA, emailNormalized: address, status: "PENDING" },
    })).toBe(0);
    expect(await prisma.companyInvitation.count({ where: { companyId: companyA, emailNormalized: address } })).toBe(0);
    expect(attemptedInvitationId).toBeDefined();
    expect(await prisma.emailOutbox.count({ where: { companyInvitationId: attemptedInvitationId } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { companyId: companyA, action: "company.invitation.create" } })).toBe(priorAudits);
  });


  function repositoryWithFailedAudit() {
    const faultyClient = {
      // accept() looks up the invitation before beginning its transaction.
      companyInvitation: prisma.companyInvitation,
      $queryRaw: prisma.$queryRaw.bind(prisma),
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
    return new CompanyInvitationsRepository(faultyClient, outboxRepo);
  }

  it("rechecks company.member.invite when repository is called without HTTP guard", async () => {
    const repo = app.get(CompanyInvitationsRepository);
    const address = email("repo-viewer-denied");
    await expect(repo.create({
      companyId: companyA, actorUserId: viewer.id, email: address,
      rawToken: randomBytes(32).toString("base64url"),
      ttlMilliseconds: 3600_000,
    }, (tx, input) => delivery.enqueue(tx, input))).rejects.toMatchObject({ status: 403 });
    expect(await prisma.companyInvitation.count({ where: { companyId: companyA, emailNormalized: address } })).toBe(0);
  });

  it("rolls back invitation creation if AuditLog fails inside transaction", async () => {
    const repo = repositoryWithFailedAudit();
    const address = email("rollback-create");
    const priorAudits = await prisma.auditLog.count({ where: { companyId: companyA, action: "company.invitation.create" } });
    let attemptedInvitationId: string | undefined;
    await expect(repo.create({
      companyId: companyA, actorUserId: owner.id, email: address,
      rawToken: randomBytes(32).toString("base64url"),
      ttlMilliseconds: 3600_000,
    }, async (tx, input) => {
      attemptedInvitationId = input.invitationId;
      await delivery.enqueue(tx, input);
    })).rejects.toThrow("PHASE43C_AUDIT_FAILURE");
    expect(await prisma.companyInvitation.count({ where: { companyId: companyA, emailNormalized: address } })).toBe(0);
    expect(attemptedInvitationId).toBeDefined();
    expect(await prisma.emailOutbox.count({ where: { companyInvitationId: attemptedInvitationId } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { companyId: companyA, action: "company.invitation.create" } })).toBe(priorAudits);
  });

  it("rolls back membership, role assignment and acceptance when AuditLog fails", async () => {
    const newRecipient = await createUser("rollback-accept");
    const response = await invite(owner, newRecipient.email).expect(201);
    const raw = await secretFor(newRecipient.email);
    const hash = createHash("sha256").update(raw).digest("hex");
    const repo = repositoryWithFailedAudit();
    await expect(repo.accept(newRecipient.id, hash)).rejects.toThrow("PHASE43C_AUDIT_FAILURE");
    expect(await prisma.companyMember.count({ where: {
      companyId: companyA, userId: newRecipient.id,
    } })).toBe(0);
    const invitation = await prisma.companyInvitation.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(invitation.status).toBe("PENDING");
    expect(invitation.acceptedAt).toBeNull();
    expect((await jobFor(response.body.id)).status).toBe("QUEUED");
    expect((await jobFor(response.body.id)).payloadCiphertext).not.toBeNull();
  });

  it("rolls back revocation and job cancellation together when audit insertion fails", async () => {
    const response = await invite(owner, email("rollback-revoke")).expect(201);
    const before = await jobFor(response.body.id);
    const repo = repositoryWithFailedAudit();
    await expect(repo.revoke(companyA, response.body.id, owner.id)).rejects.toThrow("PHASE43C_AUDIT_FAILURE");
    expect((await prisma.companyInvitation.findUniqueOrThrow({ where: { id: response.body.id } })).status)
      .toBe("PENDING");
    const after = await jobFor(response.body.id);
    expect(after.status).toBe("QUEUED");
    expect(after.payloadCiphertext).toEqual(before.payloadCiphertext);
    expect(after.cancelledAt).toBeNull();
  });

  it("rolls back expiration, lease cancellation and audit together on audit failure", async () => {
    await invitationsRepo.cleanupExpired(25);
    const response = await invite(owner, email("rollback-expiry-cleanup")).expect(201);
    const now = Date.now();
    await prisma.companyInvitation.update({ where: { id: response.body.id }, data: {
      createdAt: new Date(now - 120_000), expiresAt: new Date(now - 60_000),
    } });
    const job = await jobFor(response.body.id);
    const ownerId = randomUUID();
    await prisma.emailOutbox.update({ where: { id: job.id }, data: {
      status: "PROCESSING", claimedBy: ownerId,
      leaseUntil: new Date(Date.now() + 60_000), attemptCount: 1,
    } });
    const faulty = repositoryWithFailedAudit();
    await expect(faulty.cleanupExpired(1)).rejects.toThrow("PHASE43C_AUDIT_FAILURE");
    expect((await prisma.companyInvitation.findUniqueOrThrow({ where: { id: response.body.id } })).status)
      .toBe("PENDING");
    const restored = await jobFor(response.body.id);
    expect(restored.status).toBe("PROCESSING");
    expect(restored.claimedBy).toBe(ownerId);
    expect(restored.payloadCiphertext).toEqual(job.payloadCiphertext);
    expect(await prisma.auditLog.count({ where: { companyId: companyA,
      action: "company.invitation.expire", targetId: response.body.id } })).toBe(0);
    await invitationsRepo.cleanupExpired(25);
    await expectCancelled(response.body.id);
  });

  it("serializes revoke against accept and never recreates a cancelled claim", async () => {
    const invitee = await createUser("race-revoke-accept");
    const response = await invite(owner, invitee.email).expect(201);
    const secret = await secretFor(invitee.email, response.body.id);
    const job = await jobFor(response.body.id);
    await prisma.emailOutbox.update({ where: { id: job.id }, data: {
      status: "PROCESSING", claimedBy: randomUUID(),
      leaseUntil: new Date(Date.now() + 60_000), attemptCount: 1,
    } });
    let signalEntered!: () => void;
    let releaseCancel!: () => void;
    const entered = new Promise<void>((resolve) => { signalEntered = resolve; });
    const held = new Promise<void>((resolve) => { releaseCancel = resolve; });
    const realCancel = outboxRepo.cancelInvitationJobs.bind(outboxRepo);
    const delayed = jest.spyOn(outboxRepo, "cancelInvitationJobs").mockImplementationOnce(async (tx, id, reason) => {
      signalEntered();
      await held;
      return realCancel(tx, id, reason);
    });
    let signalSecondLock!: () => void;
    const secondLockStarted = new Promise<void>((resolve) => { signalSecondLock = resolve; });
    const lockTarget = invitationsRepo as unknown as {
      lockCompany: (tx: Prisma.TransactionClient, id: string, active?: boolean) => Promise<void>;
    };
    const realLock = lockTarget.lockCompany.bind(invitationsRepo);
    let lockCalls = 0;
    const observedLock = jest.spyOn(lockTarget, "lockCompany").mockImplementation((tx, id, active) => {
      const locking = realLock(tx, id, active);
      if (++lockCalls === 2) signalSecondLock();
      return locking;
    });
    let revoked: request.Response;
    let accepted: request.Response;
    try {
      const first = request(app.getHttpServer())
        .post(`${companyInvites(companyA)}/${response.body.id}/revoke`).set(bearer(owner))
        .then((result) => result);
      await entered;
      const second = request(app.getHttpServer()).post(ACCEPT).set(bearer(invitee))
        .send({ token: secret }).then((result) => result);
      await secondLockStarted;
      releaseCancel();
      [revoked, accepted] = await Promise.all([first, second]);
    } finally {
      releaseCancel();
      delayed.mockRestore();
      observedLock.mockRestore();
    }
    expect(revoked.status).toBe(201);
    expect(accepted.status).toBe(404);
    expect((await prisma.companyInvitation.findUniqueOrThrow({ where: { id: response.body.id } })).status)
      .toBe("REVOKED");
    await expectCancelled(response.body.id);
    expect(await prisma.companyMember.count({ where: { companyId: companyA, userId: invitee.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { companyId: companyA,
      action: "company.invitation.revoke", targetId: response.body.id } })).toBe(1);
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
