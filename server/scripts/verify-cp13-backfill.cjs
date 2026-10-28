const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

async function main() {
  const envFile = process.argv[2];
  if (!envFile) throw new Error("Pass a disposable test environment file.");
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (match) process.env[match[1]] = match[2];
  }
  const url = new URL(process.env.DATABASE_URL);
  if (process.env.NODE_ENV !== "test" || url.hostname !== "127.0.0.1" ||
      url.port !== "55432" || url.pathname !== "/findwork_test" ||
      !/^\d{15,20}$/.test(process.env.FINDWORK_TEST_DOCKER_SYSTEM_ID || "")) {
    throw new Error("Only the fingerprinted disposable Docker database is permitted.");
  }
  const companyId = JSON.parse(fs.readFileSync(path.resolve(__dirname,
    "../../docs/evidence/cp13-chrome-acceptance.json"), "utf8")).companyId;
  const migration = fs.readFileSync(path.resolve(__dirname,
    "../prisma/migrations/20261028120000_company_platform_capabilities/migration.sql"), "utf8");
  const insert = migration.slice(migration.indexOf("INSERT INTO \"CompanyPlatformCapability\"")).trim();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const identity = await db.query("SELECT current_database() AS database, system_identifier::text FROM pg_control_system()");
    if (identity.rows[0].database !== "findwork_test" ||
        identity.rows[0].system_identifier !== process.env.FINDWORK_TEST_DOCKER_SYSTEM_ID) {
      throw new Error("Disposable PostgreSQL fingerprint mismatch.");
    }
    await db.query("BEGIN");
    try {
      const before = await db.query('SELECT "verificationStatus" FROM "Company" WHERE id=$1', [companyId]);
      if (before.rowCount !== 1) throw new Error("Chrome test company is missing.");
      await db.query('DELETE FROM "CompanyPlatformCapability" WHERE "companyId"=$1', [companyId]);
      await db.query(insert);
      const rows = await db.query('SELECT "capabilityCode", "isGranted" FROM "CompanyPlatformCapability" WHERE "companyId"=$1 ORDER BY "capabilityCode"', [companyId]);
      const after = await db.query('SELECT "verificationStatus" FROM "Company" WHERE id=$1', [companyId]);
      const granted = rows.rows.filter(row => row.isGranted).length;
      const denied = rows.rows.filter(row => !row.isGranted).length;
      const unsupportedDenied = ["ai.business.access", "recruitment.analytics.view"].every(
        code => rows.rows.some(row => row.capabilityCode === code && !row.isGranted));
      if (rows.rowCount !== 10 || granted !== 8 || denied !== 2 || !unsupportedDenied ||
          before.rows[0].verificationStatus !== after.rows[0].verificationStatus) {
        throw new Error("Existing-company backfill policy failed.");
      }
      const result = { database: "disposable Docker findwork_test", systemIdentifier: identity.rows[0].system_identifier,
        existingCompanyId: companyId, capabilityRows: rows.rowCount, granted, denied,
        unsupportedDenied, verificationPreserved: true, transaction: "rolled back" };
      await db.query("ROLLBACK");
      fs.writeFileSync(path.resolve(__dirname, "../../docs/evidence/cp13-backfill-check.json"),
        JSON.stringify(result, null, 2) + "\n");
      process.stdout.write(JSON.stringify(result) + "\n");
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  } finally {
    await db.end();
  }
}
main().catch(error => { process.stderr.write(String(error.stack || error) + "\n"); process.exitCode = 1; });
