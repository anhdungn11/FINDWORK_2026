/** Read-only, credential-safe snapshot for the Candidate import PostgreSQL gate. */
const fs = require("node:fs");
const dotenv = require("dotenv");
const { Client } = require("pg");

const sharedTables = [
  "Role", "Permission", "RolePermission", "JobCategory", "SkillCategory",
  "Language", "Skill", "LanguageCertificateType", "Province", "Ward",
];
const fixtureTables = [
  "User", "AuthSession", "CandidateOnboardingDraft", "CandidateProfile",
  "CandidatePrivacySetting", "CandidateEducation", "CandidateExperience",
  "CandidateExperienceSkill", "CandidateSkill", "CandidateLanguage",
  "CandidateLanguageCertificate", "CandidateCareerPreference", "CandidateDesiredPosition",
  "CandidatePreferredCategory", "CandidatePreferredLocation",
  "CandidatePreferredEmploymentType", "CandidatePreferredWorkplaceType",
  "SystemUserRole", "SystemUserPermission", "Resume",
];

async function main() {
  const env = dotenv.parse(fs.readFileSync(".env.test"));
  const url = new URL(env.DATABASE_URL ?? "");
  const config = {
    nodeEnv: env.NODE_ENV,
    host: url.hostname,
    port: url.port || "5432",
    database: decodeURIComponent(url.pathname.slice(1)),
    schema: url.searchParams.get("schema"),
    testSecurityConfigured: Boolean(env.JWT_ACCESS_SECRET && env.REFRESH_TOKEN_PEPPER),
  };
  if (
    config.nodeEnv !== "test" || !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(config.host) ||
    config.port !== "5432" || config.database !== "findwork_test" ||
    config.schema !== "public" || !config.testSecurityConfigured
  ) throw new Error("UNSAFE_TEST_CONFIGURATION");

  const client = new Client({ connectionString: env.DATABASE_URL });
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const identity = (await client.query(
      "SELECT current_database() AS database, current_user AS db_user, current_schema() AS schema, inet_server_addr()::text AS address, inet_server_port() AS port",
    )).rows[0];
    const version = (await client.query("SHOW server_version")).rows[0].server_version;
    if (
      identity?.database !== "findwork_test" || identity.schema !== "public" ||
      identity.port !== 5432 || !["127.0.0.1", "127.0.0.1/32", "::1", "::1/128"].includes(identity.address)
    ) {
      console.log(JSON.stringify({ config, identity, version }));
      throw new Error("DATABASE_IDENTITY_MISMATCH");
    }

    const databaseNames = (await client.query(
      "SELECT datname, oid::text AS oid FROM pg_database WHERE datname IN ('findwork_test', 'findwork_dev') ORDER BY datname",
    )).rows;
    const testDatabase = databaseNames.find((row) => row.datname === "findwork_test");
    const devDatabase = databaseNames.find((row) => row.datname === "findwork_dev");
    if (!testDatabase || !devDatabase || testDatabase.oid === devDatabase.oid) throw new Error("TEST_DEV_IDENTITY_COLLISION");

    const sourceMigrations = fs.readdirSync("prisma/migrations", { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && fs.existsSync(`prisma/migrations/${entry.name}/migration.sql`))
      .map((entry) => entry.name).sort();
    const migrations = (await client.query(
      "SELECT migration_name, finished_at IS NOT NULL AS completed, rolled_back_at IS NOT NULL AS rolled_back FROM _prisma_migrations ORDER BY migration_name",
    )).rows;
    if (migrations.some((row) => !row.completed || row.rolled_back) ||
      JSON.stringify(migrations.map((row) => row.migration_name)) !== JSON.stringify(sourceMigrations)) {
      throw new Error("MIGRATION_HISTORY_MISMATCH");
    }

    const snapshot = {};
    for (const table of [...sharedTables, ...fixtureTables]) {
      const result = await client.query(
        `SELECT count(*)::int AS count, md5(coalesce(string_agg(row_data, ',' ORDER BY row_data), '')) AS fingerprint FROM (SELECT to_jsonb(t)::text AS row_data FROM public."${table}" t) rows`,
      );
      snapshot[table] = result.rows[0];
    }
    const catalogState = {};
    for (const table of ["JobCategory", "SkillCategory", "Language", "Skill", "LanguageCertificateType", "Province", "Ward"]) {
      catalogState[table] = (await client.query(
        `SELECT count(*) FILTER (WHERE "isActive")::int AS active, count(*) FILTER (WHERE NOT "isActive")::int AS inactive FROM public."${table}"`,
      )).rows[0];
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ config, identity, version, databaseNames, sourceMigrations, migrations, snapshot, catalogState }));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  // Database and connection errors must never expose a URL, password or row data.
  console.error(`CANDIDATE_IMPORT_AUDIT_FAILED:${error.code ?? (error.message?.startsWith("UNSAFE_") || error.message?.endsWith("MISMATCH") || error.message === "TEST_DEV_IDENTITY_COLLISION" ? error.message : "UNEXPECTED_ERROR")}`);
  process.exitCode = 1;
});
