// Exercises the compiled production reset worker against a new disposable DB.
// The provider is fake; no email, AI call, or shared-database write is possible.
const assert = require("node:assert/strict");
const { createHash, randomBytes, randomUUID } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

if (process.argv.length !== 2) throw new Error("No arguments accepted");
const root = path.resolve(__dirname, "..");
const source = dotenv.parse(readFileSync("D:/DACSN/Find-Work-Release/server/.env.employer-media.local"));
const sourceUrl = new URL(source.DATABASE_URL);
assert.equal(sourceUrl.hostname, "127.0.0.1");
assert.equal(sourceUrl.port, "5432");
assert.equal(sourceUrl.pathname, "/findwork_employer_media_3002");
assert.equal(sourceUrl.searchParams.get("schema"), "public");
const name = `findwork_reset_auto_${randomBytes(6).toString("hex")}`;
const targetUrl = new URL(sourceUrl);
targetUrl.pathname = `/${name}`;
const maintenanceUrl = new URL(sourceUrl);
maintenanceUrl.pathname = "/postgres";
maintenanceUrl.search = "";
const maintenance = new Client({ connectionString: maintenanceUrl.toString() });
const key = randomBytes(32).toString("base64");
const cutoff = new Date().toISOString();
const env = { ...source, DATABASE_URL: targetUrl.toString(), FINDWORK_EXPECTED_DATABASE: name,
  NODE_ENV: "test", PORT: "3099", EMAIL_DELIVERY_MODE: "resend", EMAIL_WORKER_ENABLED: "false",
  EMAIL_PASSWORD_RESET_ENABLED: "true", EMAIL_PASSWORD_RESET_AUTO_WORKER_ENABLED: "true",
  EMAIL_PASSWORD_RESET_AUTO_NOT_BEFORE: cutoff, EMAIL_INVITATION_DELIVERY_ENABLED: "false",
  EMAIL_RECRUITMENT_NOTIFICATIONS_ENABLED: "false", EMAIL_ACTIVE_KEY_ID: "disposable",
  EMAIL_KEYRING_JSON: JSON.stringify({ disposable: key }), EMAIL_RESEND_API_KEY: "fake-no-network-key-123456",
  EMAIL_FROM: "FINDWORK <test@example.invalid>", EMAIL_RESET_URL: "http://127.0.0.1:5177/reset-password" };
let created = false;
let db;

async function main() {
  await maintenance.connect();
  try {
    await maintenance.query(`CREATE DATABASE "${name}"`);
    created = true;
    const migration = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      { cwd: root, env: { ...process.env, ...env }, encoding: "utf8", timeout: 180_000 });
    assert.equal(migration.status, 0, `Disposable migration failed: ${migration.error?.code || migration.status}`);
    require("reflect-metadata");
    const { PrismaService } = require("../dist/infrastructure/prisma/prisma.service.js");
    const { EmailDeliverySettings } = require("../dist/infrastructure/email/email-delivery-settings.service.js");
    const { EmailCryptoService } = require("../dist/infrastructure/email/email-crypto.service.js");
    const { EmailProviderError } = require("../dist/infrastructure/email/email-provider.service.js");
    const { PasswordResetWorker } = require("../dist/infrastructure/email/password-reset.worker.js");
    const { validateEnvironment } = require("../dist/config/env.validation.js");
    const config = validateEnvironment(env);
    const settings = new EmailDeliverySettings({ get: (k, fallback) => config[k] ?? fallback });
    assert.equal(settings.assertAutomaticPasswordResetWorkerReady().toISOString(), cutoff);
    const crypto = new EmailCryptoService(settings);
    db = new PrismaService({ getOrThrow: (k) => config[k] });
    await db.$connect();
    const identity = await db.$queryRaw`SELECT current_database() AS db, current_schema() AS schema`;
    assert.deepEqual(identity, [{ db: name, schema: "public" }]);
    const deliveries = [];
    let behavior = async (input) => ({ providerMessageId: `fake-${deliveries.length}` });
    const provider = { sendPasswordReset: async (input) => {
      deliveries.push({ key: input.idempotencyKey, to: input.to });
      return behavior(input);
    } };
    const worker = new PasswordResetWorker(db, settings, crypto, provider);
    let seq = 0;
    async function job(options = {}) {
      seq++;
      const recipient = `reset-auto-${seq}@example.invalid`;
      const user = await db.user.create({ data: { email: recipient, emailNormalized: recipient,
        passwordHash: "disposable-hash" } });
      const rawToken = randomBytes(32).toString("base64url");
      const expiresAt = options.expired ? new Date(Date.now() - 60_000) : new Date(Date.now() + 3_600_000);
      const token = await db.passwordResetToken.create({ data: { userId: user.id, emailNormalized: recipient,
        tokenHash: createHash("sha256").update(rawToken).digest("hex"), expiresAt,
        ...(options.revoked && { revokedAt: new Date() }),
        ...(options.consumed && { consumedAt: new Date() }) } });
      const id = randomUUID();
      const sealed = crypto.encrypt(id, "RESET_PASSWORD", token.id, { version: 1, recipient,
        rawToken, tokenId: token.id, expiresAt: expiresAt.toISOString(),
        resetBaseUrl: settings.resetUrl, sender: settings.sender });
      return db.passwordResetOutbox.create({ data: { id, tokenId: token.id,
        idempotencyKey: `reset:${token.id}`, payloadCiphertext: sealed.payloadCiphertext,
        payloadNonce: sealed.payloadNonce, payloadTag: sealed.payloadTag,
        encryptionKeyId: sealed.encryptionKeyId,
        ...(options.old && { createdAt: new Date(Date.parse(cutoff) - 60_000) }) } });
    }
    const old = await job({ old: true });
    const fresh = await job();
    const freshToken = await db.passwordResetToken.findUniqueOrThrow({ where: { id: fresh.tokenId } });
    const verify = await db.emailVerificationToken.create({ data: { userId: freshToken.userId,
      emailNormalized: freshToken.emailNormalized, tokenHash: createHash("sha256")
        .update(randomUUID()).digest("hex"), expiresAt: new Date(Date.now() + 3_600_000) } });
    const verifyId = randomUUID();
    const verifyPayload = crypto.encrypt(verifyId, "VERIFY_EMAIL", verify.id,
      { version: 1, recipient: freshToken.emailNormalized });
    await db.emailOutbox.create({ data: { id: verifyId, kind: "VERIFY_EMAIL",
      verificationTokenId: verify.id, idempotencyKey: `verify:${verify.id}`,
      payloadCiphertext: verifyPayload.payloadCiphertext, payloadNonce: verifyPayload.payloadNonce,
      payloadTag: verifyPayload.payloadTag, encryptionKeyId: verifyPayload.encryptionKeyId } });
    assert.equal(await worker.processOne(undefined, new Date(cutoff)), true);
    assert.equal((await db.passwordResetOutbox.findUniqueOrThrow({ where: { id: fresh.id } })).status, "SENT");
    assert.equal((await db.passwordResetOutbox.findUniqueOrThrow({ where: { id: old.id } })).status, "QUEUED");
    assert.equal(deliveries.length, 1);
    const invalid = [await job({ expired: true }), await job({ revoked: true }), await job({ consumed: true })];
    for (const row of invalid) {
      assert.equal(await worker.processOne(undefined, new Date(cutoff)), true);
      const saved = await db.passwordResetOutbox.findUniqueOrThrow({ where: { id: row.id } });
      assert.equal(saved.status, "CANCELLED");
      assert.equal(saved.payloadCiphertext, null);
    }
    assert.equal(deliveries.length, 1);
    const wrongRecipient = await job();
    const wrongToken = await db.passwordResetToken.findUniqueOrThrow({ where: { id: wrongRecipient.tokenId } });
    await db.user.update({ where: { id: wrongToken.userId },
      data: { emailNormalized: "changed-recipient@example.invalid" } });
    assert.equal(await worker.processOne(undefined, new Date(cutoff)), true);
    assert.equal((await db.passwordResetOutbox.findUniqueOrThrow({ where: { id: wrongRecipient.id } })).status,
      "CANCELLED");
    assert.equal(deliveries.length, 1);
    const concurrent = await job();
    behavior = async () => { await new Promise((resolve) => setTimeout(resolve, 100));
      return { providerMessageId: "fake-concurrent" }; };
    const secondDb = new PrismaService({ getOrThrow: (k) => config[k] });
    await secondDb.$connect();
    try {
      const second = new PasswordResetWorker(secondDb, settings, crypto, provider);
      await Promise.all([worker.processOne(undefined, new Date(cutoff)),
        second.processOne(undefined, new Date(cutoff))]);
    } finally { await secondDb.$disconnect(); }
    assert.equal((await db.passwordResetOutbox.findUniqueOrThrow({ where: { id: concurrent.id } })).status, "SENT");
    assert.equal(deliveries.filter((x) => x.key === concurrent.idempotencyKey).length, 1);
    const retried = await job();
    let calls = 0;
    behavior = async () => { if (++calls === 1) throw new EmailProviderError("HTTP_429", true);
      return { providerMessageId: "fake-retried" }; };
    await worker.processOne(undefined, new Date(cutoff));
    assert.equal((await db.passwordResetOutbox.findUniqueOrThrow({ where: { id: retried.id } })).status, "QUEUED");
    await db.passwordResetOutbox.update({ where: { id: retried.id }, data: { nextAttemptAt: new Date(0) } });
    await worker.processOne(undefined, new Date(cutoff));
    assert.equal((await db.passwordResetOutbox.findUniqueOrThrow({ where: { id: retried.id } })).status, "SENT");
    assert.equal(calls, 2);
    const exhausted = await job();
    await db.passwordResetOutbox.update({ where: { id: exhausted.id }, data: { maxAttempts: 1 } });
    behavior = async () => { throw new EmailProviderError("HTTP_429", true); };
    await worker.processOne(undefined, new Date(cutoff));
    const exhaustedState = await db.passwordResetOutbox.findUniqueOrThrow({ where: { id: exhausted.id } });
    assert.equal(exhaustedState.status, "FAILED");
    assert.equal(exhaustedState.attemptCount, 1);
    assert.equal(exhaustedState.lastErrorCode, "RESET_RETRY_EXHAUSTED");
    const uncertain = await job();
    behavior = async () => { throw new EmailProviderError("HTTP_503", true); };
    await worker.processOne(undefined, new Date(cutoff));
    assert.equal((await db.passwordResetOutbox.findUniqueOrThrow({ where: { id: uncertain.id } })).status, "FAILED");
    assert.equal(await worker.processOne(undefined, new Date(cutoff)), false);
    assert.equal(deliveries.filter((x) => x.key === uncertain.idempotencyKey).length, 1);
    const transport = await job();
    behavior = async () => { throw new EmailProviderError("PROVIDER_TRANSPORT_UNCERTAIN", true); };
    await worker.processOne(undefined, new Date(cutoff));
    assert.equal((await db.passwordResetOutbox.findUniqueOrThrow({ where: { id: transport.id } })).status,
      "FAILED");
    assert.equal(deliveries.filter((x) => x.key === transport.idempotencyKey).length, 1);
    const leased = await job();
    await db.passwordResetOutbox.update({ where: { id: leased.id }, data: { status: "PROCESSING",
      claimedBy: randomUUID(), leaseUntil: new Date(0), attemptCount: 1 } });
    assert.equal(await worker.processOne(undefined, new Date(cutoff)), false);
    const quarantined = await db.passwordResetOutbox.findUniqueOrThrow({ where: { id: leased.id } });
    assert.equal(quarantined.status, "FAILED");
    assert.equal(quarantined.lastErrorCode, "RESET_LEASE_OUTCOME_UNCERTAIN");
    assert.equal(deliveries.length, 7);
    assert.equal((await db.passwordResetOutbox.findUniqueOrThrow({ where: { id: old.id } })).status,
      "QUEUED");
    assert.equal((await db.emailOutbox.findUniqueOrThrow({ where: { id: verifyId } })).status, "QUEUED");
    console.log(JSON.stringify({ disposable: name, cases: ["cutoff", "delivery", "expired", "revoked",
      "consumed", "recipient isolation", "concurrency", "429 retry", "retry limit", "503 uncertain",
      "transport uncertain", "expired lease"], fakeDeliveries: deliveries.length }));
  } finally {
    if (db) await db.$disconnect().catch(() => {});
    if (created) await maintenance.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    await maintenance.end();
  }
}
main().catch((error) => { console.error(`DISPOSABLE_RESET_AUTO_FAILED ${String(error.stack || error.message)
  .replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[REDACTED_DATABASE_URL]")}`);
  process.exitCode = 1; });
