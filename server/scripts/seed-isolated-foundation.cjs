// Run the project seed only on the fresh dedicated integration database.
const { readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

const envFile = path.resolve(__dirname, "..", ".env.employer-media.local");
const url = dotenv.parse(readFileSync(envFile)).DATABASE_URL;
const parsed = new URL(url);
if (parsed.protocol !== "postgresql:" || parsed.hostname !== "127.0.0.1" ||
    parsed.port !== "5432" || parsed.pathname !== "/findwork_employer_media_3002") {
  throw new Error("Refusing seed outside the dedicated local integration database");
}

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const result = await client.query(`SELECT current_database() AS database,
      current_schema() AS schema, host(inet_server_addr()) AS address,
      inet_server_port() AS port,
      (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrations,
      (SELECT count(*)::int FROM "User") AS users,
      (SELECT count(*)::int FROM "Company") AS companies,
      (SELECT count(*)::int FROM "Role") AS roles`);
    const row = result.rows[0];
    console.log(`TARGET ${row.address}:${row.port}/${row.database}/${row.schema}; migrations=${row.migrations}; users=${row.users}; companies=${row.companies}; roles=${row.roles}`);
    if (row.database !== "findwork_employer_media_3002" || row.schema !== "public" ||
        row.address !== "127.0.0.1" || row.port !== 5432 || row.migrations !== 8 ||
        row.users !== 0 || row.companies !== 0 || row.roles !== 0) {
      throw new Error("Expected a migrated database with no user, company, or role records");
    }
  } finally { await client.end(); }
  const cli = require.resolve("tsx/cli");
  const child = spawnSync(process.execPath, [cli, "prisma/seed.ts"], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: url }, stdio: "inherit",
  });
  if (child.error) throw child.error;
  if (child.status !== 0) throw new Error(`Project seed exited ${child.status}`);
}
main().catch((error) => { console.error(`SEED_BLOCKED ${error.message}`); process.exitCode = 1; });
