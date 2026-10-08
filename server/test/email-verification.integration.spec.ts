import "reflect-metadata";
import { randomBytes, randomUUID, createCipheriv, createHash } from "node:crypto";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { ApiExceptionFilter } from "../src/common/exceptions/api-exception.filter";
import type { Prisma } from "../src/generated/prisma/client";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import {
  EmailVerificationEnqueueService,
  type EmailVerificationEnqueueInput,
} from "../src/modules/auth/email-verification/email-verification-enqueue.service";
import { TokenService } from "../src/modules/auth/services/token.service";

const API = "/api/v1/auth/email-verification";
const PREFIX = `phase43c2b-${randomUUID().slice(0, 8)}`;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const makeToken = () => randomBytes(32).toString("base64url");

type Actor = { id: string; email: string; accessToken: string };

/** TEST ONLY: ephemeral AES key, no external email provider. */
describe("Phase 4.3C.2B Email Verification (findwork_test ONLY)", () => {
  let appOff: INestApplication;
  let appOn: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;
  const actors: Actor[] = [];
  const deliveredTokens = new Map<string, string>();
  const encryptionKey = randomBytes(32);
  let failEnqueue = false;
  let skipEnqueue = false;

  const testEnqueue = {
    assertAvailable(): void { /* only inside isolated test app */ },
    async enqueue(
      tx: Prisma.TransactionClient,
      input: EmailVerificationEnqueueInput,
    ): Promise<void> {
      if (skipEnqueue) return;
      const nonce = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", encryptionKey, nonce);
      const plaintext = Buffer.from(JSON.stringify({
        to: input.emailNormalized,
        token: input.rawToken,
      }));
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      await tx.emailOutbox.create({
        data: {
          kind: "VERIFY_EMAIL",
          verificationTokenId: input.verificationTokenId,
          idempotencyKey: `verify:${input.verificationTokenId}`,
          payloadCiphertext: ciphertext,
          payloadNonce: nonce,
          payloadTag: cipher.getAuthTag(),
          encryptionKeyId: "integration-ephemeral-key",
        },
      });
      if (failEnqueue) throw new Error("INJECTED_ENQUEUE_FAILURE");
      deliveredTokens.set(input.userId, input.rawToken);
    },
  };

  async function initialize(
    overrides: boolean,
  ): Promise<INestApplication> {
    let builder = Test.createTestingModule({ imports: [AppModule] });
    if (overrides) {
      builder = builder.overrideProvider(EmailVerificationEnqueueService)
        .useValue(testEnqueue);
    }
    const moduleRef = await builder.compile();
    const app = moduleRef.createNestApplication();
    const config = app.get(ConfigService);
    const connection = config.getOrThrow<string>("DATABASE_URL");
    const url = new URL(connection);
    const name = decodeURIComponent(url.pathname.slice(1));
    if (
      name !== "findwork_test" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      (url.searchParams.has("schema") && url.searchParams.get("schema") !== "public")
    ) {
      throw new Error("REFUSING EMAIL VERIFICATION TESTS OUTSIDE LOCAL findwork_test");
    }
    app.use(cookieParser());
    app.setGlobalPrefix(config.getOrThrow<string>("API_PREFIX"));
    app.useGlobalPipes(new ValidationPipe({
      transform: true, whitelist: true, forbidNonWhitelisted: true,
    }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    return app;
  }

  async function actor(label: string): Promise<Actor> {
    const id = randomUUID();
    const sessionId = randomUUID();
    const email = `${PREFIX}-${label}-${randomUUID().slice(0, 8)}@findwork.local`;
    await prisma.user.create({
      data: {
        id, email, emailNormalized: email,
        // Fixture only; login never receives this password.
        passwordHash: "integration-fixture-unusable-password-hash",
      },
    });
    await prisma.authSession.create({
      data: {
        id: sessionId, userId: id,
        refreshTokenHash: `fixture:${randomUUID()}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const accessToken = await tokenService.signAccessToken(id, sessionId);
    const result = { id, email, accessToken };
    actors.push(result);
    return result;
  }

  async function seedToken(
    who: Actor,
    overrides: {
      expired?: boolean;
      revoked?: boolean;
      email?: string;
    } = {},
  ): Promise<string> {
    const raw = makeToken();
    const now = Date.now();
    await prisma.emailVerificationToken.create({
      data: {
        userId: who.id,
        emailNormalized: overrides.email ?? who.email,
        tokenHash: hash(raw),
        createdAt: new Date(now - 2 * 60 * 60 * 1000),
        expiresAt: new Date(now + (overrides.expired ? -60_000 : 60_000)),
        ...(overrides.revoked ? { revokedAt: new Date(now - 1_000) } : {}),
      },
    });
    return raw;
  }

  beforeAll(async () => {
    // Verify target before any fixture insert and before creating the second app.
    appOff = await initialize(false);
    prisma = appOff.get(PrismaService);
    tokenService = appOff.get(TokenService);
    appOn = await initialize(true);
  });

  afterAll(async () => {
    try {
      if (prisma && actors.length > 0) {
        const ids = actors.map((item) => item.id);
        await prisma.auditLog.deleteMany({
          where: { action: "auth.email_verified", targetId: { in: ids } },
        });
        await prisma.emailOutbox.deleteMany({
          where: { verificationToken: { userId: { in: ids } } },
        });
        await prisma.emailVerificationToken.deleteMany({
          where: { userId: { in: ids } },
        });
        await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
      }
    } finally {
      if (appOn) await appOn.close();
      if (appOff) await appOff.close();
    }
  });

  it("fails closed by default without creating token or outbox rows", async () => {
    const who = await actor("closed");
    await request(appOff.getHttpServer())
      .post(`${API}/request`)
      .set("Authorization", `Bearer ${who.accessToken}`)
      .expect(503);
    expect(await prisma.emailVerificationToken.count({ where: { userId: who.id } })).toBe(0);
    expect(await prisma.emailOutbox.count({ where: { verificationToken: { userId: who.id } } })).toBe(0);
  });

  it("requires a valid access session for request and validates token format", async () => {
    await request(appOff.getHttpServer()).post(`${API}/request`).expect(401);
    await request(appOff.getHttpServer()).post(`${API}/confirm`)
      .send({ token: "bad" }).expect(400);
    await request(appOff.getHttpServer()).post(`${API}/confirm`)
      .send({ token: makeToken() }).expect(401);
  });

  it("atomically queues encrypted payload, then confirms once and updates /me", async () => {
    const who = await actor("happy");
    await request(appOn.getHttpServer())
      .post(`${API}/request`)
      .set("Authorization", `Bearer ${who.accessToken}`)
      .expect(204);

    const rows = await prisma.emailVerificationToken.findMany({
      where: { userId: who.id },
    });
    expect(rows).toHaveLength(1);
    const tokenRow = rows[0];
    if (!tokenRow) throw new Error("Missing test verification token");
    const rawToken = deliveredTokens.get(who.id);
    if (!rawToken) throw new Error("Missing test-only token capture");
    expect(tokenRow.tokenHash).toBe(hash(rawToken));
    expect(tokenRow.tokenHash).not.toBe(rawToken);

    const outbox = await prisma.emailOutbox.findFirstOrThrow({
      where: { verificationTokenId: tokenRow.id },
    });
    expect(outbox.status).toBe("QUEUED");
    expect(outbox.payloadCiphertext).not.toBeNull();
    expect(Buffer.from(outbox.payloadCiphertext ?? []).toString("utf8"))
      .not.toContain(rawToken);

    const before = await request(appOn.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${who.accessToken}`)
      .expect(200);
    expect(before.body.emailVerified).toBe(false);

    await request(appOn.getHttpServer()).post(`${API}/confirm`)
      .send({ token: rawToken }).expect(204);
    await request(appOn.getHttpServer()).post(`${API}/confirm`)
      .send({ token: rawToken }).expect(401);

    const after = await request(appOn.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${who.accessToken}`)
      .expect(200);
    expect(after.body.emailVerified).toBe(true);
    expect((await prisma.emailVerificationToken.findUniqueOrThrow({
      where: { id: tokenRow.id },
    })).consumedAt).not.toBeNull();
    const scrubbed = await prisma.emailOutbox.findUniqueOrThrow({
      where: { id: outbox.id },
    });
    expect(scrubbed.status).toBe("CANCELLED");
    expect(scrubbed.payloadCiphertext).toBeNull();
    expect(await prisma.auditLog.count({
      where: { action: "auth.email_verified", targetId: who.id },
    })).toBe(1);
  });

  it("rejects expired and revoked tokens without verifying a user", async () => {
    const expired = await actor("expired");
    const revoked = await actor("revoked");
    const a = await seedToken(expired, { expired: true });
    const b = await seedToken(revoked, { revoked: true });
    for (const raw of [a, b]) {
      await request(appOn.getHttpServer())
        .post(`${API}/confirm`).send({ token: raw }).expect(401);
    }
    const users = await prisma.user.findMany({
      where: { id: { in: [expired.id, revoked.id] } },
      select: { emailVerifiedAt: true },
    });
    expect(users.every((item) => item.emailVerifiedAt === null)).toBe(true);
  });

  it("rejects tokens when account email changed after issuance", async () => {
    const who = await actor("mismatch");
    const rawToken = await seedToken(who, { email: `old-${who.email}` });
    await request(appOn.getHttpServer())
      .post(`${API}/confirm`).send({ token: rawToken }).expect(401);
    expect((await prisma.user.findUniqueOrThrow({
      where: { id: who.id },
    })).emailVerifiedAt).toBeNull();
  });

  it("serializes simultaneous confirms: exactly one success", async () => {
    const who = await actor("parallel");
    const raw = await seedToken(who);
    const [a, b] = await Promise.all([
      request(appOn.getHttpServer()).post(`${API}/confirm`).send({ token: raw }),
      request(appOn.getHttpServer()).post(`${API}/confirm`).send({ token: raw }),
    ]);
    expect([a.status, b.status].sort()).toEqual([204, 401]);
    expect(await prisma.auditLog.count({
      where: { action: "auth.email_verified", targetId: who.id },
    })).toBe(1);
  });

  it("enforces cooldown without persisting another token", async () => {
    const who = await actor("cooldown");
    const header = { Authorization: `Bearer ${who.accessToken}` };
    await request(appOn.getHttpServer()).post(`${API}/request`)
      .set(header).expect(204);
    await request(appOn.getHttpServer()).post(`${API}/request`)
      .set(header).expect(429);
    expect(await prisma.emailVerificationToken.count({
      where: { userId: who.id },
    })).toBe(1);
  });

  it("revokes stale token, cancels queued ciphertext and issues a replacement", async () => {
    const who = await actor("replace");
    const header = { Authorization: `Bearer ${who.accessToken}` };
    await request(appOn.getHttpServer()).post(`${API}/request`)
      .set(header).expect(204);
    const original = await prisma.emailVerificationToken.findFirstOrThrow({
      where: { userId: who.id },
    });
    await prisma.emailVerificationToken.update({
      where: { id: original.id },
      data: {
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });
    await request(appOn.getHttpServer()).post(`${API}/request`)
      .set(header).expect(204);
    const old = await prisma.emailVerificationToken.findUniqueOrThrow({
      where: { id: original.id },
    });
    expect(old.revokedAt).not.toBeNull();
    const cancelled = await prisma.emailOutbox.findFirstOrThrow({
      where: { verificationTokenId: original.id },
    });
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.payloadCiphertext).toBeNull();
    expect(cancelled.payloadNonce).toBeNull();
    expect(cancelled.payloadTag).toBeNull();
    expect(cancelled.encryptionKeyId).toBeNull();
    expect(await prisma.emailVerificationToken.count({
      where: { userId: who.id, consumedAt: null, revokedAt: null },
    })).toBe(1);
  });

  it("serializes concurrent issuance and enforces the per-account cooldown", async () => {
    const who = await actor("parallel-issue");
    const header = { Authorization: `Bearer ${who.accessToken}` };
    const [a, b] = await Promise.all([
      request(appOn.getHttpServer()).post(`${API}/request`).set(header),
      request(appOn.getHttpServer()).post(`${API}/request`).set(header),
    ]);
    expect([a.status, b.status].sort()).toEqual([204, 429]);
    expect(await prisma.emailVerificationToken.count({ where: { userId: who.id } })).toBe(1);
    expect(await prisma.emailOutbox.count({
      where: { verificationToken: { userId: who.id } },
    })).toBe(1);
  });

  it("does not persist a token if the adapter claims success without enqueuing", async () => {
    const who = await actor("skip-outbox");
    skipEnqueue = true;
    try {
      await request(appOn.getHttpServer()).post(`${API}/request`)
        .set("Authorization", `Bearer ${who.accessToken}`)
        .expect(500);
    } finally {
      skipEnqueue = false;
    }
    expect(await prisma.emailVerificationToken.count({ where: { userId: who.id } })).toBe(0);
  });

  it("does not enqueue a new token for a user already verified", async () => {
    const who = await actor("verified");
    await prisma.user.update({
      where: { id: who.id }, data: { emailVerifiedAt: new Date() },
    });
    await request(appOn.getHttpServer()).post(`${API}/request`)
      .set("Authorization", `Bearer ${who.accessToken}`).expect(204);
    expect(await prisma.emailVerificationToken.count({ where: { userId: who.id } })).toBe(0);
  });

  it("rolls back token and outbox when atomic enqueue fails", async () => {
    const who = await actor("rollback");
    failEnqueue = true;
    try {
      await request(appOn.getHttpServer()).post(`${API}/request`)
        .set("Authorization", `Bearer ${who.accessToken}`)
        .expect(500);
    } finally {
      failEnqueue = false;
    }
    expect(await prisma.emailVerificationToken.count({
      where: { userId: who.id },
    })).toBe(0);
    expect(await prisma.emailOutbox.count({
      where: { verificationToken: { userId: who.id } },
    })).toBe(0);
  });
});
