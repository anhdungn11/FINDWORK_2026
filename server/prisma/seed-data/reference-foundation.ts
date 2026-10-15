import type { Prisma } from "../../src/generated/prisma/client";
import { isDeepStrictEqual } from "node:util";

export interface SkillSource {
  code: string; name: string; categoryCode: string; aliases: string[];
}
export interface CertificateSource {
  code: string; languageCode: string; label: string;
  supportsOverallScore: boolean; supportsLevel: boolean;
  levelOptions?: string[];
  scoreFields: Array<{ code: string; label: string; min?: number; max?: number; step?: number }>;
}
export interface ProvinceSource {
  code: string; name: string; divisionType: string;
}
export interface ReferenceSnapshot {
  version: string;
  provinceBoundaryEffectiveDate: string;
  sources: Record<string, string>;
  skills: SkillSource[];
  certificates: CertificateSource[];
  provinces: ProvinceSource[];
}

export const REFERENCE_SNAPSHOT = require("./reference-snapshot.json") as ReferenceSnapshot;

type Db = Prisma.TransactionClient;
type Operation = "create" | "update" | "unchanged";
export interface ReferenceReport {
  version: string;
  mode: "dry-run" | "apply";
  tables: Record<"skills" | "certificates" | "provinces", Record<Operation, number>>;
  wards: "BLOCKED: no verified, versioned ward snapshot";
}

function uniqueCodes<T extends { code: string }>(label: string, items: T[], pattern: RegExp): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (!pattern.test(item.code) || item.code !== item.code.trim()) {
      throw new Error(`${label}: invalid code '${item.code}'`);
    }
    if (seen.has(item.code)) throw new Error(`${label}: duplicate code '${item.code}'`);
    seen.add(item.code);
  }
}

export function validateReferenceSnapshot(snapshot: ReferenceSnapshot): void {
  if (!/^cp8a-\d{4}-\d{2}-\d{2}$/.test(snapshot.version)) throw new Error("Invalid snapshot version");
  if (snapshot.provinceBoundaryEffectiveDate !== "2025-07-01") throw new Error("Unexpected province boundary version");
  if (snapshot.skills.length !== 67 || snapshot.certificates.length !== 30 || snapshot.provinces.length !== 34) {
    throw new Error("Reference snapshot coverage differs from reviewed catalogs");
  }
  uniqueCodes("Skill", snapshot.skills, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  uniqueCodes("Certificate", snapshot.certificates, /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/);
  uniqueCodes("Province", snapshot.provinces, /^\d{2}$/);
  for (const skill of snapshot.skills) {
    if (!skill.name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.categoryCode) ||
        !Array.isArray(skill.aliases) || skill.aliases.some((alias) => !alias.trim())) {
      throw new Error(`Invalid skill ${skill.code}`);
    }
  }
  for (const certificate of snapshot.certificates) {
    if (!certificate.label.trim() || !/^[a-z]{2,3}$/.test(certificate.languageCode) ||
        !Array.isArray(certificate.scoreFields) || !Array.isArray(certificate.levelOptions ?? [])) {
      throw new Error(`Invalid certificate ${certificate.code}`);
    }
    uniqueCodes(`Score fields for ${certificate.code}`, certificate.scoreFields, /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/);
    if (certificate.scoreFields.some((field) => !field.label.trim())) throw new Error(`Invalid score field for ${certificate.code}`);
  }
  for (const province of snapshot.provinces) {
    if (!province.name.trim() || !["province", "centrally-governed-city"].includes(province.divisionType)) {
      throw new Error(`Invalid province ${province.code}`);
    }
  }
}

function count(operations: Operation[]): Record<Operation, number> {
  return {
    create: operations.filter((operation) => operation === "create").length,
    update: operations.filter((operation) => operation === "update").length,
    unchanged: operations.filter((operation) => operation === "unchanged").length,
  };
}

function action(current: object | undefined, expected: object): Operation {
  if (!current) return "create";
  return isDeepStrictEqual(current, expected) ? "unchanged" : "update";
}

/** Reads and parent checks happen inside the caller's transaction. Apply uses code upserts only. */
export async function syncReferenceFoundation(
  db: Db,
  snapshot: ReferenceSnapshot,
  mode: "dry-run" | "apply",
): Promise<ReferenceReport> {
  validateReferenceSnapshot(snapshot);
  const categories = await db.skillCategory.findMany({
    where: { code: { in: [...new Set(snapshot.skills.map((item) => item.categoryCode))] } },
    select: { id: true, code: true, isActive: true },
  });
  const languages = await db.language.findMany({
    where: { code: { in: [...new Set(snapshot.certificates.map((item) => item.languageCode))] } },
    select: { id: true, code: true, isActive: true },
  });
  const categoryByCode = new Map(categories.map((item) => [item.code, item]));
  const languageByCode = new Map(languages.map((item) => [item.code, item]));
  for (const skill of snapshot.skills) {
    if (!categoryByCode.get(skill.categoryCode)?.isActive) throw new Error(`Skill ${skill.code}: missing/inactive category ${skill.categoryCode}`);
  }
  for (const certificate of snapshot.certificates) {
    if (!languageByCode.get(certificate.languageCode)?.isActive) throw new Error(`Certificate ${certificate.code}: missing/inactive language ${certificate.languageCode}`);
  }

  const [skills, certificates, provinces] = await Promise.all([
    db.skill.findMany({ where: { code: { in: snapshot.skills.map((item) => item.code) } }, select: { code: true, name: true, categoryId: true, aliases: true, isActive: true, sortOrder: true } }),
    db.languageCertificateType.findMany({ where: { code: { in: snapshot.certificates.map((item) => item.code) } }, select: { code: true, languageId: true, label: true, supportsOverallScore: true, supportsLevel: true, levelOptions: true, scoreFields: true, isActive: true, sortOrder: true } }),
    db.province.findMany({ where: { code: { in: snapshot.provinces.map((item) => item.code) } }, select: { code: true, name: true, divisionType: true, isActive: true } }),
  ]);
  const skillByCode = new Map(skills.map((item) => [item.code, item]));
  const certificateByCode = new Map(certificates.map((item) => [item.code, item]));
  const provinceByCode = new Map(provinces.map((item) => [item.code, item]));
  const skillOperations: Operation[] = [];
  const certificateOperations: Operation[] = [];
  const provinceOperations: Operation[] = [];

  for (const [sortOrder, item] of snapshot.skills.entries()) {
    const expected = { name: item.name, categoryId: categoryByCode.get(item.categoryCode)!.id, aliases: item.aliases, isActive: true, sortOrder };
    const current = skillByCode.get(item.code);
    const operation = action(current && { name: current.name, categoryId: current.categoryId, aliases: current.aliases, isActive: current.isActive, sortOrder: current.sortOrder }, expected);
    skillOperations.push(operation);
    if (mode === "apply" && operation !== "unchanged") await db.skill.upsert({ where: { code: item.code }, create: { code: item.code, ...expected }, update: expected });
  }
  for (const [sortOrder, item] of snapshot.certificates.entries()) {
    const expected = { languageId: languageByCode.get(item.languageCode)!.id, label: item.label, supportsOverallScore: item.supportsOverallScore, supportsLevel: item.supportsLevel, levelOptions: item.levelOptions ?? [], scoreFields: item.scoreFields as unknown as Prisma.InputJsonValue, isActive: true, sortOrder };
    const current = certificateByCode.get(item.code);
    const currentFields = current && { languageId: current.languageId, label: current.label, supportsOverallScore: current.supportsOverallScore, supportsLevel: current.supportsLevel, levelOptions: current.levelOptions, scoreFields: current.scoreFields, isActive: current.isActive, sortOrder: current.sortOrder };
    const operation = action(currentFields, expected);
    certificateOperations.push(operation);
    if (mode === "apply" && operation !== "unchanged") await db.languageCertificateType.upsert({ where: { code: item.code }, create: { code: item.code, ...expected }, update: expected });
  }
  for (const item of snapshot.provinces) {
    const expected = { name: item.name, divisionType: item.divisionType, isActive: true };
    const current = provinceByCode.get(item.code);
    const operation = action(current && { name: current.name, divisionType: current.divisionType, isActive: current.isActive }, expected);
    provinceOperations.push(operation);
    if (mode === "apply" && operation !== "unchanged") await db.province.upsert({ where: { code: item.code }, create: { code: item.code, ...expected }, update: expected });
  }
  return { version: snapshot.version, mode, tables: { skills: count(skillOperations), certificates: count(certificateOperations), provinces: count(provinceOperations) }, wards: "BLOCKED: no verified, versioned ward snapshot" };
}
