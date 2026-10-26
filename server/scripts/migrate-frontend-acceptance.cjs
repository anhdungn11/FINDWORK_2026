// Apply additive migrations only to the retained, local Frontend acceptance database.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const dotenv = require("dotenv");
const { Client } = require("pg");
const root = path.resolve(__dirname, "..");
const env = dotenv.parse(readFileSync(path.join(root, ".env.frontend-acceptance.local")));
const url = new URL(env.DATABASE_URL);
assert.equal(url.protocol, "postgresql:");
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "5432");
assert.match(url.pathname, /^\/findwork_frontend_acceptance_[a-f0-9]{12}$/);
assert.equal(url.searchParams.get("schema"), "public");
assert.equal(env.FINDWORK_EXPECTED_DATABASE, url.pathname.slice(1));

async function main() {
  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(`SELECT current_database() AS name,
      (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NOT NULL) AS migrations`);
    assert.equal(result.rows[0].name, env.FINDWORK_EXPECTED_DATABASE);
    assert.ok([10, 11, 12].includes(result.rows[0].migrations));
    console.log(JSON.stringify({ target: result.rows[0].name, beforeMigrations: result.rows[0].migrations }));
  } finally { await client.end(); }
  const child = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy"], {
    cwd: root, env: { ...process.env, ...env }, stdio: "inherit", windowsHide: true,
  });
  if (child.error) throw child.error;
  assert.equal(child.status, 0);
  const verify = new Client({ connectionString: env.DATABASE_URL });
  await verify.connect();
  try {
    const result = await verify.query('SELECT count(*)::int AS migrations FROM "_prisma_migrations" WHERE finished_at IS NOT NULL');
    assert.equal(result.rows[0].migrations, 12);
    console.log(JSON.stringify({ target: env.FINDWORK_EXPECTED_DATABASE, afterMigrations: 12 }));
  } finally { await verify.end(); }
}
main().catch((error) => { console.error(`FRONTEND_ACCEPTANCE_MIGRATION_BLOCKED ${error.message}`); process.exitCode = 1; });
