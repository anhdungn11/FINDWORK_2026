import "reflect-metadata";
import { randomBytes, randomUUID } from "node:crypto";
import { Test } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { EmailDeliverySettings } from "../src/infrastructure/email/email-delivery-settings.service";
import { EmailCryptoService } from "../src/infrastructure/email/email-crypto.service";
import { EmailDeliveryWorker } from "../src/infrastructure/email/email-delivery.worker";
import { EmailOutboxRepository } from "../src/infrastructure/email/email-outbox.repository";
import { EmailProviderError, EmailProviderService, type ProviderRequest } from "../src/infrastructure/email/email-provider.service";
import { EmailVerificationService } from "../src/modules/auth/email-verification/email-verification.service";

const label = `phase43c2c-${randomUUID().slice(0, 8)}`;
const key = randomBytes(32).toString("base64");
const settings = {
  mode: "resend", workerEnabled: true, activeKeyId: "test-key-v1",
  keyringJson: JSON.stringify({ "test-key-v1": key }),
  verifyUrl: "https://example.invalid/verify-email", resendApiKey: "test-only-not-used-12345", sender: "test@example.invalid",
  assertCanQueue() {}, assertWorkerReady() {},
};
let behavior: "ok" | "retry" | "permanent" | "uncertain" = "ok";
const calls: ProviderRequest[] = [];
const provider = {
  async sendVerification(req: ProviderRequest) {
    calls.push(req);
    if (behavior === "retry") throw new EmailProviderError("HTTP_503", true);
    if (behavior === "permanent") throw new EmailProviderError("HTTP_400", false);
    if (behavior === "uncertain") throw new EmailProviderError("PROVIDER_TRANSPORT_UNCERTAIN", true);
    return { providerMessageId: "sandbox-message-id" };
  },
};

describe("Phase 4.3C.2C Email Delivery (findwork_test ONLY)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let crypto: EmailCryptoService;
  let worker: EmailDeliveryWorker;
  let verify: EmailVerificationService;
  const ids: string[] = [];

  async function setupUser() {
    const id = randomUUID();
    ids.push(id);
    const email = `${label}-${randomUUID().slice(0, 8)}@findwork.local`;
    await prisma.user.create({ data: { id, email, emailNormalized: email, passwordHash: "fixture-unusable-password" } });
    return { id, email };
  }
  async function issue() {
    const user = await setupUser();
    await verify.request(user.id);
    const token = await prisma.emailVerificationToken.findFirstOrThrow({ where: { userId: user.id } });
    const outbox = await prisma.emailOutbox.findFirstOrThrow({ where: { verificationTokenId: token.id } });
    return { user, token, outbox };
  }
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailDeliverySettings).useValue(settings)
      .overrideProvider(EmailProviderService).useValue(provider)
      .compile();
    app = module.createNestApplication();
    const env = app.get(ConfigService);
    const u = new URL(env.getOrThrow<string>("DATABASE_URL"));
    const name = decodeURIComponent(u.pathname.slice(1));
    if (name !== "findwork_test" || !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) ||
      (u.searchParams.has("schema") && u.searchParams.get("schema") !== "public")) {
      throw new Error("REFUSING DELIVERY INTEGRATION OUTSIDE LOCAL findwork_test");
    }
    await app.init();
    prisma = app.get(PrismaService);
    crypto = app.get(EmailCryptoService);
    worker = app.get(EmailDeliveryWorker);
    verify = app.get(EmailVerificationService);
    // processOne() claims the GLOBAL outbox. Never run these tests when other
    // active verification jobs exist, because their payload would be affected.
    const preexisting = await prisma.emailOutbox.count({
      where: { kind: "VERIFY_EMAIL", status: { in: ["QUEUED", "PROCESSING"] } },
    });
    if (preexisting !== 0) {
      throw new Error("EMAIL_TEST_ISOLATION_FAILED: non-fixture active verification jobs exist in findwork_test");
    }
  });
  beforeEach(() => { behavior = "ok"; calls.length = 0; });
  // Cancel any retrying job belonging to this suite before the next test.
  // This preserves PostgreSQL lifecycle constraints and leaves foreign jobs alone.
  afterEach(async () => {
    if (!prisma || ids.length === 0) return;
    await prisma.emailOutbox.updateMany({
      where: { kind: "VERIFY_EMAIL", verificationToken: { userId: { in: ids } },
        status: { in: ["QUEUED", "PROCESSING"] } },
      data: { status: "CANCELLED", cancelledAt: new Date(),
        claimedBy: null, leaseUntil: null,
        payloadCiphertext: null, payloadNonce: null, payloadTag: null, encryptionKeyId: null },
    });
  });
  afterAll(async () => {
    try {
      if (prisma && ids.length) {
        await prisma.emailOutbox.deleteMany({ where: { verificationToken: { userId: { in: ids } } } });
        await prisma.emailVerificationToken.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
      }
    } finally { if (app) await app.close(); }
  });

  it("encrypts recipient/token in atomic outbox and scrubs on SENT", async () => {
    const { user, outbox } = await issue();
    expect(outbox.status).toBe("QUEUED");
    expect(outbox.payloadCiphertext).not.toBeNull();
    expect(Buffer.from(outbox.payloadCiphertext ?? []).toString()).not.toContain(user.email);
    expect(await worker.processOne()).toBe(true);
    const final = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: outbox.id } });
    expect(final.status).toBe("SENT");
    expect(final.payloadCiphertext).toBeNull();
    expect(final.payloadNonce).toBeNull();
    expect(final.payloadTag).toBeNull();
    expect(final.encryptionKeyId).toBeNull();
    expect(final.providerMessageId).toBe("sandbox-message-id");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.to).toBe(user.email);
    expect(new URL(calls[0]!.verifyUrl).searchParams.get("token")).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("retries transient provider failure without scrubbing payload", async () => {
    const { outbox } = await issue();
    behavior = "retry";
    expect(await worker.processOne()).toBe(true);
    const final = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: outbox.id } });
    expect(final.status).toBe("QUEUED");
    expect(final.attemptCount).toBe(1);
    expect(final.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect(final.payloadCiphertext).not.toBeNull();
    expect(final.lastErrorCode).toBe("HTTP_503");
    // Prevent this fixture from becoming due and interfering with subsequent tests.
    await prisma.emailOutbox.update({ where: { id: outbox.id },
      data: { nextAttemptAt: new Date(Date.now() + 60 * 60 * 1000) } });
  });

  it("permanent provider failure is terminal and scrubs", async () => {
    const { outbox } = await issue();
    behavior = "permanent";
    expect(await worker.processOne()).toBe(true);
    const final = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: outbox.id } });
    expect(final.status).toBe("FAILED");
    expect(final.payloadCiphertext).toBeNull();
    expect(final.encryptionKeyId).toBeNull();
  });

  it("cancels a revoked token without provider call", async () => {
    const { token, outbox } = await issue();
    await prisma.emailVerificationToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
    expect(await worker.processOne()).toBe(true);
    const final = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: outbox.id } });
    expect(final.status).toBe("CANCELLED");
    expect(final.payloadCiphertext).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("tampered ciphertext never reaches provider", async () => {
    const { outbox } = await issue();
    const corrupted = Buffer.from(outbox.payloadCiphertext ?? []);
    corrupted[0] = (corrupted[0] ?? 0) ^ 1;
    await prisma.emailOutbox.update({ where: { id: outbox.id }, data: { payloadCiphertext: corrupted } });
    expect(await worker.processOne()).toBe(true);
    const final = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: outbox.id } });
    expect(final.status).toBe("FAILED");
    expect(final.payloadCiphertext).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("concurrent worker claims do not deliver the same job twice", async () => {
    const { outbox } = await issue();
    await Promise.all([worker.processOne(), worker.processOne()]);
    const final = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: outbox.id } });
    expect(final.status).toBe("SENT");
    // processOne may also claim an unrelated job; evaluate THIS job by its stable idempotency key.
    const ownCalls = calls.filter((call) => call.idempotencyKey === outbox.idempotencyKey);
    expect(ownCalls).toHaveLength(1);
    // Multiple worker calls must never dispatch the same outbox key twice in this batch.
    expect(new Set(calls.map((call) => call.idempotencyKey)).size).toBe(calls.length);
  });

  it("reclaims a crashed expired lease using a fresh owner", async () => {
    const { outbox } = await issue();
    await prisma.emailOutbox.update({
      where: { id: outbox.id },
      data: { status: "PROCESSING", claimedBy: randomUUID(), leaseUntil: new Date(Date.now() - 30_000), attemptCount: 1 },
    });
    expect(await worker.processOne()).toBe(true);
    const final = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: outbox.id } });
    expect(final.status).toBe("SENT");
    expect(final.attemptCount).toBe(2);
  });

  it("uncertain provider outcome retains idempotency key for retry", async () => {
    const { outbox } = await issue();
    behavior = "uncertain";
    await worker.processOne();
    const pending = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: outbox.id } });
    expect(pending.status).toBe("QUEUED");
    expect(calls[0]?.idempotencyKey).toBe(outbox.idempotencyKey);
  });

  it("retries an unexpected infrastructure failure without scrubbing", async () => {
    const { outbox } = await issue();
    // The worker claims globally; prioritize this fixture over pre-existing test jobs.
    await prisma.emailOutbox.update({ where: { id: outbox.id },
      data: { nextAttemptAt: new Date("2000-01-01T00:00:00Z") } });
    const repo = app.get(EmailOutboxRepository);
    const failingRead = jest.spyOn(repo, "verifyEligible")
      .mockRejectedValueOnce(new Error("INJECTED_TRANSIENT_READ_FAILURE"));
    try {
      expect(await worker.processOne()).toBe(true);
    } finally {
      failingRead.mockRestore();
    }
    const pending = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: outbox.id } });
    expect(pending.status).toBe("QUEUED");
    expect(pending.attemptCount).toBe(1);
    expect(pending.payloadCiphertext).not.toBeNull();
    expect(pending.lastErrorCode).toBe("EMAIL_PROCESSING_ERROR");
    expect(calls).toHaveLength(0);
    // Don't let this deliberately queued fixture interfere with later tests.
    await prisma.emailOutbox.update({ where: { id: outbox.id },
      data: { nextAttemptAt: new Date(Date.now() + 60 * 60 * 1000) } });
  });

  it("authenticated decryption rejects ciphertext re-bound to another job", async () => {
    const { token, outbox } = await issue();
    expect(() => crypto.decrypt(randomUUID(), "VERIFY_EMAIL", token.id, {
      payloadCiphertext: Buffer.from(outbox.payloadCiphertext ?? []),
      payloadNonce: Buffer.from(outbox.payloadNonce ?? []),
      payloadTag: Buffer.from(outbox.payloadTag ?? []),
      encryptionKeyId: outbox.encryptionKeyId!,
    })).toThrow();
  });
});
