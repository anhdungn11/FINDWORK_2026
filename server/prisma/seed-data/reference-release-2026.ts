import type { Prisma } from "../../src/generated/prisma/client";
import {
  ADMINISTRATIVE_2026_SNAPSHOT,
  validateAdministrativeProvinceSnapshot,
} from "./vietnam-administrative-2026";
import { REFERENCE_SNAPSHOT, syncReferenceFoundation } from "./reference-foundation";

type Db = Prisma.TransactionClient;
type Counts = { create: number; unchanged: number };

export interface ReferenceReleaseReport {
  provinceVersion: string;
  skillCertificateVersion: string;
  mode: "dry-run" | "apply";
  skills: { create: number; update: number; unchanged: number };
  certificates: { create: number; update: number; unchanged: number };
  provinces: Counts;
  wards: "BLOCKED: no complete, verified 2026 ward snapshot is bundled";
}

/** Read and conflict-check the complete reviewed province catalog before any write. */
export async function preview2026Provinces(db: Db): Promise<Counts> {
  validateAdministrativeProvinceSnapshot(ADMINISTRATIVE_2026_SNAPSHOT);
  const expected = ADMINISTRATIVE_2026_SNAPSHOT.provinces;
  const expectedCodes = new Set(expected.map((item) => item.code));
  const existing = await db.province.findMany({
    select: { code: true, name: true, divisionType: true, isActive: true },
  });
  const unexpected = existing.find((item) => !expectedCodes.has(item.code));
  if (unexpected) throw new Error(`Province ${unexpected.code}: code outside reviewed 2026 catalog requires manual review`);
  const byCode = new Map(existing.map((item) => [item.code, item]));
  let create = 0;
  for (const item of expected) {
    const current = byCode.get(item.code);
    if (!current) {
      create++;
    } else if (!current.isActive || current.name !== item.name || current.divisionType !== item.divisionType) {
      throw new Error(`Province ${item.code}: existing inactive or changed record requires history review`);
    }
  }
  return { create, unchanged: expected.length - create };
}

/** One caller-owned transaction for the verified 34 provinces and 67/30 career catalogs. */
export async function syncReferenceRelease2026(db: Db, mode: "dry-run" | "apply"): Promise<ReferenceReleaseReport> {
  const provinces = await preview2026Provinces(db);
  // Preflight all career references before writing provinces. The caller rolls back any later error.
  await syncReferenceFoundation(db, REFERENCE_SNAPSHOT, "dry-run", "skills-certificates");
  if (mode === "apply") {
    const inserted = await db.province.createMany({
      data: ADMINISTRATIVE_2026_SNAPSHOT.provinces.map((item) => ({
        code: item.code, name: item.name, divisionType: item.divisionType, isActive: true,
      })),
      skipDuplicates: true,
    });
    if (inserted.count !== provinces.create) throw new Error("Province catalog changed during apply");
    // Recheck after concurrent writes: no code can silently take a different label or type.
    const after = await preview2026Provinces(db);
    if (after.create !== 0) throw new Error("Province catalog changed during apply");
  }
  const career = await syncReferenceFoundation(db, REFERENCE_SNAPSHOT, mode, "skills-certificates");
  return {
    provinceVersion: ADMINISTRATIVE_2026_SNAPSHOT.version,
    skillCertificateVersion: REFERENCE_SNAPSHOT.version,
    mode,
    skills: career.tables.skills,
    certificates: career.tables.certificates,
    provinces,
    wards: "BLOCKED: no complete, verified 2026 ward snapshot is bundled",
  };
}
