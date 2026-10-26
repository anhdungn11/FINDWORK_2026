// Creates a retained, isolated local DB with real HTTP-created test accounts.
// Secrets are written only to ignored local files and never printed.
const assert = require("node:assert/strict");
const { randomBytes, randomUUID } = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

if (process.argv.length !== 2) throw new Error("Usage: node scripts/provision-frontend-acceptance.cjs");
const root = path.resolve(__dirname, "..");
const backendFile = path.join(root, ".env.frontend-acceptance.local");
const accountsFile = path.join(root, ".env.frontend-acceptance.accounts.local");
if (existsSync(backendFile) || existsSync(accountsFile)) throw new Error("Acceptance files already exist; refusing to overwrite");
const source = dotenv.parse(readFileSync(path.join(root, ".env.employer-media.local")));
const sourceUrl = new URL(source.DATABASE_URL);
if (source.NODE_ENV !== "test" || sourceUrl.protocol !== "postgresql:" ||
    sourceUrl.hostname !== "127.0.0.1" || sourceUrl.port !== "5432" ||
    sourceUrl.pathname !== "/findwork_employer_media_3002" ||
    sourceUrl.searchParams.get("schema") !== "public") {
  throw new Error("Only the read-only local integration credential may be used as a source");
}
const name = `findwork_frontend_acceptance_${randomBytes(6).toString("hex")}`;
const url = new URL(sourceUrl);
url.pathname = `/${name}`;
const maintenanceUrl = new URL(sourceUrl);
maintenanceUrl.pathname = "/postgres";
maintenanceUrl.search = "";
const maintenance = new Client({ connectionString: maintenanceUrl.toString(), connectionTimeoutMillis: 5000 });
const db = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
const port = 3003;
const tag = randomBytes(4).toString("hex");
const accounts = {
  CANDIDATE_EMAIL: `candidate-${tag}@example.invalid`, CANDIDATE_PASSWORD: `Candidate-${randomUUID()}!`,
  EMPLOYER_EMAIL: `employer-${tag}@example.invalid`, EMPLOYER_PASSWORD: `Employer-${randomUUID()}!`,
  PLATFORM_ADMIN_EMAIL: `platform-admin-${tag}@example.invalid`, PLATFORM_ADMIN_PASSWORD: `Admin-${randomUUID()}!`,
};
const runtime = { ...process.env, ...source, NODE_ENV: "test", PORT: String(port),
  DATABASE_URL: url.toString(), FINDWORK_EXPECTED_DATABASE: name,
  JWT_ACCESS_SECRET: randomBytes(48).toString("hex"),
  REFRESH_TOKEN_PEPPER: randomBytes(48).toString("hex"),
  CORS_ORIGINS: "http://127.0.0.1:5177,http://localhost:5177",
  EMAIL_DELIVERY_MODE: "disabled", EMAIL_WORKER_ENABLED: "false",
  EMAIL_INVITATION_DELIVERY_ENABLED: "false" };
let api;
let created = false;

function command(label, args, env) {
  const result = spawnSync(process.execPath, args, { cwd: root, env, encoding: "utf8", timeout: 180_000 });
  if (result.status !== 0) throw new Error(`${label} failed: ${result.error?.code || result.status}`);
}
async function request(method, route, json, bearer) {
  const response = await fetch(`http://127.0.0.1:${port}/api/v1${route}`, { method,
    headers: { ...(json && { "Content-Type": "application/json" }),
      ...(bearer && { Authorization: `Bearer ${bearer}` }) },
    body: json ? JSON.stringify(json) : undefined, signal: AbortSignal.timeout(5000) });
  const body = await response.json();
  if (![200, 201].includes(response.status)) throw new Error(`HTTP ${response.status} ${route} ${body.code || ""}`);
  return body;
}
async function waitForApi() {
  for (let i = 0; i < 100; i++) {
    if (api.exitCode !== null) throw new Error(`Acceptance API exited ${api.exitCode}`);
    try { await request("GET", "/health"); return; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Acceptance API did not become healthy");
}
async function assertPortFree() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(port, "127.0.0.1", resolve));
  await new Promise((resolve) => server.close(resolve));
}

async function main() {
  await assertPortFree();
  await maintenance.connect();
  try {
    const sourceIdentity = new Client({ connectionString: sourceUrl.toString(), options: "-c default_transaction_read_only=on" });
    try {
      await sourceIdentity.connect();
      const row = (await sourceIdentity.query("SELECT current_database() AS name")).rows[0];
      assert.equal(row.name, "findwork_employer_media_3002");
    } finally { await sourceIdentity.end(); }
    await maintenance.query(`CREATE DATABASE "${name}"`);
    created = true;
    command("Migration", ["./node_modules/prisma/build/index.js", "migrate", "deploy"], runtime);
    command("RBAC seed", ["./node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"], runtime);
    await db.connect();
    const identity = (await db.query("SELECT current_database() AS name, current_schema() AS schema")).rows[0];
    assert.deepEqual(identity, { name, schema: "public" });
    const provinceSnapshot = require("../prisma/seed-data/vietnam-administrative-2026-10-16.json");
    const wards = require("../prisma/seed-data/vietnam-wards-2026-10-24.json");
    assert.equal(provinceSnapshot.provinces.length, 34);
    assert.equal(wards.wards.length, 3321);
    await db.query("BEGIN");
    try {
      const provinceIds = new Map();
      for (const p of provinceSnapshot.provinces) {
        const id = randomUUID(); provinceIds.set(p.code, id);
        await db.query(`INSERT INTO "Province" (id,code,name,"divisionType","isActive","createdAt","updatedAt")
          VALUES ($1,$2,$3,$4,true,now(),now())`, [id, p.code, p.name, p.divisionType]);
      }
      for (const ward of wards.wards) {
        const provinceId = provinceIds.get(ward.provinceCode);
        if (!provinceId) throw new Error("Ward province is absent from official snapshot");
        await db.query(`INSERT INTO "Ward" (id,code,"provinceId",name,"divisionType",codename,"isActive","createdAt","updatedAt")
          VALUES ($1,$2,$3,$4,$5,$6,true,now(),now())`,
        [randomUUID(), ward.code, provinceId, ward.name, ward.divisionType,
          ward.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")]);
      }
      await db.query("COMMIT");
    } catch (error) { await db.query("ROLLBACK"); throw error; }
    command("Admin bootstrap", ["scripts/bootstrap-first-super-admin.cjs", "--apply"],
      { ...runtime, ADMIN_BOOTSTRAP_EXPECTED_DATABASE: name, ADMIN_BOOTSTRAP_ALLOW_WRITE: "YES",
        ADMIN_BOOTSTRAP_EMAIL: accounts.PLATFORM_ADMIN_EMAIL,
        ADMIN_BOOTSTRAP_PASSWORD: accounts.PLATFORM_ADMIN_PASSWORD });
    api = spawn(process.execPath, ["dist/main.js"], { cwd: root, env: runtime,
      stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    api.stdout.on("data", () => {}); api.stderr.on("data", () => {});
    await waitForApi();
    const candidate = await request("POST", "/auth/register/v2", {
      email: accounts.CANDIDATE_EMAIL, password: accounts.CANDIDATE_PASSWORD, accountType: "CANDIDATE" });
    const employer = await request("POST", "/auth/register/v2", {
      email: accounts.EMPLOYER_EMAIL, password: accounts.EMPLOYER_PASSWORD, accountType: "EMPLOYER" });
    const admin = await request("POST", "/auth/login", {
      email: accounts.PLATFORM_ADMIN_EMAIL, password: accounts.PLATFORM_ADMIN_PASSWORD });
    await request("GET", "/admin/dashboard", null, admin.accessToken);
    await request("POST", "/candidate/profile", { fullName: "Acceptance Candidate" }, candidate.accessToken);
    const company = await request("POST", "/companies", {
      name: `Acceptance Company ${tag}`, slug: `acceptance-company-${tag}` }, employer.accessToken);
    const backend = {
      NODE_ENV: "test", PORT: String(port), API_PREFIX: "api/v1", CORS_ORIGINS: runtime.CORS_ORIGINS,
      COMPANY_MEDIA_STORAGE_DIR: source.COMPANY_MEDIA_STORAGE_DIR, DATABASE_URL: runtime.DATABASE_URL,
      FINDWORK_EXPECTED_DATABASE: name, JWT_ACCESS_SECRET: runtime.JWT_ACCESS_SECRET,
      REFRESH_TOKEN_PEPPER: runtime.REFRESH_TOKEN_PEPPER,
      EMAIL_DELIVERY_MODE: "disabled", EMAIL_WORKER_ENABLED: "false", EMAIL_INVITATION_DELIVERY_ENABLED: "false",
    };
    accounts.COMPANY_ID = company.id;
    writeFileSync(backendFile, Object.entries(backend).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
    writeFileSync(accountsFile, Object.entries(accounts).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
    const counts = (await db.query(`SELECT
      (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NOT NULL) AS migrations,
      (SELECT count(*)::int FROM "Province") AS provinces,
      (SELECT count(*)::int FROM "Ward") AS wards,
      (SELECT count(*)::int FROM "User") AS users`)).rows[0];
    assert.deepEqual(counts, { migrations: 10, provinces: 34, wards: 3321, users: 3 });
    console.log(JSON.stringify({ status: "FRONTEND_ACCEPTANCE_READY", database: name,
      backendEnv: backendFile, accountsFile, baseUrl: `http://127.0.0.1:${port}/api/v1`,
      companyId: company.id, counts }));
  } catch (error) {
    if (created && !existsSync(backendFile)) {
      if (api) api.kill();
      await db.end().catch(() => {});
      await maintenance.query(`DROP DATABASE "${name}" WITH (FORCE)`).catch(() => {});
    }
    throw error;
  } finally {
    if (api) { api.kill(); await new Promise((resolve) => api.once("exit", resolve)); }
    await db.end().catch(() => {});
    await maintenance.end().catch(() => {});
  }
}
main().catch((error) => { console.error(`FRONTEND_ACCEPTANCE_BLOCKED ${error.message}`); process.exitCode = 1; });
