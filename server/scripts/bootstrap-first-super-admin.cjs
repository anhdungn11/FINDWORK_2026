// One-time, operator-run bootstrap. No public endpoint and no existing user promotion.
// Credentials are accepted only through the process environment and never logged.
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const argon2 = require("argon2");
if (process.env.FINDWORK_BOOTSTRAP_ENV_FILE) {
  const { readFileSync } = require("node:fs");
  const { parse } = require("dotenv");
  const fromFile = parse(readFileSync(process.env.FINDWORK_BOOTSTRAP_ENV_FILE));
  if (!fromFile.DATABASE_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL !== fromFile.DATABASE_URL)) {
    throw new Error("Bootstrap environment file has no DATABASE_URL or conflicts with the process environment");
  }
  process.env.DATABASE_URL = fromFile.DATABASE_URL;
}

const apply = process.argv.length === 3 && process.argv[2] === "--apply";
if (!(process.argv.length === 2 || apply)) throw new Error("Usage: node scripts/bootstrap-first-super-admin.cjs [--apply]");
const expected = process.env.ADMIN_BOOTSTRAP_EXPECTED_DATABASE;
if (!expected || !/^[a-z][a-z0-9_]{2,62}$/.test(expected)) {
  throw new Error("ADMIN_BOOTSTRAP_EXPECTED_DATABASE must name the exact intended database");
}
const url = new URL(process.env.DATABASE_URL || "postgresql://invalid/invalid");
if (!["postgres:", "postgresql:"].includes(url.protocol) || decodeURIComponent(url.pathname.slice(1)) !== expected ||
    url.searchParams.get("schema") !== "public") {
  throw new Error("DATABASE_URL must target the expected database and public schema");
}
if (apply && (process.env.ADMIN_BOOTSTRAP_ALLOW_WRITE !== "YES" ||
    (expected === "findwork_employer_media_3002" && process.env.ADMIN_BOOTSTRAP_ALLOW_SHARED_DB !== "YES"))) {
  throw new Error("Explicit bootstrap write authorization is required");
}
const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || "").trim();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || "";
if (apply && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320 ||
    password.length < 16 || password.length > 128 || password.trim() !== password)) {
  throw new Error("A new email and a strong 16–128 character password are required");
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(182481, 1)");
    const identity = (await client.query("SELECT current_database() AS name, current_schema() AS schema")).rows[0];
    if (identity.name !== expected || identity.schema !== "public") throw new Error("Connected database identity mismatch");
    const role = (await client.query(`SELECT id FROM "Role" WHERE "systemCode"='SUPER_ADMIN'
      AND kind='SYSTEM' AND "companyId" IS NULL AND "isActive"=true AND "isProtected"=true`)).rows[0];
    if (!role) throw new Error("Seeded protected SUPER_ADMIN role is missing");
    const grants = (await client.query(`SELECT count(*)::int AS count FROM "RolePermission"
      WHERE "roleId"=$1 AND "dataScope"='SYSTEM'`, [role.id])).rows[0].count;
    if (grants < 1) throw new Error("SUPER_ADMIN has no SYSTEM permissions");
    const current = (await client.query(`SELECT count(*)::int AS count FROM "SystemUserRole" WHERE "roleId"=$1`, [role.id])).rows[0].count;
    if (current !== 0) throw new Error("First SUPER_ADMIN already exists; bootstrap is closed");
    if (!apply) {
      await client.query("ROLLBACK");
      console.log(`BOOTSTRAP_DRY_RUN_OK database=${identity.name} systemGrants=${grants} existingSuperAdmins=0`);
      return;
    }
    const normalized = email.toLowerCase();
    const duplicate = (await client.query(`SELECT 1 FROM "User" WHERE "emailNormalized"=$1`, [normalized])).rowCount;
    if (duplicate) throw new Error("Email already belongs to an account; existing users cannot be promoted by bootstrap");
    const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const userId = randomUUID();
    await client.query(`INSERT INTO "User" (id,email,"emailNormalized","passwordHash",status,"accountType","createdAt","updatedAt")
      VALUES ($1,$2,$3,$4,'ACTIVE',NULL,now(),now())`, [userId, email, normalized, hash]);
    await client.query(`INSERT INTO "SystemUserRole" ("userId","roleId","assignedByUserId","createdAt")
      VALUES ($1,$2,NULL,now())`, [userId, role.id]);
    await client.query(`INSERT INTO "AuditLog" (id,"actorUserId",action,"targetType","targetId","createdAt")
      VALUES ($1,$2::uuid,'admin.bootstrap.first_super_admin','User',$3::text,now())`, [randomUUID(), userId, userId]);
    await client.query("COMMIT");
    console.log(`BOOTSTRAP_APPLIED database=${identity.name} accountCreated=true role=SUPER_ADMIN auditWritten=true`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { await client.end(); }
}
main().catch((error) => { console.error(`BOOTSTRAP_BLOCKED ${error.message}`); process.exitCode = 1; });
