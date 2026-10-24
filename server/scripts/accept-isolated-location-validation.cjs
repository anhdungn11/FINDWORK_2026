// Uses an existing, explicitly supplied employer token/company. Never registers or creates records.
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");
const env = dotenv.parse(readFileSync(resolve(__dirname, "..", ".env.employer-media.local")));
const url = new URL(env.DATABASE_URL);
if (url.hostname !== "127.0.0.1" || url.port !== "5432" ||
    url.pathname !== "/findwork_employer_media_3002" || url.searchParams.get("schema") !== "public") {
  throw new Error("Unexpected database identity");
}
const token = process.env.FINDWORK_ACCEPT_OWNER_TOKEN;
const companyId = process.env.FINDWORK_ACCEPT_COMPANY_ID;
if (!token || !/^[0-9a-f-]{36}$/i.test(companyId ?? "")) {
  console.error("EXISTING_IDENTITY_REQUIRED: supply FINDWORK_ACCEPT_OWNER_TOKEN and FINDWORK_ACCEPT_COMPANY_ID; no registration attempted");
  process.exit(2);
}
const base = "http://127.0.0.1:3002/api/v1";
async function call(method, path, json) {
  const response = await fetch(base + path, { method, headers: {
    Origin: "http://127.0.0.1:5177", Authorization: `Bearer ${token}`,
    ...(json && { "Content-Type": "application/json" }),
  }, ...(json && { body: JSON.stringify(json) }) });
  return { status: response.status, body: await response.json() };
}
async function count(db) {
  const result = await db.query('SELECT count(*)::int AS n FROM "CompanyLocation" WHERE "companyId"=$1', [companyId]);
  return result.rows[0].n;
}
async function main() {
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  try {
    const identity = await db.query("SELECT current_database() AS database, current_schema() AS schema");
    if (identity.rows[0].database !== "findwork_employer_media_3002" || identity.rows[0].schema !== "public") {
      throw new Error("Connected to unexpected database");
    }
    const profile = await call("GET", `/companies/${companyId}/profile`);
    if (profile.status !== 200) throw new Error(`EXISTING_IDENTITY_INVALID: profile HTTP ${profile.status}`);
    const before = await count(db);
    const provincePage = await call("GET", "/reference/provinces?q=Ha%20Noi&pageSize=1");
    const provinceId = provincePage.body.data?.[0]?.id;
    if (!provinceId || provincePage.body.data[0].code !== "01") throw new Error("Verified province fixture unavailable");
    const path = `/companies/${companyId}/locations`;
    const checks = [
      ["empty", {}, "COMPANY_LOCATION_EMPTY"],
      ["unknown province", { countryCode: "VN", provinceId: randomUUID(), addressLine: "Invalid" }, "COMPANY_LOCATION_REFERENCE_INVALID"],
      ["ward without province", { countryCode: "VN", wardId: randomUUID(), addressLine: "Invalid" }, "COMPANY_LOCATION_INVALID"],
      ["unknown ward", { countryCode: "VN", provinceId, wardId: randomUUID(), addressLine: "Invalid" }, "COMPANY_LOCATION_REFERENCE_INVALID"],
      ["wrong country", { countryCode: "US", provinceId, addressLine: "Invalid" }, "COMPANY_LOCATION_INVALID"],
    ];
    const results = [];
    for (const [label, body, code] of checks) {
      const result = await call("POST", path, body);
      results.push({ label, status: result.status, code: result.body.code });
      if (result.status !== 400 || result.body.code !== code) throw new Error(`${label}: unexpected HTTP ${result.status} ${result.body.code ?? ""}`);
    }
    const after = await count(db);
    if (before !== after) throw new Error("Invalid location request changed PostgreSQL rows");
    console.log(JSON.stringify({ database: identity.rows[0].database, companyId, before, after, results }));
  } finally { await db.end(); }
}
main().catch((error) => { console.error(`LOCATION_ACCEPTANCE_FAILED ${error.message}`); process.exitCode = 1; });
