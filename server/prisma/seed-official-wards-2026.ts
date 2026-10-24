import "dotenv/config";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { loadOfficialWardSnapshot, OFFICIAL_WARD_SNAPSHOT_SHA256 } from "./seed-data/official-ward-snapshot-2026";
import { planOfficialWardImport } from "./seed-data/official-ward-import-plan";

const args = process.argv.slice(2);
if (args.length !== 1 || !["--dry-run", "--apply"].includes(args[0]!)) {
  throw new Error("Usage: npm run db:seed:wards:2026 -- --dry-run|--apply");
}
const apply = args[0] === "--apply";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const url = new URL(connectionString);
if (url.protocol !== "postgresql:" || url.hostname !== "127.0.0.1" || url.port !== "5432" ||
    url.pathname !== "/findwork_employer_media_3002" || url.searchParams.get("schema") !== "public" ||
    process.env.NODE_ENV !== "test") {
  throw new Error("Only findwork_employer_media_3002/public at 127.0.0.1:5432 with NODE_ENV=test is allowed");
}
const snapshot = loadOfficialWardSnapshot();

async function verifyBackup() {
  const backupPath = process.env.WARD_IMPORT_BACKUP_PATH;
  const expectedHash = process.env.WARD_IMPORT_BACKUP_SHA256?.toLowerCase();
  const pgRestore = process.env.WARD_IMPORT_PG_RESTORE;
  if (!backupPath || !expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash) || !pgRestore) {
    throw new Error("A recent custom-format backup, SHA-256 and pg_restore path are required for apply");
  }
  const absolute = realpathSync(backupPath);
  const repoRoot = path.resolve(__dirname, "../..");
  const relative = path.relative(repoRoot, absolute);
  if (!path.isAbsolute(backupPath) || !absolute.endsWith(".dump") ||
      (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))) {
    throw new Error("Backup must be an absolute .dump outside this worktree");
  }
  const stat = statSync(absolute);
  if (!stat.isFile() || stat.size === 0 || Date.now() - stat.mtimeMs > 86_400_000) {
    throw new Error("Backup must be nonempty and less than 24 hours old");
  }
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(absolute)) hash.update(chunk);
  if (hash.digest("hex") !== expectedHash) throw new Error("Backup SHA-256 mismatch");
  const listing = execFileSync(pgRestore, ["--list", absolute], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (!/;\s+dbname: findwork_employer_media_3002\s*$/m.test(listing) ||
      !/;\s+Format: CUSTOM\s*$/m.test(listing) || !/;\s+TOC Entries: [1-9]\d*\s*$/m.test(listing)) {
    throw new Error("Backup is not a custom-format dump of the integration database");
  }
  return { bytes: stat.size, sha256: expectedHash };
}

if (apply && (process.env.WARD_IMPORT_ALLOW_WRITE !== "YES" ||
    process.env.WARD_IMPORT_EXPECT_DATABASE !== "findwork_employer_media_3002" ||
    process.env.WARD_IMPORT_APPROVED_SCOPE !== "official-wards-2026-10-24" ||
    process.env.WARD_IMPORT_APPROVED_SHA256 !== OFFICIAL_WARD_SNAPSHOT_SHA256)) {
  throw new Error("Apply requires separate user approval and the exact artifact/write-scope gates");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
async function main() {
  const backup = apply ? await verifyBackup() : null;
  const result = await prisma.$transaction(async (db) => {
    if (!apply) await db.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const rows = await db.$queryRaw<Array<{ database: string; schema: string; address: string | null;
      port: number; read_only: string }>>`SELECT current_database() AS database, current_schema() AS schema,
      inet_server_addr()::text AS address, inet_server_port() AS port,
      current_setting('transaction_read_only') AS read_only`;
    const identity = rows[0];
    if (!identity || identity.database !== "findwork_employer_media_3002" || identity.schema !== "public" ||
        !["127.0.0.1", "127.0.0.1/32"].includes(identity.address ?? "") || identity.port !== 5432 ||
        identity.read_only !== (apply ? "off" : "on")) {
      throw new Error(`Connected database or transaction mode differs from the isolated target: ${JSON.stringify(identity)}`);
    }
    const [provinces, wards] = await Promise.all([
      db.province.findMany({ select: { id: true, code: true, name: true, isActive: true } }),
      db.ward.findMany({ select: { id: true, code: true, provinceId: true, name: true,
        divisionType: true, codename: true, isActive: true } }),
    ]);
    const { inserts, ...plan } = planOfficialWardImport(snapshot, provinces, wards);
    if (apply) {
      if (plan.missingParents.length || plan.provinceMismatches.length ||
          plan.existingRowsRequiringChanges.length || plan.extraExistingCodes.length) {
        throw new Error("Existing administrative rows require review; import rolled back");
      }
      for (let offset = 0; offset < inserts.length; offset += 400) {
        await db.ward.createMany({ data: inserts.slice(offset, offset + 400) });
      }
      const after = await db.ward.count();
      if (after !== snapshot.expectedCount) throw new Error("Ward count after import is inconsistent; rolled back");
    }
    return { mode: apply ? "apply" : "dry-run", identity, backupVerified: !!backup,
      backup, snapshotSha256: OFFICIAL_WARD_SNAPSHOT_SHA256, ...plan };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 120_000 });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
main().catch((error: unknown) => {
  process.stderr.write(`Official ward import blocked: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
