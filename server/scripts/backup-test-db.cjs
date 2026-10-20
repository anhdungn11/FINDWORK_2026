// Read-only backup of the dedicated local acceptance database.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");
const { Client } = require("pg");

const envPath = process.argv[2];
if (!envPath || process.argv.length !== 3) {
  console.error("Usage: node scripts/backup-test-db.cjs <test-env-file>");
  process.exit(2);
}

async function main() {
  const config = dotenv.parse(fs.readFileSync(envPath));
  const url = new URL(config.DATABASE_URL);
  if (config.NODE_ENV !== "test" || !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.hostname !== "127.0.0.1" || url.port !== "5432" ||
      url.pathname !== "/findwork_test" || url.searchParams.get("schema") !== "public") {
    throw new Error("Refusing backup: expected test mode and 127.0.0.1:5432/findwork_test/public.");
  }
  const client = new Client({ connectionString: config.DATABASE_URL,
    options: "-c default_transaction_read_only=on", connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const { rows: [identity] } = await client.query(
      "SELECT current_database() AS database, inet_server_addr()::text AS address, inet_server_port() AS port, current_schema() AS schema",
    );
    if (identity?.database !== "findwork_test" ||
        !["127.0.0.1", "127.0.0.1/32"].includes(identity.address) ||
        identity.port !== 5432 || identity.schema !== "public") {
      throw new Error("Refusing backup: connected database identity differs from target.");
    }
  } finally {
    await client.end().catch(() => {});
  }

  const bin = "C:\\Program Files\\PostgreSQL\\17\\bin";
  const dump = path.join(bin, "pg_dump.exe");
  const restore = path.join(bin, "pg_restore.exe");
  for (const tool of [dump, restore]) {
    const version = spawnSync(tool, ["--version"], { encoding: "utf8" });
    if (version.status !== 0 || !/PostgreSQL\) 17\./.test(version.stdout)) {
      throw new Error("PostgreSQL 17 backup tools are required.");
    }
  }
  const backupDir = path.resolve(__dirname, "..", "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const filename = `findwork_test_${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;
  const output = path.join(backupDir, filename);
  const childEnv = { ...process.env, PGPASSWORD: decodeURIComponent(url.password) };
  const args = ["--format=custom", "--no-password", "--host=127.0.0.1", "--port=5432",
    `--username=${decodeURIComponent(url.username)}`, "--dbname=findwork_test", `--file=${output}`];
  const result = spawnSync(dump, args, { env: childEnv, encoding: "utf8", timeout: 300000 });
  if (result.status !== 0) {
    throw new Error(`pg_dump failed (exit ${result.status}; ${result.error?.code || "see PostgreSQL diagnostics"}).`);
  }
  const listing = spawnSync(restore, ["--list", output], { encoding: "utf8", timeout: 30000 });
  if (listing.status !== 0 || !listing.stdout.includes("TABLE DATA")) {
    throw new Error(`pg_restore -l failed (exit ${listing.status}).`);
  }
  const sizeBytes = fs.statSync(output).size;
  const hash = crypto.createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(output);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  console.log(JSON.stringify({ identity: "127.0.0.1:5432/findwork_test/public",
    path: output, sizeBytes, sha256: hash.digest("hex"),
    pgDump: "passed", pgRestoreList: "passed" }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
