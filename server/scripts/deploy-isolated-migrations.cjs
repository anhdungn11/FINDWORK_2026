// Deploy reviewed Prisma migrations to the dedicated empty integration database only.
const { readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const { Client } = require("pg");
const dotenv = require("dotenv");

const sourceFile = process.env.FINDWORK_SOURCE_ENV_FILE;
if (!sourceFile) throw new Error("FINDWORK_SOURCE_ENV_FILE is required");
const sourceUrl = dotenv.parse(readFileSync(sourceFile)).DATABASE_URL;
if (!sourceUrl) throw new Error("Source environment has no DATABASE_URL");
const url = new URL(sourceUrl);
if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" ||
    url.port !== "5432" || url.pathname !== "/findwork_dev") {
  throw new Error("Unexpected source credential identity");
}
url.pathname = "/findwork_employer_media_3002";

async function main() {
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    const result = await client.query(`SELECT current_database() AS database,
      current_schema() AS schema, host(inet_server_addr()) AS address,
      inet_server_port() AS port,
      (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public') AS table_count`);
    const row = result.rows[0];
    console.log(`TARGET ${row.address}:${row.port}/${row.database}/${row.schema}; tables=${row.table_count}`);
    if (row.database !== "findwork_employer_media_3002" || row.schema !== "public" ||
        row.address !== "127.0.0.1" || row.port !== 5432 || row.table_count !== 0) {
      throw new Error("Target is not the expected empty local integration database");
    }
  } finally { await client.end(); }
  const cli = require.resolve("prisma/build/index.js");
  const child = spawnSync(process.execPath, [cli, "migrate", "deploy"], {
    cwd: require("node:path").resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: "inherit",
  });
  if (child.error) throw child.error;
  if (child.status !== 0) throw new Error(`Prisma migration deployment exited ${child.status}`);
}
main().catch((error) => { console.error(`MIGRATION_BLOCKED ${error.message}`); process.exitCode = 1; });
