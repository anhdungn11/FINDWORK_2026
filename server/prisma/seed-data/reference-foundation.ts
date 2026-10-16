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
  scope: "skills-certificates" | "all";
  tables: Record<"skills" | "certificates" | "provinces", Record<Operation, number>>;
  provinces: "BLOCKED: snapshot reflects 2025-07-01 boundaries, not verified for 2026";
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

function normalizedText(label: string, value: string): void {
  if (!value.trim() || value !== value.trim() || value !== value.normalize("NFC")) {
    throw new Error(`${label}: blank, padded, or non-NFC text`);
  }
}

function uniqueNames<T>(label: string, items: T[], name: (item: T) => string): void {
  const seen = new Set<string>();
  for (const item of items) {
    const value = name(item).toLocaleLowerCase("vi");
    if (seen.has(value)) throw new Error(`${label}: duplicate normalized name '${name(item)}'`);
    seen.add(value);
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
  uniqueNames("Skill", snapshot.skills, (item) => item.name);
  uniqueNames("Certificate", snapshot.certificates, (item) => item.label);
  for (const skill of snapshot.skills) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.categoryCode) || !Array.isArray(skill.aliases)) {
      throw new Error(`Invalid skill ${skill.code}`);
    }
    normalizedText(`Skill ${skill.code} name`, skill.name);
    for (const alias of skill.aliases) normalizedText(`Skill ${skill.code} alias`, alias);
    if (new Set(skill.aliases.map((alias) => alias.toLocaleLowerCase("vi"))).size !== skill.aliases.length) {
      throw new Error(`Skill ${skill.code}: duplicate alias`);
    }
  }
  for (const certificate of snapshot.certificates) {
    if (!/^[a-z]{2,3}$/.test(certificate.languageCode) ||
        !Array.isArray(certificate.scoreFields) || !Array.isArray(certificate.levelOptions ?? [])) {
      throw new Error(`Invalid certificate ${certificate.code}`);
    }
    normalizedText(`Certificate ${certificate.code} label`, certificate.label);
    uniqueCodes(`Score fields for ${certificate.code}`, certificate.scoreFields, /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/);
    for (const field of certificate.scoreFields) {
      normalizedText(`Certificate ${certificate.code} score field ${field.code}`, field.label);
      if ((field.min !== undefined && (!Number.isFinite(field.min) || field.min < 0)) ||
          (field.max !== undefined && (!Number.isFinite(field.max) || field.max < (field.min ?? 0))) ||
          (field.step !== undefined && (!Number.isFinite(field.step) || field.step <= 0))) {
        throw new Error(`Certificate ${certificate.code}: invalid score field ${field.code}`);
      }
    }
    for (const level of certificate.levelOptions ?? []) normalizedText(`Certificate ${certificate.code} level`, level);
    if (new Set((certificate.levelOptions ?? []).map((level) => level.toLocaleLowerCase("vi"))).size !== (certificate.levelOptions ?? []).length) {
      throw new Error(`Certificate ${certificate.code}: duplicate level option`);
    }
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
  scope: "skills-certificates" | "all" = "all",
): Promise<ReferenceReport> {
  validateReferenceSnapshot(snapshot);
  if (mode === "apply" && scope !== "skills-certificates") {
    throw new Error("Province snapshot is outdated for 2026; apply requires skills-certificates scope");
  }
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

  const [skills, certificates] = await Promise.all([
    db.skill.findMany({ where: { code: { in: snapshot.skills.map((item) => item.code) } }, select: { code: true, name: true, categoryId: true, aliases: true, isActive: true, sortOrder: true } }),
    db.languageCertificateType.findMany({ where: { code: { in: snapshot.certificates.map((item) => item.code) } }, select: { code: true, languageId: true, label: true, supportsOverallScore: true, supportsLevel: true, levelOptions: true, scoreFields: true, isActive: true, sortOrder: true } }),
  ]);
  const skillByCode = new Map(skills.map((item) => [item.code, item]));
  const certificateByCode = new Map(certificates.map((item) => [item.code, item]));
  for (const item of snapshot.skills) {
    const current = skillByCode.get(item.code);
    if (current && (!current.isActive || current.categoryId !== categoryByCode.get(item.categoryCode)!.id)) {
      throw new Error(`Skill ${item.code}: inactive code or category conflict requires manual review`);
    }
  }
  for (const item of snapshot.certificates) {
    const current = certificateByCode.get(item.code);
    if (current && (!current.isActive || current.languageId !== languageByCode.get(item.languageCode)!.id)) {
      throw new Error(`Certificate ${item.code}: inactive code or language conflict requires manual review`);
    }
  }
  const skillOperations: Operation[] = [];
  const certificateOperations: Operation[] = [];

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
  return { version: snapshot.version, mode, scope, tables: { skills: count(skillOperations), certificates: count(certificateOperations), provinces: count([]) }, provinces: "BLOCKED: snapshot reflects 2025-07-01 boundaries, not verified for 2026", wards: "BLOCKED: no verified, versioned ward snapshot" };
}
