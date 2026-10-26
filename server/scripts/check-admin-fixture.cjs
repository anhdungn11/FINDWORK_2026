// Read-only identity and role evidence for the isolated frontend acceptance database.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

const root = path.resolve(__dirname, "..");
const env = dotenv.parse(readFileSync(path.join(root, ".env.frontend-acceptance.local")));
const accounts = dotenv.parse(readFileSync(path.join(root, ".env.frontend-acceptance.accounts.local")));
const expected = "findwork_frontend_acceptance_cc7531c3be19";
const url = new URL(env.DATABASE_URL);
assert.equal(url.protocol, "postgresql:");
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "5432");
assert.equal(url.pathname, `/${expected}`);
assert.equal(url.searchParams.get("schema"), "public");
assert.equal(env.FINDWORK_EXPECTED_DATABASE, expected);

async function main() {
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  try {
    await db.query("BEGIN READ ONLY");
    const identity = (await db.query("SELECT current_database() AS name, current_schema() AS schema")).rows[0];
    assert.deepEqual(identity, { name: expected, schema: "public" });
    const users = await db.query(`
      SELECT u.id, u."emailNormalized", u."accountType", u.status,
        COALESCE(array_agg(r."systemCode" ORDER BY r."systemCode")
          FILTER (WHERE r."systemCode" IS NOT NULL AND r.kind='SYSTEM' AND r."isActive"), '{}') AS roles
      FROM "User" u
      LEFT JOIN "SystemUserRole" sr ON sr."userId"=u.id
      LEFT JOIN "Role" r ON r.id=sr."roleId"
      WHERE u."emailNormalized"=ANY($1)
      GROUP BY u.id`, [[accounts.PLATFORM_ADMIN_EMAIL, accounts.CANDIDATE_EMAIL, accounts.EMPLOYER_EMAIL]]);
    const byEmail = new Map(users.rows.map(({ emailNormalized, ...record }) => [emailNormalized, record]));
    for (const [key, email] of Object.entries({ admin: accounts.PLATFORM_ADMIN_EMAIL,
      candidate: accounts.CANDIDATE_EMAIL, employer: accounts.EMPLOYER_EMAIL })) {
      assert.ok(byEmail.has(email), `${key} fixture missing`);
    }
    const companyStates = await db.query(`SELECT status, "verificationStatus", count(*)::int AS count
      FROM "Company" GROUP BY status, "verificationStatus"`);
    console.log(JSON.stringify({ database: identity.name, schema: identity.schema,
      fixtures: Object.fromEntries(Object.entries({ admin: accounts.PLATFORM_ADMIN_EMAIL,
        candidate: accounts.CANDIDATE_EMAIL, employer: accounts.EMPLOYER_EMAIL })
        .map(([key, email]) => [key, byEmail.get(email)])), companyStates: companyStates.rows }));
    await db.query("ROLLBACK");
  } finally { await db.end(); }
}
main().catch((error) => { console.error(`ADMIN_FIXTURE_CHECK_FAILED ${error.message}`); process.exitCode = 1; });
