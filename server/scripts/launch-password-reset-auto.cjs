// Private launcher for the reset-only worker. Run `preflight` before `start`.
// Never prints credentials, tokens, recipients, or encrypted payloads.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { Client } = require("pg");
const dotenv = require("dotenv");
const { validateEnvironment } = require("../dist/config/env.validation.js");

const mode = process.argv[2];
assert.ok(["preflight", "start"].includes(mode) && process.argv.length === 3,
  "Usage: node scripts/launch-password-reset-auto.cjs preflight|start");
const root = path.resolve(__dirname, "..");
const privateDir = "D:/FINDWORK_Backups/findwork_review_f938cba61488_20261028_110523/provider-prep";
const base = dotenv.parse(fs.readFileSync("D:/DACSN/Find-Work-Release/server/.env.employer-media.local"));
const resend = dotenv.parse(fs.readFileSync(path.join(privateDir, "resend-test.env")));
const crypto = dotenv.parse(fs.readFileSync(path.join(privateDir, "email-crypto.env")));
const minimal = Object.fromEntries(["SystemRoot", "Path", "TEMP", "TMP", "APPDATA", "LOCALAPPDATA"]
  .map((name) => [name, process.env[name]]).filter(([, value]) => value !== undefined));
const env = { ...minimal, ...base, ...resend, ...crypto, NODE_ENV: "test", PORT: "3002",
  API_PREFIX: "api/v1", FINDWORK_EXPECTED_DATABASE: "findwork_employer_media_3002",
  EMAIL_DELIVERY_MODE: "resend", EMAIL_WORKER_ENABLED: "false",
  EMAIL_INVITATION_DELIVERY_ENABLED: "false", EMAIL_RECRUITMENT_NOTIFICATIONS_ENABLED: "false",
  EMAIL_PASSWORD_RESET_ENABLED: "true", EMAIL_PASSWORD_RESET_AUTO_WORKER_ENABLED: "true",
  EMAIL_PASSWORD_RESET_AUTO_NOT_BEFORE: process.env.FINDWORK_RESET_AUTO_NOT_BEFORE || "" };
const recordPath = path.join(process.env.TEMP, "findwork-reset-auto-worker.pid.json");
const logPath = path.join(process.env.TEMP, "findwork-reset-auto-worker.log");

async function main() {
  const validated = validateEnvironment(env);
  const cutoff = new Date(validated.EMAIL_PASSWORD_RESET_AUTO_NOT_BEFORE);
  const url = new URL(validated.DATABASE_URL);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "5432");
  assert.equal(url.pathname, "/findwork_employer_media_3002");
  assert.equal(url.searchParams.get("schema"), "public");
  const db = new Client({ connectionString: validated.DATABASE_URL,
    options: "-c default_transaction_read_only=on", connectionTimeoutMillis: 5000 });
  await db.connect();
  let summary;
  try {
    await db.query("BEGIN READ ONLY");
    await db.query("SET LOCAL statement_timeout = 5000");
    const identity = (await db.query(`SELECT current_database() AS db, current_schema() AS schema,
      (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
        AND rolled_back_at IS NULL) AS migrations`)).rows[0];
    assert.deepEqual(identity, { db: "findwork_employer_media_3002", schema: "public", migrations: 16 });
    const reset = (await db.query(`SELECT count(*) FILTER (WHERE status='QUEUED' AND "createdAt"<$1)::int AS old_queued,
      count(*) FILTER (WHERE status='QUEUED' AND "createdAt">=$1)::int AS in_scope_queued
      FROM "PasswordResetOutbox"`, [cutoff])).rows[0];
    const recruitment = (await db.query(`SELECT count(*)::int AS queued FROM "RecruitmentEmailOutbox"
      WHERE status='QUEUED'`)).rows[0];
    await db.query("ROLLBACK");
    summary = { database: identity.db, migrations: identity.migrations, cutoff: cutoff.toISOString(),
      resetOldQueuedExcluded: reset.old_queued, resetInScopeQueued: reset.in_scope_queued,
      recruitmentQueuedExcluded: recruitment.queued, generalEmailWorkerEnabled: false };
  } finally { await db.end(); }
  if (mode === "preflight") { console.log(JSON.stringify({ preflight: true, ...summary })); return; }
  assert.equal(process.env.FINDWORK_RESET_AUTO_ACTIVATE, "YES", "Explicit activation marker required");
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: path.dirname(root), encoding: "utf8",
    windowsHide: true, shell: false });
  assert.equal(head.status, 0);
  const lock = fs.openSync(recordPath, "wx");
  try {
    const log = fs.openSync(logPath, "a");
    let child;
    try {
      child = spawn(process.execPath, ["dist/workers/password-reset-email-worker.main.js"],
        { cwd: root, env, detached: true, windowsHide: true, shell: false,
          stdio: ["ignore", log, log] });
      await new Promise((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
      await new Promise((resolve) => setTimeout(resolve, 3000));
      assert.equal(child.exitCode, null, "Reset worker exited during startup");
      child.unref();
    } finally { fs.closeSync(log); }
    fs.writeFileSync(lock, JSON.stringify({ pid: child.pid, head: head.stdout.trim(),
      cutoff: cutoff.toISOString(), startedAt: new Date().toISOString() }));
    console.log(JSON.stringify({ started: true, pid: child.pid, head: head.stdout.trim(), ...summary }));
  } catch (error) { fs.closeSync(lock); fs.unlinkSync(recordPath); throw error; }
  fs.closeSync(lock);
}
main().catch((error) => {
  console.error(`RESET_AUTO_LAUNCHER_FAILED ${error.code || error.message}`);
  process.exitCode = 1;
});
