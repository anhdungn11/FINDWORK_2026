// One-time, additive import of the reviewed 2026-10-16 province snapshot to the isolated acceptance DB.
// It deliberately refuses to synthesize or import ward rows.
require("dotenv/config");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const snapshot = require("../prisma/seed-data/vietnam-administrative-2026-10-16.json");

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL required");
  const url = new URL(raw);
  if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.port !== "5432" ||
    decodeURIComponent(url.pathname.slice(1)) !== "findwork_employer_media_3002" ||
    url.searchParams.get("schema") !== "public") throw new Error("Isolated database target required");
  if (snapshot.version !== "vn-admin-2026-10-16" || snapshot.provinceStatus !== "verified-source-preparation" ||
    snapshot.wardStatus !== "blocked-no-complete-verified-2026-extract" || snapshot.provinces.length !== 34 ||
    new Set(snapshot.provinces.map((p) => p.code)).size !== 34 ||
    snapshot.provinces.some((p) => !/^\d{2}$/.test(p.code) || !p.name || !p.verifiedSourceId)) {
    throw new Error("Reviewed province snapshot invalid");
  }
  const client = new Client({ connectionString: raw });
  await client.connect();
  try {
    await client.query("BEGIN");
    const identity = await client.query("SELECT current_database() AS db, current_schema() AS schema");
    if (identity.rows[0]?.db !== "findwork_employer_media_3002" || identity.rows[0]?.schema !== "public") {
      throw new Error("Actual database identity mismatch");
    }
    const counts = await client.query('SELECT (SELECT COUNT(*) FROM "Province")::int AS provinces, (SELECT COUNT(*) FROM "Ward")::int AS wards');
    if (counts.rows[0].provinces !== 0 || counts.rows[0].wards !== 0) {
      throw new Error("Catalog is not empty; a reviewed reconciliation is required");
    }
    for (const p of snapshot.provinces) {
      await client.query('INSERT INTO "Province" ("id", "code", "name", "divisionType", "isActive", "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,true,NOW(),NOW())',
        [randomUUID(), p.code, p.name, p.divisionType]);
    }
    const after = await client.query('SELECT (SELECT COUNT(*) FROM "Province")::int AS provinces, (SELECT COUNT(*) FROM "Ward")::int AS wards');
    if (after.rows[0].provinces !== 34 || after.rows[0].wards !== 0) throw new Error("Unexpected catalog counts");
    await client.query("COMMIT");
    process.stdout.write(JSON.stringify({ database: identity.rows[0].db, sourceVersion: snapshot.version,
      asOf: snapshot.asOf, provinces: 34, wards: 0, wardStatus: snapshot.wardStatus }) + "\n");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { await client.end(); }
}
main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
