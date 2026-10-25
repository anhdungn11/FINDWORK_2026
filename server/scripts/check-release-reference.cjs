// Read-only reference readiness check for any explicitly configured PostgreSQL target.
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

if (process.argv.length !== 2) throw new Error("Usage: node --env-file=<local-env> scripts/check-release-reference.cjs");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const url = new URL(connectionString);
if (!["postgres:", "postgresql:"].includes(url.protocol) || url.searchParams.get("schema") !== "public") {
  throw new Error("Expected a PostgreSQL public-schema URL");
}
const wardPath = path.resolve(__dirname, "../prisma/seed-data/vietnam-wards-2026-10-24.json");
const contents = readFileSync(wardPath, "utf8").replace(/\r\n/g, "\n");
const sha256 = createHash("sha256").update(contents).digest("hex");
if (sha256 !== "5c1f716a3ae1ab854a9d642e1bf82293999f7e66c8bb067edc6663b12ba18f2d") {
  throw new Error("Official ward snapshot checksum mismatch");
}
const snapshot = JSON.parse(contents);
const provinces = require("../prisma/seed-data/vietnam-administrative-2026-10-16.json");
if (snapshot.expectedCount !== 3321 || provinces.provinces.length !== 34) throw new Error("Reference source count mismatch");

async function main() {
  const db = new Client({ connectionString, options: "-c default_transaction_read_only=on", connectionTimeoutMillis: 5000 });
  await db.connect();
  try {
    await db.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const identity = (await db.query(`SELECT current_database() AS database,current_schema() AS schema,
      current_setting('transaction_read_only') AS read_only`)).rows[0];
    if (identity.schema !== "public" || identity.read_only !== "on") throw new Error("Read-only public-schema check failed");
    const [actualProvinces, actualWards] = await Promise.all([
      db.query('SELECT code,name,"divisionType","isActive" FROM "Province" ORDER BY code'),
      db.query(`SELECT w.code,w.name,w."divisionType",w."isActive",p.code AS "provinceCode",p."isActive" AS "parentActive"
        FROM "Ward" w LEFT JOIN "Province" p ON p.id=w."provinceId" ORDER BY w.code`),
    ]);
    const provinceByCode = new Map(actualProvinces.rows.map((row) => [row.code, row]));
    const wardByCode = new Map(actualWards.rows.map((row) => [row.code, row]));
    const provinceErrors = provinces.provinces.filter((row) => {
      const actual = provinceByCode.get(row.code);
      return !actual || actual.name !== row.name || actual.divisionType !== row.divisionType || !actual.isActive;
    }).length;
    const wardErrors = snapshot.wards.filter((row) => {
      const actual = wardByCode.get(row.code);
      return !actual || actual.name !== row.name || actual.divisionType !== row.divisionType ||
        actual.provinceCode !== row.provinceCode || !actual.isActive || !actual.parentActive;
    }).length;
    const result = { database: identity.database, schema: identity.schema,
      provinceCount: actualProvinces.rows.length, wardCount: actualWards.rows.length,
      provinceErrors, wardErrors, snapshotSha256: sha256 };
    result.status = result.provinceCount === 34 && result.wardCount === 3321 &&
      provinceErrors === 0 && wardErrors === 0 ? "PASS" : "REFERENCE_DATA_INCOMPLETE";
    console.log(JSON.stringify(result));
    if (result.status !== "PASS") process.exitCode = 1;
    await db.query("ROLLBACK");
  } finally { await db.end(); }
}
main().catch((error) => { console.error(`REFERENCE_READINESS_FAILED ${error.message}`); process.exitCode = 1; });
