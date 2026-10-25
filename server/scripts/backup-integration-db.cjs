// Read-only PostgreSQL dump of the isolated integration database. Never prints credentials.
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { createReadStream, mkdtempSync, readFileSync, statSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

if (process.argv.length !== 2) throw new Error("Usage: node scripts/backup-integration-db.cjs");
const env = dotenv.parse(readFileSync(path.resolve(__dirname, "../.env.employer-media.local")));
const url = new URL(env.DATABASE_URL);
if (env.NODE_ENV !== "test" || url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" ||
    url.port !== "5432" || url.pathname !== "/findwork_employer_media_3002" ||
    url.searchParams.get("schema") !== "public") throw new Error("Unexpected integration target");
const bin = "C:\\Program Files\\PostgreSQL\\17\\bin";
const pgDump = path.join(bin, "pg_dump.exe");
const pgRestore = path.join(bin, "pg_restore.exe");

function run(tool, args, options = {}) {
  const result = spawnSync(tool, args, { encoding: "utf8", timeout: 300_000, maxBuffer: 32 * 1024 * 1024,
    ...options });
  if (result.status !== 0) throw new Error(`${path.basename(tool)} failed: ${result.error?.code || result.stderr?.trim().slice(0, 500) || result.status}`);
  return result.stdout;
}

async function main() {
  assert.match(run(pgDump, ["--version"]), /PostgreSQL\) 17\./);
  assert.match(run(pgRestore, ["--version"]), /PostgreSQL\) 17\./);
  const client = new Client({ connectionString: env.DATABASE_URL,
    options: "-c default_transaction_read_only=on", connectionTimeoutMillis: 5000 });
  let identity;
  try {
    await client.connect();
    ({ rows: [identity] } = await client.query(`SELECT current_database() AS database,
      current_schema() AS schema, inet_server_addr()::text AS address, inet_server_port() AS port,
      current_setting('transaction_read_only') AS read_only`));
    assert.deepEqual(identity, { database: "findwork_employer_media_3002", schema: "public",
      address: "127.0.0.1/32", port: 5432, read_only: "on" });
  } finally { await client.end().catch(() => {}); }

  const directory = mkdtempSync(path.join(os.tmpdir(), "findwork-integration-backup-"));
  const backup = path.join(directory, "findwork_employer_media_3002.dump");
  const childEnv = { ...process.env, PGPASSWORD: decodeURIComponent(url.password) };
  run(pgDump, ["--format=custom", "--no-password", "--host=127.0.0.1", "--port=5432",
    `--username=${decodeURIComponent(url.username)}`, "--dbname=findwork_employer_media_3002",
    `--file=${backup}`], { env: childEnv });
  const listing = run(pgRestore, ["--list", backup]);
  if (!/;\s+dbname: findwork_employer_media_3002\s*$/m.test(listing) ||
      !/;\s+Format: CUSTOM\s*$/m.test(listing) || !listing.includes("TABLE DATA")) {
    throw new Error("Dump manifest does not match the integration database");
  }
  // Decode every TOC entry and data stream without writing into any database.
  run(pgRestore, ["--file=NUL", backup]);
  const sha = createHash("sha256");
  for await (const chunk of createReadStream(backup)) sha.update(chunk);
  console.log(JSON.stringify({ identity, backup, bytes: statSync(backup).size,
    sha256: sha.digest("hex"), pgRestore, manifest: "PASS", archiveExtraction: "PASS",
    databaseRestoreRehearsal: "NOT_RUN" }, null, 2));
}
main().catch((error) => { console.error(`INTEGRATION_BACKUP_FAILED ${error.message}`); process.exitCode = 1; });
