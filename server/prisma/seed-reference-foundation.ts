import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { REFERENCE_SNAPSHOT, syncReferenceFoundation } from "./seed-data/reference-foundation";

const args = process.argv.slice(2);
if (args.some((arg) => !["--dry-run", "--apply", "--skills-certificates-only"].includes(arg)) ||
    (args.includes("--dry-run") && args.includes("--apply"))) {
  throw new Error("Usage: npm run db:seed:reference -- [--dry-run|--apply] [--skills-certificates-only]");
}
const mode = args.includes("--apply") ? "apply" : "dry-run";
const scope = args.includes("--skills-certificates-only") ? "skills-certificates" : "all";
if (mode === "apply" && scope !== "skills-certificates") {
  throw new Error("Province snapshot is outdated for 2026; apply requires --skills-certificates-only");
}
if (mode === "apply" && process.env.REFERENCE_SEED_ALLOW_WRITE !== "YES") {
  throw new Error("Apply requires --apply and REFERENCE_SEED_ALLOW_WRITE=YES");
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const parsed = new URL(url);
if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("PostgreSQL DATABASE_URL required");
const database = decodeURIComponent(parsed.pathname.slice(1));
if (mode === "apply" && (!process.env.REFERENCE_SEED_EXPECT_DATABASE ||
    process.env.REFERENCE_SEED_EXPECT_DATABASE !== database)) {
  throw new Error("Apply requires REFERENCE_SEED_EXPECT_DATABASE to match DATABASE_URL database");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
async function main(): Promise<void> {
  const report = await prisma.$transaction(
    async (db) => {
      if (mode === "dry-run") await db.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return syncReferenceFoundation(db, REFERENCE_SNAPSHOT, mode, scope);
    },
    { maxWait: 10_000, timeout: 120_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  process.stdout.write(`${JSON.stringify({ database, ...report }, null, 2)}\n`);
}
main().catch((error: unknown) => {
  process.stderr.write(`Reference seed failed; transaction rolled back: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
