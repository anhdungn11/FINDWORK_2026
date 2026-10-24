// Read-only release inventory. Never prints credentials or candidate data.
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

const url = dotenv.parse(readFileSync(resolve(__dirname, "..", ".env.employer-media.local"))).DATABASE_URL;
const target = new URL(url);
if (target.hostname !== "127.0.0.1" || target.port !== "5432" || target.pathname !== "/findwork_employer_media_3002") {
  throw new Error("Unexpected integration DB identity");
}

async function main() {
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query("BEGIN READ ONLY");
    const identity = (await db.query(`SELECT current_database() AS database, current_schema() AS schema,
      (SELECT count(*)::int FROM "Job") AS jobs,
      (SELECT count(*)::int FROM "JobLocation") AS job_locations,
      (SELECT count(*)::int FROM "CompanyLocation") AS company_locations,
      (SELECT count(*)::int FROM "Application") AS applications,
      (SELECT count(*)::int FROM "ResumeVersion") AS resume_versions,
      (SELECT count(*)::int FROM pg_extension WHERE extname='unaccent') AS unaccent`)).rows[0];
    if (identity.database !== "findwork_employer_media_3002" || identity.schema !== "public") throw new Error("Wrong database/schema");
    const status = (await db.query('SELECT status, count(*)::int AS count FROM "Job" GROUP BY status ORDER BY status')).rows;
    const publicRows = (await db.query(`SELECT j.id, j.title, j."companyId", j."publishedAt"
      FROM "Job" j JOIN "Company" c ON c.id=j."companyId" JOIN "JobCategory" cat ON cat.id=j."categoryId"
      WHERE j.status='PUBLISHED' AND c.status='ACTIVE' AND cat."isActive"=true AND j."publishedAt"<=now()
        AND (j."applicationDeadline" IS NULL OR j."applicationDeadline">now())
        AND (j."expiresAt" IS NULL OR j."expiresAt">now())
      ORDER BY j."publishedAt" DESC,j.id DESC LIMIT 20`)).rows;
    console.log(JSON.stringify({ identity, status, publicRows }));
    await db.query("ROLLBACK");
  } finally { await db.end(); }
}
main().catch((error) => { console.error(`JOB_AUDIT_FAILED ${error.message}`); process.exitCode = 1; });
