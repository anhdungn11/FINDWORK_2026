// Read-only media evidence for the dedicated integration database and storage.
const { createHash } = require("node:crypto");
const { readFile, lstat } = require("node:fs/promises");
const { readFileSync } = require("node:fs");
const { resolve, join } = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

const env = dotenv.parse(readFileSync(resolve(__dirname, "..", ".env.employer-media.local")));
const database = new URL(env.DATABASE_URL);
if (database.hostname !== "127.0.0.1" || database.port !== "5432" ||
    database.pathname !== "/findwork_employer_media_3002" ||
    database.searchParams.get("schema") !== "public") throw new Error("Unexpected database identity");
if (!env.COMPANY_MEDIA_STORAGE_DIR) throw new Error("Storage root is not configured");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const types = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

async function main() {
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  let rows;
  try {
    await db.query("BEGIN READ ONLY");
    const identity = await db.query("SELECT current_database() AS name, current_schema() AS schema");
    if (identity.rows[0].name !== "findwork_employer_media_3002" || identity.rows[0].schema !== "public") {
      throw new Error("Connected to unexpected database");
    }
    ({ rows } = await db.query('SELECT id, status, "logoAssetKey", "coverAssetKey" FROM "Company" WHERE "logoAssetKey" IS NOT NULL OR "coverAssetKey" IS NOT NULL ORDER BY id'));
    await db.query("ROLLBACK");
  } finally { await db.end(); }

  for (const row of rows) for (const kind of ["logo", "cover"]) {
    const key = kind === "logo" ? row.logoAssetKey : row.coverAssetKey;
    if (!key) continue;
    const match = new RegExp(`^${row.id}/${kind}/[0-9a-f-]{36}\\.(png|jpg|webp)$`, "i").exec(key);
    if (!match) throw new Error(`Invalid stored ${kind} key for ${row.id}`);
    const file = join(env.COMPANY_MEDIA_STORAGE_DIR, ...key.split("/"));
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Unsafe stored image");
    const stored = await readFile(file);
    const url = `http://127.0.0.1:3002/api/v1/companies/${row.id}/media/${kind}`;
    const response = await fetch(url, { headers: { Origin: "http://127.0.0.1:5177" } });
    const served = Buffer.from(await response.arrayBuffer());
    const expectedType = types[match[1].toLowerCase()];
    const result = { companyId: row.id, status: row.status, kind, fileBytes: stored.length,
      fileSha256: sha256(stored), httpStatus: response.status, contentType: response.headers.get("content-type"),
      cacheControl: response.headers.get("cache-control"), corsOrigin: response.headers.get("access-control-allow-origin"),
      httpBytes: served.length, httpSha256: sha256(served) };
    console.log(JSON.stringify(result));
    if (row.status === "ACTIVE" && (response.status !== 200 || result.contentType !== expectedType ||
        result.fileSha256 !== result.httpSha256 || result.cacheControl !== "no-store" ||
        result.corsOrigin !== "http://127.0.0.1:5177")) throw new Error("Active company media mismatch");
  }
  console.log(`inspected_media=${rows.reduce((n, row) => n + Number(!!row.logoAssetKey) + Number(!!row.coverAssetKey), 0)}`);
}
main().catch((error) => { console.error(`MEDIA_INSPECTION_FAILED ${error.message}`); process.exitCode = 1; });
