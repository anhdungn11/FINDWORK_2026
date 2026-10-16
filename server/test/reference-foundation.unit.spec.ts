import { REFERENCE_SNAPSHOT, syncReferenceFoundation, validateReferenceSnapshot } from "../prisma/seed-data/reference-foundation";
import { snapshot as frontendSnapshot } from "../prisma/seed-data/build-reference-snapshot";
import { JOB_CATEGORIES, SKILL_CATEGORIES, LANGUAGES } from "../prisma/seed-data/reference-data";
import { JOB_CATEGORY_OPTIONS } from "../../src/data/reference/jobs/job-categories";
import { SKILL_CATEGORIES as FRONTEND_SKILL_CATEGORIES } from "../../src/data/reference/skills/skill.categories";
import { LANGUAGE_OPTIONS } from "../../src/data/reference/languages/language.options";

function fakeDb() {
  const skills = new Map<string, Record<string, unknown>>();
  const certificates = new Map<string, Record<string, unknown>>();
  const provinces = new Map<string, Record<string, unknown>>();
  const upsertSkill = jest.fn(async ({ where, create, update }: { where: { code: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
    skills.set(where.code, { ...skills.get(where.code), code: where.code, ...(skills.has(where.code) ? update : create) });
  });
  const upsertCertificate = jest.fn(async ({ where, create, update }: { where: { code: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
    certificates.set(where.code, { code: where.code, ...(certificates.has(where.code) ? update : create) });
  });
  const upsertProvince = jest.fn(async ({ where, create, update }: { where: { code: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
    provinces.set(where.code, { code: where.code, ...(provinces.has(where.code) ? update : create) });
  });
  return {
    skillCategory: { findMany: async () => SKILL_CATEGORIES.map(({ code }) => ({ code, id: `category:${code}`, isActive: true })) },
    language: { findMany: async () => LANGUAGES.map(({ code }) => ({ code, id: `language:${code}`, isActive: true })) },
    skill: { findMany: async () => [...skills.values()], upsert: upsertSkill },
    languageCertificateType: { findMany: async () => [...certificates.values()], upsert: upsertCertificate },
    province: { findMany: async () => [...provinces.values()], upsert: upsertProvince },
    stores: { skills, certificates, provinces },
  };
}

describe("reference foundation snapshot", () => {
  it("matches all frontend catalogs exactly, including leading zero province codes and parent references", () => {
    expect(JOB_CATEGORIES).toEqual(JOB_CATEGORY_OPTIONS);
    expect(SKILL_CATEGORIES).toEqual(FRONTEND_SKILL_CATEGORIES);
    expect(LANGUAGE_OPTIONS.filter((item) => item.code !== "other")).toEqual(LANGUAGES);
    expect(LANGUAGE_OPTIONS.filter((item) => item.code === "other")).toHaveLength(1);
    expect(REFERENCE_SNAPSHOT).toEqual(frontendSnapshot);
    expect(REFERENCE_SNAPSHOT.skills).toHaveLength(67);
    expect(REFERENCE_SNAPSHOT.certificates).toHaveLength(30);
    expect(REFERENCE_SNAPSHOT.provinces).toHaveLength(34);
    expect(REFERENCE_SNAPSHOT.provinces[0]?.code).toBe("01");
    expect(() => validateReferenceSnapshot(REFERENCE_SNAPSHOT)).not.toThrow();
    expect(REFERENCE_SNAPSHOT.skills.every((item) => SKILL_CATEGORIES.some((category) => category.code === item.categoryCode))).toBe(true);
    expect(REFERENCE_SNAPSHOT.certificates.every((item) => LANGUAGES.some((language) => language.code === item.languageCode))).toBe(true);
  });

  it("rejects duplicate or invalid codes before any writes", () => {
    expect(() => validateReferenceSnapshot({ ...REFERENCE_SNAPSHOT, skills: [REFERENCE_SNAPSHOT.skills[0]!, ...REFERENCE_SNAPSHOT.skills.slice(0, -1)] })).toThrow(/duplicate code/);
    expect(() => validateReferenceSnapshot({ ...REFERENCE_SNAPSHOT, provinces: [{ ...REFERENCE_SNAPSHOT.provinces[0]!, code: "1" }, ...REFERENCE_SNAPSHOT.provinces.slice(1)] })).toThrow(/invalid code/);
  });

  it("dry-runs without writes, applies by code, then remains unchanged on replay", async () => {
    const db = fakeDb();
    const dry = await syncReferenceFoundation(db as never, REFERENCE_SNAPSHOT, "dry-run");
    expect(dry.tables).toEqual({ skills: { create: 67, update: 0, unchanged: 0 }, certificates: { create: 30, update: 0, unchanged: 0 }, provinces: { create: 0, update: 0, unchanged: 0 } });
    expect(dry.provinces).toMatch(/^BLOCKED:/);
    expect(db.skill.upsert).not.toHaveBeenCalled();
    expect(db.languageCertificateType.upsert).not.toHaveBeenCalled();
    expect(db.province.upsert).not.toHaveBeenCalled();
    await syncReferenceFoundation(db as never, REFERENCE_SNAPSHOT, "apply", "skills-certificates");
    expect(db.skill.upsert).toHaveBeenCalledTimes(67);
    expect(db.languageCertificateType.upsert).toHaveBeenCalledTimes(30);
    expect(db.province.upsert).not.toHaveBeenCalled();
    const replay = await syncReferenceFoundation(db as never, REFERENCE_SNAPSHOT, "apply", "skills-certificates");
    expect(replay.tables.skills.unchanged).toBe(67);
    expect(replay.tables.certificates.unchanged).toBe(30);
    expect(replay.tables.provinces.unchanged).toBe(0);
    expect(db.skill.upsert).toHaveBeenCalledTimes(67);
  });

  it("rejects a missing or inactive parent before writes", async () => {
    const db = fakeDb();
    db.skillCategory.findMany = async () => [];
    await expect(syncReferenceFoundation(db as never, REFERENCE_SNAPSHOT, "apply", "skills-certificates")).rejects.toThrow(/missing\/inactive category/);
    expect(db.skill.upsert).not.toHaveBeenCalled();
  });

  it("updates an existing active code without replacing its persisted ID or unrelated rows", async () => {
    const db = fakeDb();
    db.stores.skills.set("javascript", { id: "existing-id", code: "javascript", name: "Old label", categoryId: "category:software-development", aliases: [], isActive: true, sortOrder: 0 });
    db.stores.skills.set("custom-skill", { id: "custom-id", code: "custom-skill", name: "Custom", categoryId: "category:software-development", aliases: [], isActive: true, sortOrder: 100 });
    const report = await syncReferenceFoundation(db as never, REFERENCE_SNAPSHOT, "apply", "skills-certificates");
    expect(report.tables.skills).toEqual({ create: 66, update: 1, unchanged: 0 });
    expect(db.stores.skills.get("javascript")?.id).toBe("existing-id");
    expect(db.stores.skills.get("custom-skill")?.isActive).toBe(true);
    expect(db.skill.upsert.mock.calls.every(([call]) => !("id" in call.create) && !("id" in call.update))).toBe(true);
  });

  it("treats reordered scoreFields object keys as unchanged and preserves updatedAt", async () => {
    const db = fakeDb();
    await syncReferenceFoundation(db as never, REFERENCE_SNAPSHOT, "apply", "skills-certificates");
    const code = REFERENCE_SNAPSHOT.certificates[0]!.code;
    const original = db.stores.certificates.get(code)!;
    const reordered = (original.scoreFields as Record<string, unknown>[]).map((field) =>
      Object.fromEntries(Object.entries(field).reverse()));
    db.stores.certificates.set(code, { ...original, id: "existing-id", updatedAt: "unchanged-time", scoreFields: reordered });
    db.languageCertificateType.upsert.mockClear();
    const preview = await syncReferenceFoundation(db as never, REFERENCE_SNAPSHOT, "dry-run");
    const replay = await syncReferenceFoundation(db as never, REFERENCE_SNAPSHOT, "apply", "skills-certificates");
    expect(preview.tables.certificates).toEqual({ create: 0, update: 0, unchanged: 30 });
    expect(replay.tables.certificates).toEqual({ create: 0, update: 0, unchanged: 30 });
    expect(db.languageCertificateType.upsert).not.toHaveBeenCalled();
    expect(db.stores.certificates.get(code)).toMatchObject({ id: "existing-id", updatedAt: "unchanged-time" });
  });

  it("blocks an unscoped apply before any write", async () => {
    const db = fakeDb();
    await expect(syncReferenceFoundation(db as never, REFERENCE_SNAPSHOT, "apply"))
      .rejects.toThrow(/Province snapshot is outdated/);
    expect(db.skill.upsert).not.toHaveBeenCalled();
    expect(db.languageCertificateType.upsert).not.toHaveBeenCalled();
    expect(db.province.upsert).not.toHaveBeenCalled();
  });

  it("blocks inactive or reassigned existing codes before writing any catalog", async () => {
    for (const conflict of [
      { catalog: "skill", code: "javascript", categoryId: "category:software-development", isActive: false },
      { catalog: "skill", code: "javascript", categoryId: "category:other", isActive: true },
      { catalog: "certificate", code: REFERENCE_SNAPSHOT.certificates[0]!.code, languageId: "language:other", isActive: true },
    ]) {
      const db = fakeDb();
      if (conflict.catalog === "skill") db.stores.skills.set(conflict.code, conflict);
      else db.stores.certificates.set(conflict.code, conflict);
      await expect(syncReferenceFoundation(db as never, REFERENCE_SNAPSHOT, "apply", "skills-certificates"))
        .rejects.toThrow(/manual review/);
      expect(db.skill.upsert).not.toHaveBeenCalled();
      expect(db.languageCertificateType.upsert).not.toHaveBeenCalled();
    }
  });

  it("rejects non-NFC text and duplicate aliases before any write", () => {
    const first = REFERENCE_SNAPSHOT.skills[0]!;
    expect(() => validateReferenceSnapshot({
      ...REFERENCE_SNAPSHOT,
      skills: [{ ...first, name: "Ky\u0303 na\u0306ng" }, ...REFERENCE_SNAPSHOT.skills.slice(1)],
    })).toThrow(/non-NFC/);
    expect(() => validateReferenceSnapshot({
      ...REFERENCE_SNAPSHOT,
      skills: [{ ...first, aliases: ["Vue", "vue"] }, ...REFERENCE_SNAPSHOT.skills.slice(1)],
    })).toThrow(/duplicate alias/);
    expect(() => validateReferenceSnapshot({
      ...REFERENCE_SNAPSHOT,
      skills: [first, { ...REFERENCE_SNAPSHOT.skills[1]!, name: first.name.toUpperCase() }, ...REFERENCE_SNAPSHOT.skills.slice(2)],
    })).toThrow(/duplicate normalized name/);
  });
});
