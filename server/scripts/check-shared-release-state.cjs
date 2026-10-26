// Read-only release gate for the existing shared integration database.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");
const env = dotenv.parse(readFileSync(path.resolve(__dirname, "../.env.employer-media.local")));
const url = new URL(env.DATABASE_URL);
assert.equal(url.protocol, "postgresql:");
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "5432");
assert.equal(url.pathname, "/findwork_employer_media_3002");
assert.equal(url.searchParams.get("schema"), "public");
if (env.FINDWORK_EXPECTED_DATABASE) assert.equal(env.FINDWORK_EXPECTED_DATABASE, "findwork_employer_media_3002");

async function main() {
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  try {
    await db.query("BEGIN READ ONLY");
    const result = await db.query(`SELECT current_database() AS name,
      (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NOT NULL) AS migrations,
      (SELECT count(*)::int FROM "SystemUserRole" sur JOIN "Role" r ON r.id=sur."roleId"
        WHERE r."systemCode"='SUPER_ADMIN') AS super_admins`);
    assert.equal(result.rows[0].name, "findwork_employer_media_3002");
    console.log(JSON.stringify({ database: result.rows[0].name,
      migrations: result.rows[0].migrations, superAdmins: result.rows[0].super_admins,
      transaction: "READ ONLY" }));
    await db.query("ROLLBACK");
  } finally { await db.end(); }
}
main().catch((error) => { console.error(`SHARED_STATE_CHECK_FAILED ${error.message}`); process.exitCode = 1; });
