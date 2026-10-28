// Restricted operator action for the one existing demo Super Admin. Never logs credentials.
const assert = require("node:assert/strict");
const { randomUUID, createHash } = require("node:crypto");
const { readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");
const { PasswordService } = require("../dist/modules/auth/services/password.service.js");

const ADMIN_ID = "4fe77acf-9cb8-4d73-a500-28591b0a4204";
const CURRENT_EMAIL = "findwork-demo-admin-20261028@vieclamnhanh.io.vn";
const TARGET_EMAIL = "anhdungn226789@gmail.com";
const EXPECTED_CLUSTER = "7668346635138088784";
const EXPECTED_OID = "44985";
const EXPECTED_DB = "findwork_employer_media_3002";

function assertPasswordPolicy(password) {
  assert.equal(typeof password, "string", "NEW_PASSWORD_TYPE");
  assert.ok(password.length >= 16 && password.length <= 128, "NEW_PASSWORD_LENGTH");
  assert.equal(password.trim(), password, "NEW_PASSWORD_WHITESPACE");
  assert.ok(!/[\r\n\0]/.test(password), "NEW_PASSWORD_CONTROL");
}

function parsePrivatePassword(contents) {
  const lines = contents.split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, 1, "PASSWORD_FILE_SHAPE");
  assert.ok(lines[0].startsWith("NEW_ADMIN_PASSWORD="), "PASSWORD_FILE_KEY");
  const password = lines[0].slice("NEW_ADMIN_PASSWORD=".length);
  assertPasswordPolicy(password);
  return password;
}

function assertDbUrl(raw) {
  const url = new URL(raw);
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol), "DB_PROTOCOL");
  assert.equal(url.hostname, "127.0.0.1", "DB_HOST");
  assert.equal(url.port, "5432", "DB_PORT");
  assert.equal(url.pathname, `/${EXPECTED_DB}`, "DB_NAME");
  assert.equal(url.searchParams.get("schema"), "public", "DB_SCHEMA");
  return url;
}

async function identity(db) {
  const row = (await db.query(`SELECT current_database() AS db, current_schema() AS schema,
    host(inet_server_addr()) AS host, inet_server_port() AS port,
    (SELECT oid::text FROM pg_database WHERE datname=current_database()) AS oid,
    (pg_control_system()).system_identifier::text AS cluster`)).rows[0];
  assert.deepEqual(row, { db: EXPECTED_DB, schema: "public", host: "127.0.0.1",
    port: 5432, oid: EXPECTED_OID, cluster: EXPECTED_CLUSTER }, "DB_IDENTITY");
  return row;
}

async function roleFingerprint(db) {
  const roles = (await db.query(`SELECT r.id::text, r."systemCode", sr."assignedByUserId"::text
    FROM "SystemUserRole" sr JOIN "Role" r ON r.id=sr."roleId"
    WHERE sr."userId"=$1 ORDER BY r.id`, [ADMIN_ID])).rows;
  const direct = (await db.query(`SELECT p.id::text, p.code, sp.effect::text,
    sp."dataScope"::text, sp."expiresAt", sp."assignedByUserId"::text
    FROM "SystemUserPermission" sp JOIN "Permission" p ON p.id=sp."permissionId"
    WHERE sp."userId"=$1 ORDER BY p.id`, [ADMIN_ID])).rows;
  const digest = createHash("sha256").update(JSON.stringify({ roles, direct })).digest("hex");
  return { roles: roles.length, directPermissions: direct.length, digest };
}

async function checkAccount(db, passwords, expectedEmail = CURRENT_EMAIL) {
  await identity(db);
  const admins = (await db.query(`SELECT DISTINCT u.id::text FROM "User" u
    JOIN "SystemUserRole" sr ON sr."userId"=u.id
    JOIN "Role" r ON r.id=sr."roleId"
    WHERE r."systemCode"='SUPER_ADMIN' AND r.kind='SYSTEM' AND r."isActive"=true
      AND r."isProtected"=true`)).rows;
  assert.equal(admins.length, 1, "ADMIN_COUNT");
  assert.equal(admins[0].id, ADMIN_ID, "ADMIN_ID");
  const account = (await db.query(`SELECT id::text, email, "emailNormalized", "passwordHash",
    status::text, "emailVerifiedAt" FROM "User" WHERE id=$1`, [ADMIN_ID])).rows[0];
  assert.ok(account, "ADMIN_MISSING");
  assert.equal(account.emailNormalized, expectedEmail, "ADMIN_EMAIL_CHANGED");
  assert.equal(account.status, "ACTIVE", "ADMIN_INACTIVE");
  const target = (await db.query('SELECT id::text FROM "User" WHERE "emailNormalized"=$1', [TARGET_EMAIL])).rows;
  assert.equal(target.length, 0, "TARGET_EMAIL_OCCUPIED");
  assert.equal(await passwords.verify(account.passwordHash, passwords.current), true,
    "CURRENT_CREDENTIAL_INVALID");
  assert.equal(await passwords.verify(account.passwordHash, passwords.next), false,
    "NEW_PASSWORD_MUST_DIFFER");
  return { account, roles: await roleFingerprint(db) };
}

async function login(email, password) {
  const response = await fetch("http://127.0.0.1:3002/api/v1/auth/login", {
    method: "POST", headers: { Origin: "http://127.0.0.1:5177", "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(10000),
  });
  return { status: response.status, body: response.ok ? await response.json() : null };
}

async function authGet(route, token) {
  const response = await fetch(`http://127.0.0.1:3002/api/v1${route}`, {
    headers: { Origin: "http://127.0.0.1:5177", Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  return { status: response.status, body: response.ok ? await response.json() : null };
}

async function main() {
  const mode = process.argv[2];
  assert.ok(process.argv.length === 3 && ["--dry-run", "--apply"].includes(mode), "MODE_REQUIRED");
  if (mode === "--apply") {
    assert.equal(process.env.FINDWORK_ADMIN_CREDENTIAL_CHANGE_APPLY, "YES", "APPLY_GATE");
  }
  const dbFile = process.env.FINDWORK_ADMIN_DB_ENV_FILE;
  const passwordFile = process.env.FINDWORK_ADMIN_PASSWORD_FILE;
  const recordFile = process.env.FINDWORK_ADMIN_CURRENT_RECORD_FILE;
  assert.ok([dbFile, passwordFile, recordFile].every((x) => x && path.isAbsolute(x)), "PRIVATE_PATHS_REQUIRED");
  const env = dotenv.parse(readFileSync(dbFile));
  assertDbUrl(env.DATABASE_URL);
  const record = JSON.parse(readFileSync(recordFile, "utf8"));
  assert.equal(record.email, CURRENT_EMAIL, "CREDENTIAL_RECORD_EMAIL");
  assert.ok(typeof record.password === "string" && record.password.length >= 16,
    "CREDENTIAL_RECORD_PASSWORD");
  const next = parsePrivatePassword(readFileSync(passwordFile, "utf8"));
  const passwordService = new PasswordService();
  const passwords = { current: record.password, next,
    verify: (hash, value) => passwordService.verify(hash, value) };
  const db = new Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  await db.connect();
  let committed = false;
  try {
    await db.query("BEGIN READ ONLY");
    const before = await checkAccount(db, passwords);
    const sessionCount = (await db.query(`SELECT count(*)::int AS n FROM "AuthSession"
      WHERE "userId"=$1 AND "revokedAt" IS NULL`, [ADMIN_ID])).rows[0].n;
    await db.query("ROLLBACK");
    console.log(JSON.stringify({ mode: "DRY_RUN_PASS", database: EXPECTED_DB, cluster: EXPECTED_CLUSTER,
      adminId: ADMIN_ID, targetUnused: true, currentCredentialAuthenticated: true,
      newPasswordPolicy: "PASS", roles: before.roles.roles,
      directPermissions: before.roles.directPermissions, activeSessions: sessionCount }));
    if (mode !== "--apply") return;

    // Capture one pre-change access session; the transaction must revoke it.
    const oldLogin = await login(CURRENT_EMAIL, record.password);
    assert.equal(oldLogin.status, 200, "OLD_LOGIN_PREFLIGHT");
    assert.equal(oldLogin.body?.user?.id, ADMIN_ID, "OLD_LOGIN_ID");
    const oldAccessToken = oldLogin.body.accessToken;
    assert.ok(typeof oldAccessToken === "string", "OLD_ACCESS_TOKEN");
    const hash = await passwordService.hash(next);
    assert.ok(hash.startsWith("$argon2id$"), "ARGON2_HASH");

    await db.query("BEGIN");
    try {
      await db.query('SELECT id FROM "User" WHERE id=$1 FOR UPDATE', [ADMIN_ID]);
      const locked = await checkAccount(db, passwords);
      assert.equal(locked.roles.digest, before.roles.digest, "ROLE_STATE_CHANGED");
      const now = new Date();
      const changed = await db.query(`UPDATE "User" SET email=$2, "emailNormalized"=$2,
        "passwordHash"=$3, "emailVerifiedAt"=NULL, "updatedAt"=$4
        WHERE id=$1 AND "emailNormalized"=$5 RETURNING id::text`,
        [ADMIN_ID, TARGET_EMAIL, hash, now, CURRENT_EMAIL]);
      assert.equal(changed.rowCount, 1, "ADMIN_UPDATE_COUNT");
      await db.query(`UPDATE "PasswordResetToken" SET "revokedAt"=$2
        WHERE "userId"=$1 AND "consumedAt" IS NULL AND "revokedAt" IS NULL`, [ADMIN_ID, now]);
      await db.query(`UPDATE "EmailVerificationToken" SET "revokedAt"=$2
        WHERE "userId"=$1 AND "consumedAt" IS NULL AND "revokedAt" IS NULL`, [ADMIN_ID, now]);
      await db.query(`UPDATE "PasswordResetOutbox" SET status='CANCELLED',
        "payloadCiphertext"=NULL, "payloadNonce"=NULL, "payloadTag"=NULL,
        "encryptionKeyId"=NULL, "claimedBy"=NULL, "leaseUntil"=NULL,
        "cancelledAt"=$2, "lastErrorCode"='ADMIN_CREDENTIAL_CHANGE', "updatedAt"=$2
        WHERE "tokenId" IN (SELECT id FROM "PasswordResetToken" WHERE "userId"=$1)
          AND status IN ('QUEUED','PROCESSING')`, [ADMIN_ID, now]);
      await db.query(`UPDATE "EmailOutbox" SET status='CANCELLED',
        "payloadCiphertext"=NULL, "payloadNonce"=NULL, "payloadTag"=NULL,
        "encryptionKeyId"=NULL, "claimedBy"=NULL, "leaseUntil"=NULL,
        "cancelledAt"=$2, "lastErrorCode"='ADMIN_CREDENTIAL_CHANGE', "updatedAt"=$2
        WHERE kind='VERIFY_EMAIL' AND "verificationTokenId" IN
          (SELECT id FROM "EmailVerificationToken" WHERE "userId"=$1)
          AND status IN ('QUEUED','PROCESSING')`, [ADMIN_ID, now]);
      const revoked = await db.query(`UPDATE "AuthSession" SET "revokedAt"=$2
        WHERE "userId"=$1 AND "revokedAt" IS NULL RETURNING id`, [ADMIN_ID, now]);
      const auditId = randomUUID();
      await db.query(`INSERT INTO "AuditLog" (id,"actorUserId",action,"targetType",
        "targetId","beforeData","afterData","metadata","createdAt")
        VALUES ($1,$2,'admin.demo_credentials.change','User',$3,$4::jsonb,$5::jsonb,$6::jsonb,$7)`,
        [auditId, ADMIN_ID, ADMIN_ID, JSON.stringify({ email: CURRENT_EMAIL }),
          JSON.stringify({ email: TARGET_EMAIL, emailVerified: false }),
          JSON.stringify({ sessionsRevoked: revoked.rowCount }), now]);
      assert.equal((await roleFingerprint(db)).digest, before.roles.digest, "ROLES_NOT_PRESERVED");
      await db.query("COMMIT");
      committed = true;
      console.log(JSON.stringify({ mode: "APPLIED", adminId: ADMIN_ID, auditId,
        sessionsRevoked: revoked.rowCount, emailVerificationReset: true }));
    } catch (error) {
      await db.query("ROLLBACK").catch(() => {});
      throw error;
    }

    const newLogin = await login(TARGET_EMAIL, next);
    assert.equal(newLogin.status, 200, "NEW_LOGIN_FAILED");
    assert.equal(newLogin.body?.user?.id, ADMIN_ID, "NEW_LOGIN_ID");
    const access = newLogin.body.accessToken;
    assert.ok(typeof access === "string", "NEW_ACCESS_TOKEN");
    const me = await authGet("/auth/me", access);
    assert.equal(me.status, 200, "NEW_ME_FAILED");
    assert.equal(me.body?.id, ADMIN_ID, "NEW_ME_ID");
    const admin = await authGet("/admin/users?page=1&pageSize=1", access);
    assert.equal(admin.status, 200, "NEW_ADMIN_ACCESS_FAILED");
    assert.equal((await login(CURRENT_EMAIL, record.password)).status, 401, "OLD_EMAIL_LOGIN_STILL_WORKS");
    assert.equal((await login(TARGET_EMAIL, record.password)).status, 401, "OLD_PASSWORD_STILL_WORKS");
    assert.equal((await authGet("/auth/me", oldAccessToken)).status, 401, "OLD_SESSION_STILL_WORKS");
    const final = (await db.query(`SELECT id::text, "emailNormalized", "emailVerifiedAt"
      FROM "User" WHERE id=$1`, [ADMIN_ID])).rows[0];
    assert.equal(final.id, ADMIN_ID, "FINAL_ID");
    assert.equal(final.emailNormalized, TARGET_EMAIL, "FINAL_EMAIL");
    assert.equal(final.emailVerifiedAt, null, "EMAIL_VERIFICATION_NOT_RESET");
    assert.equal((await roleFingerprint(db)).digest, before.roles.digest, "FINAL_ROLES_CHANGED");
    const current = JSON.parse(readFileSync(recordFile, "utf8"));
    assert.equal(current.email, CURRENT_EMAIL, "PRIVATE_RECORD_CHANGED_CONCURRENTLY");
    writeFileSync(recordFile, JSON.stringify({ ...current, email: TARGET_EMAIL,
      password: next, updatedAtUtc: new Date().toISOString() }, null, 2) + "\n", { flag: "w" });
    console.log(JSON.stringify({ mode: "VERIFIED", adminId: ADMIN_ID,
      newLogin: true, adminAccess: true, oldEmailRejected: true,
      oldPasswordRejected: true, oldSessionRejected: true,
      rolesPreserved: true, emailVerified: false, privateRecordUpdated: true }));
  } finally {
    if (!committed) await db.query("ROLLBACK").catch(() => {});
    await db.end();
  }
}

if (require.main === module) main().catch((error) => {
  const reason = error.message?.startsWith("APPLY_GATE") ? "APPLY_GATE" : error.code || "CHECK_FAILED";
  console.error(`ADMIN_CREDENTIAL_CHANGE_FAILED ${reason}`);
  process.exitCode = 1;
});

module.exports = { assertPasswordPolicy, parsePrivatePassword, assertDbUrl };
