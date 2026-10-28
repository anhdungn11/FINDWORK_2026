// Review or process exactly one verification outbox ID. Never starts the general worker loop.
const assert = require("node:assert/strict");
const { createDecipheriv, createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const [mode, jobId] = process.argv.slice(2);
assert.ok(["--preview", "--send"].includes(mode) && /^[a-f0-9-]{36}$/i.test(jobId || ""),
  "Usage: node scripts/one-verification-email.cjs --preview|--send JOB_ID");
const envFile = process.env.FINDWORK_RECRUITMENT_ENV_FILE;
assert.ok(envFile && path.isAbsolute(envFile), "Set FINDWORK_RECRUITMENT_ENV_FILE to the verified private environment file");
const env = dotenv.parse(readFileSync(envFile));
const dbUrl = new URL(env.DATABASE_URL);
assert.equal(dbUrl.hostname, "127.0.0.1");
assert.equal(dbUrl.port, "5432");
assert.equal(dbUrl.pathname, "/findwork_employer_media_3002");
assert.equal(dbUrl.searchParams.get("schema"), "public");
if (mode === "--send") {
  assert.equal(process.env.FINDWORK_APPROVED_VERIFICATION_JOB_ID, jobId,
    "Set FINDWORK_APPROVED_VERIFICATION_JOB_ID to the reviewed job ID before sending");
}

async function main() {
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  try {
    await db.query("BEGIN READ ONLY");
    assert.equal((await db.query("SELECT current_database() AS name")).rows[0].name,
      "findwork_employer_media_3002");
    const row = (await db.query(`SELECT o.*, t."tokenHash", t."expiresAt", t."consumedAt", t."revokedAt",
      t."emailNormalized" AS "tokenEmail", u."emailNormalized" AS "currentEmail",
      u.status::text AS "userStatus", u."emailVerifiedAt" AS "verifiedAt"
      FROM "EmailOutbox" o JOIN "EmailVerificationToken" t ON t.id=o."verificationTokenId"
      JOIN "User" u ON u.id=t."userId" WHERE o.id=$1`, [jobId])).rows[0];
    assert.ok(row && row.kind === "VERIFY_EMAIL" && row.status === "QUEUED", "Verification job must be queued");
    assert.equal(row.currentEmail, "nanhdung840@gmail.com", "Recipient is not the allowlisted mailbox");
    assert.equal(row.tokenEmail, row.currentEmail);
    assert.equal(row.userStatus, "ACTIVE");
    assert.equal(row.verifiedAt, null, "Account is already verified");
    assert.equal(row.consumedAt, null);
    assert.equal(row.revokedAt, null);
    assert.ok(row.expiresAt > new Date(), "Verification token expired");
    assert.ok(row.nextAttemptAt <= new Date() && row.attemptCount < row.maxAttempts);
    assert.equal(row.idempotencyKey, `verify:${row.verificationTokenId}`);
    const ring = JSON.parse(env.EMAIL_KEYRING_JSON || "{}");
    const key = Buffer.from(ring[row.encryptionKeyId] || "", "base64");
    assert.equal(key.length, 32, "Original outbox key missing");
    const decipher = createDecipheriv("aes-256-gcm", key, row.payloadNonce);
    decipher.setAAD(Buffer.from(JSON.stringify(["findwork-outbox-v1", jobId,
      "VERIFY_EMAIL", row.verificationTokenId]), "utf8"));
    decipher.setAuthTag(row.payloadTag);
    const payload = JSON.parse(Buffer.concat([decipher.update(row.payloadCiphertext),
      decipher.final()]).toString("utf8"));
    assert.equal(payload.recipient, row.currentEmail);
    assert.equal(payload.tokenId, row.verificationTokenId);
    assert.equal(createHash("sha256").update(payload.rawToken, "utf8").digest("hex"), row.tokenHash);
    assert.equal(payload.verificationBaseUrl, env.EMAIL_VERIFY_URL);
    const url = new URL(payload.verificationBaseUrl);
    assert.ok(!url.username && !url.password && !url.search && !url.hash);
    if (url.protocol === "http:") {
      assert.equal(env.NODE_ENV, "test");
      assert.equal(url.toString(), "http://127.0.0.1:5177/verify-email");
    } else assert.equal(url.protocol, "https:");
    console.log(JSON.stringify({ mode: "PREVIEW_ONLY", jobId, recipient: row.currentEmail,
      subject: "Verify your FINDWORK email", verificationRoute: url.toString(),
      tokenPresent: true, expiresAt: row.expiresAt, idempotencyKey: row.idempotencyKey }));
    await db.query("ROLLBACK");
  } finally { await db.end(); }
  if (mode !== "--send") return;
  require("reflect-metadata");
  Object.assign(process.env, env);
  const { NestFactory } = require("@nestjs/core");
  const { EmailWorkerModule } = require("../dist/workers/email-worker.module.js");
  const { EmailDeliveryWorker } = require("../dist/infrastructure/email/email-delivery.worker.js");
  const app = await NestFactory.createApplicationContext(EmailWorkerModule, { logger: ["error"] });
  try {
    assert.equal(await app.get(EmailDeliveryWorker).processOne(jobId), true,
      "Reviewed verification job was not claimed");
  } finally { await app.close(); }
  const verify = new Client({ connectionString: env.DATABASE_URL });
  await verify.connect();
  try {
    const row = (await verify.query('SELECT status::text AS status, "providerMessageId" AS id FROM "EmailOutbox" WHERE id=$1', [jobId])).rows[0];
    console.log(JSON.stringify({ jobId, status: row.status, providerMessageIdPresent: Boolean(row.id) }));
    assert.equal(row.status, "SENT");
  } finally { await verify.end(); }
}

main().catch((error) => {
  console.error(`ONE_VERIFICATION_EMAIL_FAILED ${error.code || "CHECK_FAILED"}`);
  process.exitCode = 1;
});
