// Optional sample jobs. Dry-run is read-only; apply requires an approved backup and OWNER bearer token.
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { readFileSync, realpathSync, statSync } = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

const mode = process.argv[2];
if (!["--dry-run", "--apply"].includes(mode) || process.argv.length !== 3) {
  throw new Error("Usage: node scripts/demo-jobs-release-2026.cjs --dry-run|--apply");
}
const sourcePath = path.resolve(__dirname, "../prisma/seed-data/demo-jobs-release-2026.json");
const source = readFileSync(sourcePath);
const sourceSha256 = createHash("sha256").update(source).digest("hex");
const catalog = JSON.parse(source.toString("utf8"));
const env = dotenv.parse(readFileSync(path.resolve(__dirname, "..", ".env.employer-media.local")));
const dbUrl = new URL(env.DATABASE_URL);
if (dbUrl.hostname !== "127.0.0.1" || dbUrl.port !== "5432" ||
    dbUrl.pathname !== "/findwork_employer_media_3002" || dbUrl.searchParams.get("schema") !== "public") {
  throw new Error("Unexpected integration DB target");
}
const companyId = process.env.FINDWORK_DEMO_COMPANY_ID;
const api = process.env.FINDWORK_DEMO_API_BASE || "http://127.0.0.1:3002/api/v1";
if (!/^http:\/\/127\.0\.0\.1:300[23]\/api\/v1$/.test(api)) throw new Error("Unexpected API target");

function verifySource() {
  assert.equal(catalog.version, "findwork-demo-jobs-2026-10-24");
  assert.equal(catalog.jobs.length, 12);
  assert.equal(new Set(catalog.jobs.map((job) => job.key)).size, 12);
  assert.equal(new Set(catalog.jobs.map((job) => job.title)).size, 12);
  for (const job of catalog.jobs) {
    assert.ok(job.title.startsWith("[DEMO FINDWORK] "));
    assert.ok(job.description.startsWith(catalog.disclaimer));
    assert.ok(job.title.length <= 220);
    assert.ok(job.description.length >= 20 && job.description.length <= 20_000);
    assert.match(job.provinceCode, /^\d{2}$/);
    assert.match(job.salaryMin, /^\d{1,17}(?:\.\d{1,2})?$/);
    assert.match(job.salaryMax, /^\d{1,17}(?:\.\d{1,2})?$/);
    assert.ok(Number(job.salaryMin) <= Number(job.salaryMax));
    assert.ok(["FULL_TIME", "PART_TIME", "CONTRACT"].includes(job.employmentType));
    assert.ok(["ONSITE", "HYBRID", "REMOTE"].includes(job.workplaceType));
  }
}

async function verifyBackup() {
  const backupPath = process.env.FINDWORK_DEMO_BACKUP_PATH;
  const expectedHash = process.env.FINDWORK_DEMO_BACKUP_SHA256?.toLowerCase();
  const pgRestore = process.env.FINDWORK_DEMO_PG_RESTORE;
  if (!backupPath || !expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash) || !pgRestore) {
    throw new Error("Approved recent integration dump, checksum and pg_restore path required");
  }
  const absolute = realpathSync(backupPath);
  const relative = path.relative(path.resolve(__dirname, "../.."), absolute);
  if (!path.isAbsolute(backupPath) || !absolute.endsWith(".dump") ||
      (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))) {
    throw new Error("Backup must be an absolute .dump outside the worktree");
  }
  const stat = statSync(absolute);
  if (!stat.isFile() || stat.size === 0 || Date.now() - stat.mtimeMs > 86_400_000) {
    throw new Error("Backup must be nonempty and younger than 24 hours");
  }
  const hash = createHash("sha256").update(readFileSync(absolute)).digest("hex");
  if (hash !== expectedHash) throw new Error("Backup checksum mismatch");
  const listing = execFileSync(pgRestore, ["--list", absolute], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (!/;\s+dbname: findwork_employer_media_3002\s*$/m.test(listing) ||
      !/;\s+Format: CUSTOM\s*$/m.test(listing)) throw new Error("Backup is not the integration custom dump");
}

async function call(method, route, token, body) {
  const response = await fetch(api + route, { method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && { "Content-Type": "application/json" }) },
    body: body ? JSON.stringify(body) : undefined });
  const value = await response.json();
  if (!response.ok) throw new Error(`${method} ${route}: HTTP ${response.status} ${value.code || "UNKNOWN"}`);
  return value;
}

async function main() {
  verifySource();
  const db = new Client({ connectionString: env.DATABASE_URL });
  await db.connect();
  let categories;
  let provinces;
  let existing = [];
  let company = null;
  try {
    await db.query("BEGIN READ ONLY");
    const identity = (await db.query("SELECT current_database() AS database, current_schema() AS schema")).rows[0];
    assert.deepEqual(identity, { database: "findwork_employer_media_3002", schema: "public" });
    categories = (await db.query('SELECT id, code FROM "JobCategory" WHERE "isActive"=true')).rows;
    provinces = (await db.query('SELECT id, code FROM "Province" WHERE "isActive"=true')).rows;
    if (companyId) {
      company = (await db.query(`SELECT c.id, c.name, c.status,
        (SELECT count(DISTINCT m.id)::int FROM "CompanyMember" m
         JOIN "CompanyMemberRole" mr ON mr."companyMemberId"=m.id AND mr."companyId"=m."companyId"
         JOIN "Role" r ON r.id=mr."roleId" AND r."companyId"=m."companyId"
         JOIN "User" u ON u.id=m."userId"
         WHERE m."companyId"=c.id AND m.status='ACTIVE' AND m."removedAt" IS NULL
           AND m."isOwner"=true AND u.status='ACTIVE'
           AND r.name='OWNER' AND r."isActive"=true) AS "activeOwnerMembers"
        FROM "Company" c WHERE c.id=$1`, [companyId])).rows[0] ?? null;
      existing = (await db.query(`SELECT j.id, j.title, j.description, j.status,
        j."categoryId", j."employmentType", j."workplaceType", j."salaryMin", j."salaryMax",
        j.currency, j."salaryPeriod", j."showSalary", j."salaryNegotiable",
        (SELECT p.code FROM "JobLocation" l JOIN "Province" p ON p.id=l."provinceId"
         WHERE l."jobId"=j.id AND l."isPrimary"=true ORDER BY l.id LIMIT 1) AS "provinceCode"
        FROM "Job" j WHERE j."companyId"=$1`, [companyId])).rows;
    }
    await db.query("ROLLBACK");
  } finally { await db.end(); }
  const categoryByCode = new Map(categories.map((row) => [row.code, row.id]));
  const provinceByCode = new Map(provinces.map((row) => [row.code, row.id]));
  const missingCategories = [...new Set(catalog.jobs.map((job) => job.categoryCode).filter((code) => !categoryByCode.has(code)))];
  const missingProvinces = [...new Set(catalog.jobs.map((job) => job.provinceCode).filter((code) => !provinceByCode.has(code)))];
  const existingByTitle = new Map();
  for (const row of existing) {
    const rows = existingByTitle.get(row.title) || [];
    rows.push(row);
    existingByTitle.set(row.title, rows);
  }
  const matchesPublished = (job, row) => row.status === "PUBLISHED" &&
    row.description === job.description && row.categoryId === categoryByCode.get(job.categoryCode) &&
    row.employmentType === job.employmentType && row.workplaceType === job.workplaceType &&
    Number(row.salaryMin) === Number(job.salaryMin) && Number(row.salaryMax) === Number(job.salaryMax) &&
    row.currency === "VND" && row.salaryPeriod === "MONTH" &&
    row.showSalary === true && row.salaryNegotiable === false && row.provinceCode === job.provinceCode;
  const conflicts = catalog.jobs.filter((job) => {
    const rows = existingByTitle.get(job.title) || [];
    return rows.length > 1 || (rows.length === 1 && !matchesPublished(job, rows[0]));
  }).map((job) => job.key);
  const pending = catalog.jobs.filter((job) => !existingByTitle.has(job.title));
  const preview = { mode, database: "findwork_employer_media_3002/public", companyId: companyId || null,
    company,
    sourceSha256, count: catalog.jobs.length, alreadyPublished: catalog.jobs.length - pending.length,
    pending: pending.length, missingCategories, missingProvinces, conflicts,
    jobs: catalog.jobs.map(({ key, title, categoryCode, provinceCode, employmentType, workplaceType, salaryMin, salaryMax }) =>
      ({ key, title, categoryCode, provinceCode, employmentType, workplaceType, salaryMin, salaryMax })) };
  if (mode === "--dry-run") { console.log(JSON.stringify(preview, null, 2)); return; }
  if (missingCategories.length || missingProvinces.length || conflicts.length) throw new Error("Dry-run conflicts must be resolved before apply");
  if (process.env.FINDWORK_DEMO_APPROVED !== "YES" ||
      process.env.FINDWORK_DEMO_APPROVED_SHA256 !== sourceSha256 ||
      !companyId || !process.env.FINDWORK_DEMO_OWNER_TOKEN) {
    throw new Error("Apply requires separate approval, exact source SHA, company ID and OWNER token");
  }
  await verifyBackup();
  const token = process.env.FINDWORK_DEMO_OWNER_TOKEN;
  const workspace = await call("GET", "/companies/me", token);
  if (!workspace.data?.some((row) => row.id === companyId && row.memberRoleNames?.includes("OWNER"))) {
    throw new Error("Only an authorized demonstration company OWNER may populate jobs");
  }
  for (const job of pending) {
    const created = await call("POST", `/companies/${companyId}/jobs`, token, {
      categoryId: categoryByCode.get(job.categoryCode), title: job.title, description: job.description,
      employmentType: job.employmentType, workplaceType: job.workplaceType,
      salaryMin: job.salaryMin, salaryMax: job.salaryMax, currency: "VND", salaryPeriod: "MONTH",
      showSalary: true, location: { provinceCode: job.provinceCode },
    });
    const published = await call("POST", `/companies/${companyId}/jobs/${created.id}/publish`, token,
      { version: created.version });
    const publicJob = await call("GET", `/jobs/${created.id}`);
    if (published.status !== "PUBLISHED" || publicJob.locations?.[0]?.province?.code !== job.provinceCode) {
      throw new Error(`Published sample verification failed for ${job.key}`);
    }
    console.log(JSON.stringify({ key: job.key, jobId: created.id, status: published.status }));
  }
  console.log(JSON.stringify({ status: "APPLIED", created: pending.length, skipped: catalog.jobs.length - pending.length }));
}
main().catch((error) => { console.error(`DEMO_JOBS_BLOCKED ${error.message}`); process.exitCode = 1; });
