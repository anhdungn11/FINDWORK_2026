import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { EmailDeliverySettings } from "../src/infrastructure/email/email-delivery-settings.service";
import { EmailCryptoService } from "../src/infrastructure/email/email-crypto.service";
import { EmailOutboxRepository } from "../src/infrastructure/email/email-outbox.repository";
import { EmailProviderError, EmailProviderService } from "../src/infrastructure/email/email-provider.service";
import { InvitationOutboxRepository, INVITATION_RETRY_HORIZON_MS } from "../src/infrastructure/email/invitation-outbox.repository";
import { InvitationDeliveryWorker } from "../src/infrastructure/email/invitation-delivery.worker";
import { InvitationEmailWorkerModule } from "../src/workers/invitation-email-worker.module";

const prefix = `cp3-${randomUUID().slice(0, 8)}`;
const key = randomBytes(32).toString("base64");
const config: Record<string, string> = {
  NODE_ENV: "test", EMAIL_DELIVERY_MODE: "resend", EMAIL_INVITATION_DELIVERY_ENABLED: "true",
  EMAIL_ACTIVE_KEY_ID: "cp3", EMAIL_KEYRING_JSON: JSON.stringify({ cp3: key }),
  EMAIL_INVITATION_URL: "http://localhost:5173/company-invitations/accept",
  EMAIL_RESEND_API_KEY: "fake-test-only-never-used", EMAIL_FROM: "FINDWORK <invites@example.invalid>",
};
const settings = new EmailDeliverySettings({
  get: (name: string, fallback?: unknown) => config[name] ?? fallback,
} as ConfigService);
const crypto = new EmailCryptoService(settings);

describe("CP3 invitation email worker (local findwork_test only)", () => {
  let prisma: PrismaService;
  let repo: InvitationOutboxRepository;
  let worker: InvitationDeliveryWorker;
  const sendInvitation = jest.fn().mockResolvedValue({ providerMessageId: "mock-provider-id" });
  const provider = { sendInvitation } as unknown as EmailProviderService;
  const userIds: string[] = [];
  const companyIds: string[] = [];

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1" && url.hostname !== "[::1]")
      throw new Error("Refusing nonlocal database");
    if (decodeURIComponent(url.pathname.slice(1)) !== "findwork_test" ||
      (url.searchParams.has("schema") && url.searchParams.get("schema") !== "public"))
      throw new Error("Refusing database other than local findwork_test");
    prisma = new PrismaService(new ConfigService({ DATABASE_URL: process.env.DATABASE_URL }));
    await prisma.$connect();
    repo = new InvitationOutboxRepository(prisma);
    worker = new InvitationDeliveryWorker(repo, crypto, provider, settings);
  });
  afterAll(async () => {
    if (!prisma) return;
    await prisma.emailOutbox.deleteMany({ where: { companyInvitation: { companyId: { in: companyIds } } } });
    await prisma.companyInvitation.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.companyMember.deleteMany({ where: { companyId: { in: companyIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });
  beforeEach(() => { sendInvitation.mockClear(); sendInvitation.mockResolvedValue({ providerMessageId: "mock-provider-id" }); });

  async function fixture(label: string) {
    const userId = randomUUID();
    const companyId = randomUUID();
    const memberId = randomUUID();
    const invitationId = randomUUID();
    const jobId = randomUUID();
    const recipient = `${prefix}-${label}@example.invalid`;
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 3600_000);
    userIds.push(userId);
    companyIds.push(companyId);
    await prisma.user.create({ data: { id: userId, email: recipient, emailNormalized: recipient, passwordHash: "cp3-test" } });
    await prisma.company.create({ data: { id: companyId, createdByUserId: userId,
      name: "CP3 test company", slug: `${prefix}-${label}` } });
    await prisma.companyMember.create({ data: { id: memberId, companyId, userId, status: "ACTIVE" } });
    const payload = { version: 1, recipient, rawToken: token, invitationId,
      expiresAt: expiresAt.toISOString(), invitationBaseUrl: config.EMAIL_INVITATION_URL,
      sender: config.EMAIL_FROM };
    const sealed = crypto.encrypt(jobId, "COMPANY_INVITATION", invitationId, payload);
    await prisma.$transaction(async (tx) => {
      // Match the real enqueue transaction's UTC timestamp contract.
      await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
      await tx.companyInvitation.create({ data: { id: invitationId, companyId, invitedByMemberId: memberId,
        emailNormalized: recipient, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt } });
      await tx.emailOutbox.create({ data: { id: jobId, kind: "COMPANY_INVITATION",
        companyInvitationId: invitationId, idempotencyKey: `invite:${invitationId}`,
        payloadCiphertext: Uint8Array.from(sealed.payloadCiphertext),
        payloadNonce: Uint8Array.from(sealed.payloadNonce), payloadTag: Uint8Array.from(sealed.payloadTag),
        encryptionKeyId: sealed.encryptionKeyId } });
    });
    return { userId, companyId, invitationId, jobId, recipient, expiresAt, token };
  }
  const job = (id: string) => prisma.emailOutbox.findUniqueOrThrow({ where: { id } });
  async function revokeAndCancel(f: { companyId: string; invitationId: string }) {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Company" WHERE "id" = ${f.companyId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "CompanyInvitation" WHERE "id" = ${f.invitationId}::uuid FOR UPDATE`;
      await new EmailOutboxRepository(prisma).cancelInvitationJobs(tx, f.invitationId, "INVITATION_REVOKED");
      await tx.companyInvitation.update({ where: { id: f.invitationId }, data: { status: "REVOKED" } });
    });
  }

  it("keeps the flag off before discovery and provider calls", async () => {
    const f = await fixture("flag");
    config.EMAIL_INVITATION_DELIVERY_ENABLED = "false";
    try { await expect(worker.processOne()).rejects.toThrow("EMAIL_INVITATION_DELIVERY_DISABLED"); }
    finally { config.EMAIL_INVITATION_DELIVERY_ENABLED = "true"; }
    expect((await job(f.jobId)).status).toBe("QUEUED");
    expect(sendInvitation).not.toHaveBeenCalled();
    await prisma.emailOutbox.update({ where: { id: f.jobId }, data: {
      status: "FAILED", payloadCiphertext: null, payloadNonce: null, payloadTag: null, encryptionKeyId: null,
    } });
  });

  it("claims once, sends a fragment URL, and scrubs the token ciphertext", async () => {
    const f = await fixture("send");
    const [first, second] = await Promise.all([repo.claim("owner-a"), repo.claim("owner-b")]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    const claimed = first ?? second!;
    expect(claimed.companyInvitationId).toBe(f.invitationId);
    // Release the test claim through an expired lease so the worker can recover it.
    await prisma.emailOutbox.update({ where: { id: f.jobId }, data: { leaseUntil: new Date(Date.now() - 1000) } });
    await worker.processOne();
    expect(sendInvitation).toHaveBeenCalledTimes(1);
    const request = sendInvitation.mock.calls[0]![0] as { to: string; acceptUrl: string; idempotencyKey: string };
    expect(request.to).toBe(f.recipient);
    expect(request.idempotencyKey).toBe(`invite:${f.invitationId}`);
    expect(new URL(request.acceptUrl).search).toBe("");
    expect(new URL(request.acceptUrl).hash).toBe(`#token=${f.token}`);
    const completed = await job(f.jobId);
    expect(completed.status).toBe("SENT");
    expect(completed.payloadCiphertext).toBeNull();
    expect(JSON.stringify(completed)).not.toContain(f.token);
  });

  it.each(["REVOKED", "ACCEPTED", "EXPIRED"] as const)("rejects %s invitations", async (status) => {
    const f = await fixture(`state-${status.toLowerCase()}`);
    await prisma.companyInvitation.update({ where: { id: f.invitationId }, data: { status } });
    expect(await repo.claim(randomUUID())).toBeNull();
    expect((await job(f.jobId)).status).toBe("CANCELLED");
    expect(sendInvitation).not.toHaveBeenCalled();
  });

  it("rejects expired invitations using PostgreSQL time", async () => {
    const expired = await fixture("expired-time");
    await prisma.$executeRaw`
      UPDATE "CompanyInvitation" SET "createdAt" = NOW() - INTERVAL '2 hours',
        "expiresAt" = NOW() - INTERVAL '1 minute'
      WHERE "id" = ${expired.invitationId}::uuid
    `;
    expect(await repo.claim(randomUUID())).toBeNull();
    expect((await job(expired.jobId)).status).toBe("CANCELLED");
    const cancellation = await prisma.$queryRaw<Array<{ seconds: number }>>`
      SELECT ABS(EXTRACT(EPOCH FROM ("cancelledAt" - NOW())))::double precision AS seconds
      FROM "EmailOutbox" WHERE "id" = ${expired.jobId}::uuid
    `;
    expect(cancellation[0]!.seconds).toBeLessThan(10);
    expect(sendInvitation).not.toHaveBeenCalled();
  });

  it("defers a suspended company without scrubbing and delivers after reactivation", async () => {
    const suspended = await fixture("suspended");
    await prisma.company.update({ where: { id: suspended.companyId }, data: { status: "SUSPENDED" } });
    expect(await repo.claim(randomUUID())).toBeNull();
    const deferred = await job(suspended.jobId);
    expect(deferred.status).toBe("QUEUED");
    expect(deferred.attemptCount).toBe(0);
    expect(deferred.payloadCiphertext).not.toBeNull();
    const due = await prisma.$queryRaw<Array<{ seconds: number }>>`
      SELECT EXTRACT(EPOCH FROM ("nextAttemptAt" - NOW()))::double precision AS seconds
      FROM "EmailOutbox" WHERE "id" = ${suspended.jobId}::uuid
    `;
    expect(due[0]!.seconds).toBeGreaterThan(0);
    expect(due[0]!.seconds).toBeLessThanOrEqual(5 * 60);
    expect(await repo.claim(randomUUID())).toBeNull();
    expect(sendInvitation).not.toHaveBeenCalled();
    await prisma.company.update({ where: { id: suspended.companyId }, data: { status: "ACTIVE" } });
    await prisma.$executeRaw`
      UPDATE "EmailOutbox" SET "nextAttemptAt" = NOW() - INTERVAL '1 second'
      WHERE "id" = ${suspended.jobId}::uuid
    `;
    await worker.processOne();
    expect(sendInvitation).toHaveBeenCalledTimes(1);
    expect((await job(suspended.jobId)).status).toBe("SENT");
  });

  it("rejects corrupted authenticated ciphertext without sending", async () => {
    const f = await fixture("corrupt");
    await prisma.emailOutbox.update({ where: { id: f.jobId }, data: { payloadCiphertext: Uint8Array.from([1, 2, 3]) } });
    await worker.processOne();
    expect((await job(f.jobId)).status).toBe("FAILED");
    expect((await job(f.jobId)).payloadCiphertext).toBeNull();
    expect(sendInvitation).not.toHaveBeenCalled();
  });

  it("keeps an unavailable key job queued and never calls the provider", async () => {
    const f = await fixture("missing-key");
    config.EMAIL_KEYRING_JSON = JSON.stringify({ other: key });
    try { await expect(worker.processOne()).rejects.toThrow(); }
    finally { config.EMAIL_KEYRING_JSON = JSON.stringify({ cp3: key }); }
    expect((await job(f.jobId)).status).toBe("QUEUED");
    expect(sendInvitation).not.toHaveBeenCalled();
    await prisma.emailOutbox.update({ where: { id: f.jobId }, data: {
      status: "FAILED", payloadCiphertext: null, payloadNonce: null, payloadTag: null, encryptionKeyId: null,
    } });
  });

  it("cannot finalize success or failure after cancellation or owner/lease loss", async () => {
    const f = await fixture("race");
    const claimed = (await repo.claim("race-owner"))!;
    expect(await repo.markSent(claimed, "wrong-owner", "mock")).toBe(false);
    await prisma.emailOutbox.update({ where: { id: f.jobId }, data: { leaseUntil: new Date(Date.now() - 1000) } });
    expect(await repo.markFailed(claimed, "race-owner", "HTTP_500", true)).toBe(false);
    await prisma.$executeRaw`UPDATE "EmailOutbox" SET "leaseUntil" = NOW() + INTERVAL '60 seconds' WHERE "id" = ${f.jobId}::uuid`;
    await revokeAndCancel(f);
    expect(await repo.markSent(claimed, "race-owner", "mock")).toBe(false);
    expect(await repo.markFailed(claimed, "race-owner", "HTTP_500", true)).toBe(false);
    expect((await job(f.jobId)).status).toBe("CANCELLED");
  });

  it.each(["success", "failure"] as const)("keeps cancellation terminal during provider %s", async (outcome) => {
    const f = await fixture(`provider-race-${outcome}`);
    sendInvitation.mockImplementationOnce(async () => {
      await revokeAndCancel(f);
      if (outcome === "failure") throw new EmailProviderError("HTTP_500", true);
      return { providerMessageId: "mock-provider-id" };
    });
    await worker.processOne();
    expect(sendInvitation).toHaveBeenCalledTimes(1);
    const completed = await job(f.jobId);
    expect(completed.status).toBe("CANCELLED");
    expect(completed.payloadCiphertext).toBeNull();
    expect(completed.claimedBy).toBeNull();
    expect(completed.providerMessageId).toBeNull();
  });

  it("retries temporary errors with stable request, then sends", async () => {
    const f = await fixture("retry");
    sendInvitation.mockRejectedValueOnce(new EmailProviderError("HTTP_429", true));
    await worker.processOne();
    expect((await job(f.jobId)).status).toBe("QUEUED");
    await prisma.emailOutbox.update({ where: { id: f.jobId }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
    await worker.processOne();
    expect(sendInvitation).toHaveBeenCalledTimes(2);
    expect(sendInvitation.mock.calls[0]![0]).toEqual(sendInvitation.mock.calls[1]![0]);
    expect((await job(f.jobId)).status).toBe("SENT");
  });

  it("scrubs permanent rejection and stops before idempotency retention expires", async () => {
    const rejected = await fixture("permanent");
    sendInvitation.mockRejectedValueOnce(new EmailProviderError("HTTP_422", false));
    await worker.processOne();
    expect((await job(rejected.jobId)).status).toBe("FAILED");
    expect((await job(rejected.jobId)).payloadCiphertext).toBeNull();
    const aged = await fixture("aged");
    await prisma.emailOutbox.update({ where: { id: aged.jobId }, data: {
      createdAt: new Date(Date.now() - INVITATION_RETRY_HORIZON_MS - 1000),
    } });
    sendInvitation.mockClear();
    expect(await repo.claim(randomUUID())).toBeNull();
    expect((await job(aged.jobId)).status).toBe("FAILED");
    expect(sendInvitation).not.toHaveBeenCalled();
  });

  it("does not defer a suspended invitation past the retry horizon", async () => {
    const f = await fixture("suspended-aged");
    await prisma.company.update({ where: { id: f.companyId }, data: { status: "SUSPENDED" } });
    await prisma.$executeRaw`
      UPDATE "EmailOutbox" SET "createdAt" = NOW() - INTERVAL '23 hours' - INTERVAL '1 second'
      WHERE "id" = ${f.jobId}::uuid
    `;
    expect(await repo.claim(randomUUID())).toBeNull();
    expect((await job(f.jobId)).status).toBe("FAILED");
    expect((await job(f.jobId)).payloadCiphertext).toBeNull();
    expect(sendInvitation).not.toHaveBeenCalled();
  });

  it("rechecks company and invitation after claim before provider dispatch", async () => {
    const f = await fixture("recheck");
    const claimed = (await repo.claim("recheck-owner"))!;
    await prisma.company.update({ where: { id: f.companyId }, data: { status: "SUSPENDED" } });
    expect(await repo.verifyEligible(claimed, "recheck-owner", f.recipient,
      createHash("sha256").update(f.token).digest("hex"), f.expiresAt.toISOString())).toBe("DEFERRED");
    expect((await job(f.jobId)).status).toBe("QUEUED");
    expect((await job(f.jobId)).payloadCiphertext).not.toBeNull();
    expect(sendInvitation).not.toHaveBeenCalled();
  });

  it("requires the encrypted expiration to match the database instant exactly", async () => {
    const f = await fixture("expires-binding");
    const claimed = (await repo.claim("binding-owner"))!;
    const outcome = await repo.verifyEligible(claimed, "binding-owner", f.recipient,
      createHash("sha256").update(f.token).digest("hex"),
      new Date(f.expiresAt.getTime() + 1).toISOString());
    expect(outcome).toBe("INELIGIBLE");
    expect(sendInvitation).not.toHaveBeenCalled();
  });

  it("does not fail a valid invitation when the Node clock is ahead", async () => {
    const f = await fixture("node-ahead");
    const dbEpoch = (await prisma.$queryRaw<Array<{ millis: number }>>`
      SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::double precision AS millis
    `)[0]!.millis;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(dbEpoch + 14 * 24 * 3600_000);
    try { await worker.processOne(); } finally { nowSpy.mockRestore(); }
    expect(sendInvitation).toHaveBeenCalledTimes(1);
    expect((await job(f.jobId)).status).toBe("SENT");
  });

  it("does not deliver an expired invitation when the Node clock is behind", async () => {
    const f = await fixture("node-behind");
    await prisma.$executeRaw`
      UPDATE "CompanyInvitation" SET "createdAt" = NOW() - INTERVAL '2 hours',
        "expiresAt" = NOW() - INTERVAL '1 minute'
      WHERE "id" = ${f.invitationId}::uuid
    `;
    const dbEpoch = (await prisma.$queryRaw<Array<{ millis: number }>>`
      SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::double precision AS millis
    `)[0]!.millis;
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(dbEpoch - 14 * 24 * 3600_000);
    try { await worker.processOne(); } finally { nowSpy.mockRestore(); }
    expect(sendInvitation).not.toHaveBeenCalled();
    expect((await job(f.jobId)).status).toBe("CANCELLED");
  });

  it("bootstraps isolated worker module with mocked provider", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [InvitationEmailWorkerModule] })
      .overrideProvider(EmailDeliverySettings).useValue(settings)
      .overrideProvider(EmailProviderService).useValue(provider).compile();
    expect(moduleRef.get(InvitationDeliveryWorker)).toBeDefined();
    expect(moduleRef.get(InvitationOutboxRepository)).toBeDefined();
    await moduleRef.close();
  });

  it("advances bounded discovery past a page of locked companies", async () => {
    const blocked: Awaited<ReturnType<typeof fixture>>[] = [];
    for (let index = 0; index < 25; index++) {
      blocked.push(await fixture(`discovery-blocked-${index}`));
    }
    const target = await fixture("discovery-target");
    for (const entry of blocked) {
      await prisma.$executeRaw`
        UPDATE "EmailOutbox" SET "nextAttemptAt" = NOW() - INTERVAL '2 minutes'
        WHERE "id" = ${entry.jobId}::uuid
      `;
    }
    await prisma.$executeRaw`
      UPDATE "EmailOutbox" SET "nextAttemptAt" = NOW() - INTERVAL '1 minute'
      WHERE "id" = ${target.jobId}::uuid
    `;
    let release!: () => void;
    let locked!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const acquired = new Promise<void>((resolve) => { locked = resolve; });
    const lockTransaction = prisma.$transaction(async (tx) => {
      for (const entry of blocked) {
        await tx.$queryRaw`SELECT "id" FROM "Company" WHERE "id" = ${entry.companyId}::uuid FOR UPDATE`;
      }
      locked();
      await held;
    }, { maxWait: 10_000, timeout: 30_000 });
    await acquired;
    try {
      expect(await repo.claim("blocked-page-owner")).toBeNull();
      expect((await repo.claim("next-page-owner"))?.id).toBe(target.jobId);
    } finally {
      release();
      await lockTransaction;
    }
    expect(sendInvitation).not.toHaveBeenCalled();
  });
});
