// Provision only the empty, dedicated integration database. No credentials are logged.
const { readFileSync } = require("node:fs");
const { Client } = require("pg");
const dotenv = require("dotenv");

const target = "findwork_employer_media_3002";
const sourceFile = process.env.FINDWORK_SOURCE_ENV_FILE;
if (!sourceFile) throw new Error("FINDWORK_SOURCE_ENV_FILE is required");
const sourceUrl = dotenv.parse(readFileSync(sourceFile)).DATABASE_URL;
if (!sourceUrl) throw new Error("Source environment has no DATABASE_URL");
const parsed = new URL(sourceUrl);
if (parsed.protocol !== "postgresql:" || parsed.hostname !== "127.0.0.1" ||
    parsed.port !== "5432" || parsed.pathname !== "/findwork_dev") {
  throw new Error("Source credential must target 127.0.0.1:5432/findwork_dev");
}

async function main() {
  const client = new Client({ connectionString: sourceUrl });
  await client.connect();
  try {
    const result = await client.query(`
      SELECT current_database() AS database, current_schema() AS schema,
        host(inet_server_addr()) AS address, inet_server_port() AS port,
        (SELECT rolcreatedb OR rolsuper FROM pg_roles WHERE rolname = current_user) AS can_create,
        (SELECT count(*)::int FROM pg_database WHERE datname = $1) AS target_count
    `, [target]);
    const row = result.rows[0];
    console.log(`SOURCE ${row.address}:${row.port}/${row.database}/${row.schema}; can_create=${row.can_create}; target_exists=${row.target_count === 1}`);
    if (row.database !== "findwork_dev" || row.schema !== "public" ||
        row.address !== "127.0.0.1" || row.port !== 5432) {
      throw new Error("Connected database identity does not match the expected local source");
    }
    if (row.target_count !== 0) throw new Error("Target already exists; inspect it before proceeding");
    if (!row.can_create) throw new Error("Source role cannot create a dedicated database");
    if (process.argv.includes("--create")) {
      await client.query(`CREATE DATABASE "${target}"`);
      console.log(`CREATED ${target}; empty database, no migrations or seed applied`);
    } else {
      console.log(`DRY_RUN_OK ${target}`);
    }
  } finally {
    await client.end();
  }
}
main().catch((error) => { console.error(`PROVISION_BLOCKED ${error.message}`); process.exitCode = 1; });
