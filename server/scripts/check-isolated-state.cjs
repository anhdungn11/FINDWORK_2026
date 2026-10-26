// Read-only release evidence from the exact integration database.
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

const url = dotenv.parse(readFileSync(path.resolve(__dirname, "..", ".env.employer-media.local"))).DATABASE_URL;
const parsed = new URL(url);
if (parsed.protocol !== "postgresql:" || parsed.hostname !== "127.0.0.1" || parsed.port !== "5432" ||
    parsed.pathname !== "/findwork_employer_media_3002") throw new Error("Unexpected integration URL identity");

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const result = await client.query(`SELECT current_database() AS database, current_schema() AS schema,
      host(inet_server_addr()) AS address, inet_server_port() AS port,
      (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrations,
      (SELECT count(*)::int FROM "User") AS users,
      (SELECT count(*)::int FROM "Company") AS companies,
      (SELECT count(*)::int FROM "CompanyMember" WHERE status='ACTIVE') AS active_members,
      (SELECT count(*)::int FROM "CompanyMember" m JOIN "CompanyMemberRole" mr ON mr."companyMemberId"=m.id AND mr."companyId"=m."companyId" JOIN "Role" r ON r.id=mr."roleId" AND r."companyId"=m."companyId" WHERE m.status='ACTIVE' AND m."isOwner"=true AND r.kind='COMPANY' AND r.name='OWNER') AS owners,
      (SELECT count(*)::int FROM "Company" WHERE "logoAssetKey" IS NOT NULL OR "coverAssetKey" IS NOT NULL) AS companies_with_media,
      (SELECT count(*)::int FROM "Province") AS provinces,
      (SELECT count(*)::int FROM "Ward") AS wards,
      (SELECT count(*)::int FROM "Skill") AS skills,
      (SELECT count(*)::int FROM "LanguageCertificateType") AS certificates,
      (SELECT count(*)::int FROM "Role") AS roles,
      (SELECT count(*)::int FROM "SystemUserRole" sr JOIN "Role" r ON r.id=sr."roleId"
        WHERE r."systemCode"='SUPER_ADMIN') AS super_admin_assignments,
      (SELECT count(*)::int FROM "Permission") AS permissions`);
    const row = result.rows[0];
    if (row.database !== "findwork_employer_media_3002" || row.schema !== "public" ||
        row.address !== "127.0.0.1" || row.port !== 5432) throw new Error("Connected database identity mismatch");
    console.log(JSON.stringify(row));
    await client.query("ROLLBACK");
  } finally { await client.end(); }
}
main().catch((error) => { console.error(`STATE_CHECK_FAILED ${error.message}`); process.exitCode = 1; });
