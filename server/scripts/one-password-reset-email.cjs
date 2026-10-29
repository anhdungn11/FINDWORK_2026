// Review or send one allowlisted password-reset outbox ID. No general worker loop.
const assert = require("node:assert/strict");
const { createDecipheriv, createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const [mode, jobId] = process.argv.slice(2);
assert.ok(["--preview", "--send"].includes(mode) && /^[a-f0-9-]{36}$/i.test(jobId || ""),
  "Usage: node scripts/one-password-reset-email.cjs --preview|--send JOB_ID");
const envFile = process.env.FINDWORK_RECRUITMENT_ENV_FILE;
assert.ok(envFile && path.isAbsolute(envFile), "Set FINDWORK_RECRUITMENT_ENV_FILE to the verified private environment file");
const env = { ...dotenv.parse(readFileSync(envFile)),
  EMAIL_PASSWORD_RESET_ENABLED: "true", EMAIL_WORKER_ENABLED: "false" };
const dbUrl = new URL(env.DATABASE_URL);
assert.equal(dbUrl.hostname, "127.0.0.1");
assert.equal(dbUrl.port, "5432");
assert.equal(dbUrl.pathname, "/findwork_employer_media_3002");
assert.equal(dbUrl.searchParams.get("schema"), "public");
assert.equal(env.NODE_ENV, "test");
assert.equal(env.EMAIL_DELIVERY_MODE, "resend");
assert.equal(env.EMAIL_RESET_URL, "http://127.0.0.1:5177/reset-password");
if (mode === "--send") {
  assert.equal(process.env.FINDWORK_APPROVED_RESET_JOB_ID, jobId,
    "FINDWORK_APPROVED_RESET_JOB_ID must match the reviewed job ID");
}

async function inspect(db) {
  await db.query("BEGIN READ ONLY");
  const identity = (await db.query(`SELECT current_database() AS name, now() AS db_now,
    (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
      AND rolled_back_at IS NULL) AS migrations`)).rows[0];
  assert.equal(identity.name, "findwork_employer_media_3002");
  assert.equal(identity.migrations, 16);
  const row = (await db.query(`SELECT o.*, t."tokenHash", t."expiresAt", t."consumedAt", t."revokedAt",
    t."emailNormalized" AS "tokenEmail", u."emailNormalized" AS "currentEmail",
    u.status::text AS "userStatus", u."emailVerifiedAt" AS "verifiedAt"
    FROM "PasswordResetOutbox" o JOIN "PasswordResetToken" t ON t.id=o."tokenId"
    JOIN "User" u ON u.id=t."userId" WHERE o.id=$1`, [jobId])).rows[0];
  assert.ok(row, "Exact reset job missing");
  assert.equal(row.currentEmail, "nanhdung840@gmail.com", "Recipient is not allowlisted");
  if (row.status === "SENT") {
    console.log(JSON.stringify({ jobId, status: "SENT", alreadySent: true,
      attempts: row.attemptCount, providerMessageId: row.providerMessageId }));
    await db.query("ROLLBACK");
    return false;
  }
  assert.equal(row.status, "QUEUED", "Reset job is not queued");
  assert.equal(row.attemptCount, 0, "Reset job has already been attempted");
  assert.ok(row.nextAttemptAt <= identity.db_now, "Reset job is not due");
  assert.equal(row.providerMessageId, null);
  assert.equal(row.tokenEmail, row.currentEmail);
  assert.equal(row.userStatus, "ACTIVE");
  assert.ok(row.verifiedAt, "Recipient email is unverified");
  assert.equal(row.consumedAt, null);
  assert.equal(row.revokedAt, null);
  assert.ok(row.expiresAt > identity.db_now, "Reset token expired");
  assert.equal(row.idempotencyKey, `reset:${row.tokenId}`);
  assert.ok(row.payloadCiphertext && row.payloadNonce && row.payloadTag && row.encryptionKeyId,
    "Sealed reset payload is missing");
  const ring = JSON.parse(env.EMAIL_KEYRING_JSON || "{}");
  const key = Buffer.from(ring[row.encryptionKeyId] || "", "base64");
  assert.equal(key.length, 32, "Original outbox key unavailable");
  const decipher = createDecipheriv("aes-256-gcm", key, row.payloadNonce);
  decipher.setAAD(Buffer.from(JSON.stringify(["findwork-outbox-v1", jobId,
    "RESET_PASSWORD", row.tokenId]), "utf8"));
  decipher.setAuthTag(row.payloadTag);
  const payload = JSON.parse(Buffer.concat([decipher.update(row.payloadCiphertext),
    decipher.final()]).toString("utf8"));
  assert.equal(payload.version, 1);
  assert.equal(payload.recipient, row.currentEmail);
  assert.equal(payload.tokenId, row.tokenId);
  assert.equal(payload.expiresAt, row.expiresAt.toISOString());
  assert.equal(payload.resetBaseUrl, env.EMAIL_RESET_URL);
  assert.equal(payload.sender, env.EMAIL_FROM);
  assert.match(payload.rawToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(createHash("sha256").update(payload.rawToken, "utf8").digest("hex"), row.tokenHash);
  console.log(JSON.stringify({ mode: "PREVIEW_ONLY", jobId, recipient: row.currentEmail,
    status: row.status, attempts: row.attemptCount, subject: "Reset your FINDWORK password",
    linkRoute: payload.resetBaseUrl, tokenHidden: true, expiresAt: row.expiresAt }));
  await db.query("ROLLBACK");
  return true;
}

async function main() {
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  let eligible;
  try { eligible = await inspect(db); }
  finally { await db.end(); }
  if (!eligible || mode === "--preview") return;
  require("reflect-metadata");
  Object.assign(process.env, env);
  const { NestFactory } = require("@nestjs/core");
  const { EmailWorkerModule } = require("../dist/workers/email-worker.module.js");
  const { PasswordResetWorker } = require("../dist/infrastructure/email/password-reset.worker.js");
  const app = await NestFactory.createApplicationContext(EmailWorkerModule, { logger: ["error"] });
  try {
    assert.equal(await app.get(PasswordResetWorker).processOne(jobId), true,
      "Approved reset job was not claimed");
  } finally { await app.close(); }
  const verify = new Client({ connectionString: env.DATABASE_URL });
  await verify.connect();
  try {
    const row = (await verify.query(`SELECT status::text AS status, "attemptCount" AS attempts,
      "providerMessageId" AS provider_message_id FROM "PasswordResetOutbox" WHERE id=$1`, [jobId])).rows[0];
    console.log(JSON.stringify({ jobId, status: row.status, attempts: row.attempts,
      providerMessageId: row.provider_message_id }));
    assert.equal(row.status, "SENT");
    assert.equal(row.attempts, 1);
  } finally { await verify.end(); }
}

main().catch((error) => {
  console.error(`ONE_PASSWORD_RESET_EMAIL_FAILED ${error.code || "CHECK_FAILED"}`);
  process.exitCode = 1;
});