// Preview one allowlisted outbox job. Sending requires a separate explicit job-ID gate.
const assert = require("node:assert/strict");
const { createDecipheriv } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { validateRecruitmentApplicationUrl } = require("./recruitment-application-url.cjs");

const [mode, jobId] = process.argv.slice(2);
assert.ok(["--preview", "--send"].includes(mode) && /^[a-f0-9-]{36}$/i.test(jobId || ""),
  "Usage: node scripts/one-recruitment-email.cjs --preview|--send JOB_ID");
const envFile = process.env.FINDWORK_RECRUITMENT_ENV_FILE;
assert.ok(envFile && path.isAbsolute(envFile), "Set FINDWORK_RECRUITMENT_ENV_FILE to the verified private backend environment file");
const env = dotenv.parse(readFileSync(envFile));
const dbUrl = new URL(env.DATABASE_URL);
assert.equal(dbUrl.hostname, "127.0.0.1");
assert.equal(dbUrl.port, "5432");
assert.equal(dbUrl.pathname, "/findwork_employer_media_3002");
assert.equal(dbUrl.searchParams.get("schema"), "public");
if (mode === "--send") {
  assert.equal(process.env.FINDWORK_APPROVED_RECRUITMENT_JOB_ID, jobId,
    "Set FINDWORK_APPROVED_RECRUITMENT_JOB_ID to the reviewed job ID before sending");
}

async function main() {
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  let preview;
  try {
    await db.query("BEGIN READ ONLY");
    const identity = (await db.query("SELECT current_database() AS name")).rows[0].name;
    assert.equal(identity, "findwork_employer_media_3002");
    const row = (await db.query(`SELECT o.*, u."emailNormalized" AS "currentEmail",
      u.status::text AS "userStatus", u."emailVerifiedAt" AS "verifiedAt"
      FROM "RecruitmentEmailOutbox" o JOIN "User" u ON u.id=o."recipientUserId"
      WHERE o.id=$1`, [jobId])).rows[0];
    assert.ok(row && row.status === "QUEUED", "Job must be queued");
    assert.equal(row.currentEmail, "nanhdung840@gmail.com", "Recipient is not the allowlisted mailbox");
    assert.equal(row.userStatus, "ACTIVE");
    assert.ok(row.verifiedAt, "Recipient email is unverified");
    const ring = JSON.parse(env.EMAIL_KEYRING_JSON || "{}");
    const key = Buffer.from(ring[row.encryptionKeyId] || "", "base64");
    assert.equal(key.length, 32, "Missing original outbox key");
    const decipher = createDecipheriv("aes-256-gcm", key, row.payloadNonce);
    decipher.setAAD(Buffer.from(JSON.stringify(["findwork-outbox-v1", jobId,
      "RECRUITMENT_EMAIL", row.applicationId]), "utf8"));
    decipher.setAuthTag(row.payloadTag);
    const payload = JSON.parse(Buffer.concat([decipher.update(row.payloadCiphertext),
      decipher.final()]).toString("utf8"));
    assert.equal(payload.recipient, "nanhdung840@gmail.com");
    assert.equal(payload.recipientUserId, row.recipientUserId);
    assert.equal(payload.kind, row.kind);
    assert.equal(payload.applicationId, row.applicationId);
    assert.equal(payload.interviewId, row.interviewId);
    let interview;
    if (payload.kind === "INTERVIEW_INVITATION") {
      const actual = (await db.query(`SELECT i."applicationId" AS "applicationId",
        i.status::text AS status, i."scheduledAt" AS "scheduledAt",
        i."durationMinutes" AS "durationMinutes", i.type::text AS type,
        i.location, i."meetingUrl" AS "meetingUrl", c.name AS "companyName",
        a."submittedAt" AS "submittedAt", p."userId" AS "candidateUserId"
        FROM "Interview" i JOIN "Application" a ON a.id=i."applicationId"
          AND a."companyId"=i."companyId"
        JOIN "Company" c ON c.id=i."companyId"
        JOIN "CandidateProfile" p ON p.id=a."candidateProfileId"
        WHERE i.id=$1`, [row.interviewId])).rows[0];
      assert.ok(actual && actual.applicationId === row.applicationId && actual.submittedAt,
        "Interview application is missing or unsubmitted");
      assert.equal(actual.candidateUserId, row.recipientUserId);
      assert.ok(["SCHEDULED", "RESCHEDULED"].includes(actual.status), "Interview is not scheduled");
      assert.equal(actual.scheduledAt.toISOString(), payload.scheduledAt,
        "Interview schedule changed since enqueue");
      interview = { companyName: actual.companyName,
        scheduledAt: actual.scheduledAt.toISOString(), durationMinutes: actual.durationMinutes,
        type: actual.type, location: actual.location, meetingUrl: actual.meetingUrl };
    }
    const applicationUrl = validateRecruitmentApplicationUrl(payload.applicationBaseUrl, env.NODE_ENV);
    applicationUrl.pathname = `${applicationUrl.pathname.replace(/\/$/, "")}/${encodeURIComponent(row.applicationId)}`;
    const { renderRecruitmentNotice } = require("../dist/infrastructure/email/email-provider.service.js");
    const rendered = renderRecruitmentNotice({ to: payload.recipient, from: payload.sender,
      url: applicationUrl.toString(), jobTitle: payload.jobTitle, kind: payload.kind,
      status: payload.status || undefined, scheduledAt: payload.scheduledAt || undefined,
      idempotencyKey: row.idempotencyKey, interview });
    preview = { jobId, event: payload.kind, idempotencyKey: row.idempotencyKey, ...rendered };
    console.log(JSON.stringify({ mode: "PREVIEW_ONLY", ...preview }));
    await db.query("ROLLBACK");
  } finally {
    await db.end();
  }
  if (mode !== "--send") return;
  // No generic worker loop is started. Only the exact reviewed job can be claimed.
  require("reflect-metadata");
  Object.assign(process.env, env);
  const { NestFactory } = require("@nestjs/core");
  const { EmailWorkerModule } = require("../dist/workers/email-worker.module.js");
  const { RecruitmentNotificationWorker } = require("../dist/infrastructure/email/recruitment-notification.worker.js");
  const app = await NestFactory.createApplicationContext(EmailWorkerModule, { logger: ["error"] });
  try {
    assert.equal(await app.get(RecruitmentNotificationWorker).processOne(jobId), true,
      "Reviewed job was not claimed");
  } finally {
    await app.close();
  }
  const verify = new Client({ connectionString: env.DATABASE_URL });
  await verify.connect();
  try {
    const row = (await verify.query('SELECT status::text AS status, "providerMessageId" AS id FROM "RecruitmentEmailOutbox" WHERE id=$1', [jobId])).rows[0];
    console.log(JSON.stringify({ jobId, status: row.status, providerMessageIdPresent: Boolean(row.id) }));
    assert.equal(row.status, "SENT");
  } finally {
    await verify.end();
  }
}

main().catch((error) => {
  console.error(`ONE_RECRUITMENT_EMAIL_FAILED ${error.code || "CHECK_FAILED"}`);
  process.exitCode = 1;
});
