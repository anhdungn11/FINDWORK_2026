// Restore a verified integration dump into a new disposable local database.
const assert = require("node:assert/strict");
const { createHash, randomBytes } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { readFileSync, realpathSync } = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

if (process.argv.length !== 4) throw new Error("Usage: node scripts/verify-integration-restore.cjs <absolute-dump-path> <sha256>");
const backup = realpathSync(process.argv[2]);
const expectedHash = process.argv[3].toLowerCase();
if (!path.isAbsolute(process.argv[2]) || !backup.endsWith(".dump") || !/^[a-f0-9]{64}$/.test(expectedHash) ||
    createHash("sha256").update(readFileSync(backup)).digest("hex") !== expectedHash) {
  throw new Error("Dump path or SHA-256 mismatch");
}
const env = dotenv.parse(readFileSync(path.resolve(__dirname, "../.env.employer-media.local")));
const url = new URL(env.DATABASE_URL);
if (env.NODE_ENV !== "test" || url.hostname !== "127.0.0.1" || url.port !== "5432" ||
    url.pathname !== "/findwork_employer_media_3002" || url.searchParams.get("schema") !== "public") {
  throw new Error("Unexpected integration target");
}
const restore = "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe";
const scratch = `findwork_restore_check_${randomBytes(6).toString("hex")}`;
const maintenanceUrl = new URL(url);
maintenanceUrl.pathname = "/postgres";
maintenanceUrl.search = "";
const maintenance = new Client({ connectionString: maintenanceUrl.toString(), connectionTimeoutMillis: 5000 });
const source = new Client({ connectionString: env.DATABASE_URL, options: "-c default_transaction_read_only=on" });
const tables = ["Province", "Ward", "Job", "Application", "ResumeVersion", "_prisma_migrations"];

async function counts(client) {
  const result = {};
  for (const table of tables) {
    result[table] = Number((await client.query(`SELECT count(*)::int AS n FROM "${table}"`)).rows[0].n);
  }
  return result;
}

async function main() {
  let created = false;
  await maintenance.connect();
  try {
    await source.connect();
    const identity = (await source.query("SELECT current_database() AS database, current_setting('transaction_read_only') AS read_only")).rows[0];
    assert.deepEqual(identity, { database: "findwork_employer_media_3002", read_only: "on" });
    const before = await counts(source);
    await maintenance.query(`CREATE DATABASE "${scratch}"`);
    created = true;
    const result = spawnSync(restore, ["--no-owner", "--no-acl", "--exit-on-error", "--no-password",
      "--host=127.0.0.1", "--port=5432", `--username=${decodeURIComponent(url.username)}`,
      `--dbname=${scratch}`, backup], { encoding: "utf8", timeout: 300_000,
      env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) } });
    if (result.status !== 0) throw new Error(`pg_restore failed: ${result.stderr?.trim().slice(0, 500) || result.error?.code || result.status}`);
    const scratchUrl = new URL(url);
    scratchUrl.pathname = `/${scratch}`;
    const restored = new Client({ connectionString: scratchUrl.toString(), options: "-c default_transaction_read_only=on" });
    try {
      await restored.connect();
      assert.deepEqual(await counts(restored), before);
    } finally { await restored.end().catch(() => {}); }
    console.log(JSON.stringify({ restore: "PASS", source: identity.database, scratch,
      matchingTableCounts: before, checksum: expectedHash }));
  } finally {
    await source.end().catch(() => {});
    if (created) await maintenance.query(`DROP DATABASE "${scratch}" WITH (FORCE)`);
    await maintenance.end().catch(() => {});
  }
}
main().catch((error) => { console.error(`RESTORE_VERIFICATION_FAILED ${error.message}`); process.exitCode = 1; });
