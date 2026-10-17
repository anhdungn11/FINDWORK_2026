// Read-only identity and fixture prerequisite check. Never prints connection credentials.
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.test");
const expectedRoles = {
  CANDIDATE: { "profile.view": "OWN", "profile.update": "OWN", "resume.view": "OWN", "resume.create": "OWN", "resume.update": "OWN", "application.create": "OWN", "application.view": "OWN" },
  SUPPORT_ADMIN: { "user.view": "SYSTEM", "company.view": "SYSTEM", "job.view": "SYSTEM" },
  MODERATION_ADMIN: { "job.moderate": "SYSTEM" },
};
const companyPermissions = ["company.view", "company.update", "application.view", "application.review"];
const requiredTables = ["_prisma_migrations", "User", "AuthSession", "Company", "CompanyMember", "Role", "RolePermission", "Permission", "SystemUserRole", "JobCategory", "Job", "CandidateOnboardingDraft", "CandidateProfile", "Resume", "ResumeVersion", "Application", "ApplicationStatusHistory", "AuditLog"];

function fail(reason) { throw new Error(reason); }

async function main() {
  if (!fs.existsSync(envPath)) fail("BLOCKED: server/.env.test is missing; no database connection was attempted.");
  const env = dotenv.parse(fs.readFileSync(envPath));
  if (env.NODE_ENV !== "test") fail("BLOCKED: .env.test must set NODE_ENV=test.");
  if (env.API_PREFIX !== "api/v1") fail("BLOCKED: .env.test must set API_PREFIX=api/v1 for this suite.");
  if (!env.JWT_ACCESS_SECRET || env.JWT_ACCESS_SECRET.length < 32 ||
      !env.REFRESH_TOKEN_PEPPER || env.REFRESH_TOKEN_PEPPER.length < 32 ||
      env.JWT_ACCESS_SECRET === env.REFRESH_TOKEN_PEPPER) {
    fail("BLOCKED: distinct test JWT secret and refresh pepper of at least 32 characters are required.");
  }
  let url;
  try { url = new URL(env.DATABASE_URL); } catch { fail("BLOCKED: .env.test DATABASE_URL is invalid."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      (url.port || "5432") !== "5432" ||
      decodeURIComponent(url.pathname.slice(1)) !== "findwork_test" ||
      url.searchParams.get("schema") !== "public") {
    fail("BLOCKED: URL must target local findwork_test/public on port 5432.");
  }
  const client = new Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000,
    options: "-c default_transaction_read_only=on" });
  try {
    await client.connect();
    const identity = (await client.query("SELECT current_database() AS database, inet_server_addr()::text AS address, inet_server_port() AS port, current_schema() AS schema")).rows[0];
    if (identity?.database !== "findwork_test" || identity?.port !== 5432 || identity?.schema !== "public" ||
        !["127.0.0.1/32", "::1/128", "127.0.0.1", "::1"].includes(identity?.address)) {
      fail("BLOCKED: connected database identity is not local findwork_test/public:5432.");
    }
    console.log("PASS: connected database is local findwork_test/public:5432 (read-only session).");
    const foundTables = new Set((await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)", [requiredTables])).rows.map((row) => row.table_name));
    const missingTables = requiredTables.filter((name) => !foundTables.has(name));
    if (missingTables.length) fail(`BLOCKED: missing tables: ${missingTables.join(", ")}.`);
    const migrationDir = path.join(root, "prisma", "migrations");
    const migrationNames = fs.readdirSync(migrationDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    const migrationRows = (await client.query('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"')).rows;
    const applied = new Set(migrationRows.filter((row) => row.finished_at && !row.rolled_back_at).map((row) => row.migration_name));
    const pending = migrationNames.filter((name) => !applied.has(name));
    if (pending.length || migrationRows.some((row) => !row.finished_at && !row.rolled_back_at)) {
      fail(`BLOCKED: test schema migrations are incomplete (${pending.length} local migrations pending).`);
    }
    const codes = [...new Set([...companyPermissions, ...Object.values(expectedRoles).flatMap((grants) => Object.keys(grants))])];
    const permissionRows = (await client.query('SELECT code FROM "Permission" WHERE code = ANY($1) AND "isDeprecated" = false', [codes])).rows;
    const presentCodes = new Set(permissionRows.map((row) => row.code));
    const missingCodes = codes.filter((code) => !presentCodes.has(code));
    if (missingCodes.length) fail(`BLOCKED: missing active permission codes: ${missingCodes.join(", ")}.`);
    const grants = (await client.query(`
      SELECT r."systemCode", p.code, rp."dataScope"
      FROM "Role" r JOIN "RolePermission" rp ON rp."roleId" = r.id
      JOIN "Permission" p ON p.id = rp."permissionId"
      WHERE r.kind = 'SYSTEM' AND r."isActive" = true
        AND r."systemCode" = ANY($1) AND p."isDeprecated" = false
    `, [Object.keys(expectedRoles)])).rows;
    const grantSet = new Set(grants.map((row) => `${row.systemCode}:${row.code}:${row.dataScope}`));
    const missingGrants = Object.entries(expectedRoles).flatMap(([role, permissions]) =>
      Object.entries(permissions).filter(([code, scope]) => !grantSet.has(`${role}:${code}:${scope}`)).map(([code]) => `${role}:${code}`));
    if (missingGrants.length) fail(`BLOCKED: missing scoped system grants: ${missingGrants.join(", ")}.`);
    console.log(`PASS: ${requiredTables.length} required tables, ${migrationNames.length} migrations, permission registry and scoped system roles are ready.`);
    console.log("READY: read-only preflight passed; E2E still requires explicit authorization.");
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  // PostgreSQL connection errors can contain credentials. Emit only our checks or an error code.
  console.error(error.message?.startsWith("BLOCKED:") ? error.message : `BLOCKED: database preflight failed (${error.code || "CONNECTION_OR_QUERY_ERROR"}).`);
  process.exitCode = 2;
});
