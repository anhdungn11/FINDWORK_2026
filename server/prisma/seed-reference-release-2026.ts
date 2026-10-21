import "dotenv/config";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { syncReferenceRelease2026 } from "./seed-data/reference-release-2026";

const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--dry-run" && arg !== "--apply") ||
    (args.includes("--dry-run") && args.includes("--apply"))) {
  throw new Error("Usage: npm run db:seed:reference:2026 -- [--dry-run|--apply]");
}
const mode = args.includes("--apply") ? "apply" : "dry-run";
const urlText = process.env.DATABASE_URL;
if (!urlText) throw new Error("DATABASE_URL is required");
const url = new URL(urlText);
if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" ||
    (url.port || "5432") !== "5432" || decodeURIComponent(url.pathname.slice(1)) !== "findwork_dev" ||
    url.searchParams.get("schema") !== "public" || process.env.NODE_ENV !== "development") {
  throw new Error("Only development findwork_dev/public on 127.0.0.1:5432 is allowed");
}

function verifyBackup(): { path: string; sha256: string; bytes: number } {
  const backup = process.env.REFERENCE_SEED_BACKUP_PATH;
  const expectedHash = process.env.REFERENCE_SEED_BACKUP_SHA256?.toLowerCase();
  const restoreBinary = process.env.REFERENCE_SEED_PG_RESTORE;
  if (!backup || !expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash) || !restoreBinary) {
    throw new Error("Backup path, SHA-256, and pg_restore binary must be supplied explicitly");
  }
  const absolute = realpathSync(backup);
  const repoRoot = path.resolve(__dirname, "../..");
  const relative = path.relative(repoRoot, absolute);
  if (!path.isAbsolute(backup) || !absolute.endsWith(".dump") ||
      (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))) {
    throw new Error("Backup must be a custom-format .dump outside the Git worktree");
  }
  const stat = statSync(absolute);
  if (!stat.isFile() || stat.size === 0 || Date.now() - stat.mtimeMs > 24 * 60 * 60 * 1000) {
    throw new Error("Backup must be a nonempty file made within the last 24 hours");
  }
  const actualHash = createHash("sha256").update(readFileSync(absolute)).digest("hex");
  if (actualHash !== expectedHash) throw new Error("Backup SHA-256 does not match");
  const listing = execFileSync(restoreBinary, ["--list", absolute], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (!/;\s+dbname: findwork_dev\s*$/m.test(listing) || !/;\s+Format: CUSTOM\s*$/m.test(listing) ||
      !/;\s+TOC Entries: [1-9]\d*\s*$/m.test(listing)) {
    throw new Error("pg_restore listing is not a findwork_dev custom-format backup");
  }
  return { path: absolute, sha256: actualHash, bytes: stat.size };
}

if (mode === "apply" && (process.env.REFERENCE_SEED_ALLOW_WRITE !== "YES" ||
    process.env.REFERENCE_SEED_EXPECT_DATABASE !== "findwork_dev" ||
    process.env.REFERENCE_SEED_APPROVED_SCOPE !== "skills-certificates-and-2026-provinces")) {
  throw new Error("Apply requires a separate approval and exact write-scope environment gates");
}
const backup = verifyBackup();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlText }) });

async function preservedCounts(db: Prisma.TransactionClient) {
  const [users, companies, jobs, applications, drafts, profiles] = await Promise.all([
    db.user.count(), db.company.count(), db.job.count(), db.application.count(),
    db.candidateOnboardingDraft.count(), db.candidateProfile.count(),
  ]);
  return { users, companies, jobs, applications, drafts, profiles };
}

async function main() {
  const result = await prisma.$transaction(async (db) => {
    if (mode === "dry-run") await db.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const rows = await db.$queryRaw<Array<{
      database: string; schema: string; address: string | null; port: number; read_only: string;
    }>>`SELECT current_database() AS database, current_schema() AS schema,
      inet_server_addr()::text AS address, inet_server_port() AS port,
      current_setting('transaction_read_only') AS read_only`;
    const identity = rows[0];
    if (!identity || identity.database !== "findwork_dev" || identity.schema !== "public" ||
        !["127.0.0.1", "127.0.0.1/32"].includes(identity.address ?? "") || identity.port !== 5432 ||
        identity.read_only !== (mode === "dry-run" ? "on" : "off")) {
      throw new Error(`Actual PostgreSQL identity or transaction mode does not match approved target: ${JSON.stringify(identity)}`);
    }
    const before = await preservedCounts(db);
    const report = await syncReferenceRelease2026(db, mode);
    const after = await preservedCounts(db);
    if (Object.keys(before).some((key) => before[key as keyof typeof before] !== after[key as keyof typeof after])) {
      throw new Error("Unrelated business record counts changed; transaction rolled back");
    }
    return { identity, backup, before, after, ...report };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 120_000 });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`Reference release blocked; transaction rolled back: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
