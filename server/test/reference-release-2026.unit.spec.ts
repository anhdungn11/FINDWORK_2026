import { ADMINISTRATIVE_2026_SNAPSHOT } from "../prisma/seed-data/vietnam-administrative-2026";
import { syncReferenceRelease2026 } from "../prisma/seed-data/reference-release-2026";
import { SKILL_CATEGORIES, LANGUAGES } from "../prisma/seed-data/reference-data";

function fakeDb() {
  const provinces = new Map<string, { code: string; name: string; divisionType: string; isActive: boolean; id: string }>();
  const skills = new Map<string, Record<string, unknown>>();
  const certificates = new Map<string, Record<string, unknown>>();
  const createProvinces = jest.fn(async ({ data }: { data: Array<{ code: string; name: string; divisionType: string; isActive: boolean }> }) => {
    let count = 0;
    for (const row of data) {
      if (!provinces.has(row.code)) {
        provinces.set(row.code, { ...row, id: `province:${row.code}` });
        count++;
      }
    }
    return { count };
  });
  const upsertSkill = jest.fn(async ({ where, create, update }: { where: { code: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
    skills.set(where.code, { code: where.code, ...(skills.has(where.code) ? update : create) });
  });
  const upsertCertificate = jest.fn(async ({ where, create, update }: { where: { code: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
    certificates.set(where.code, { code: where.code, ...(certificates.has(where.code) ? update : create) });
  });
  return {
    province: {
      findMany: async () => [...provinces.values()],
      createMany: createProvinces,
    },
    skillCategory: { findMany: async () => SKILL_CATEGORIES.map(({ code }) => ({ code, id: `category:${code}`, isActive: true })) },
    language: { findMany: async () => LANGUAGES.map(({ code }) => ({ code, id: `language:${code}`, isActive: true })) },
    skill: { findMany: async () => [...skills.values()], upsert: upsertSkill },
    languageCertificateType: { findMany: async () => [...certificates.values()], upsert: upsertCertificate },
    stores: { provinces, skills, certificates },
  };
}

describe("guarded 2026 reference release", () => {
  it("previews exact verified scope without writes, applies once, and preserves UUIDs on replay", async () => {
    const db = fakeDb();
    const preview = await syncReferenceRelease2026(db as never, "dry-run");
    expect(preview.provinceVersion).toBe("vn-admin-2026-10-16");
    expect(preview.provinces).toEqual({ create: 34, unchanged: 0 });
    expect(preview.skills.create).toBe(67);
    expect(preview.certificates.create).toBe(30);
    expect(preview.wards).toMatch(/^BLOCKED:/);
    expect(db.province.createMany).not.toHaveBeenCalled();
    expect(db.skill.upsert).not.toHaveBeenCalled();
    expect(db.languageCertificateType.upsert).not.toHaveBeenCalled();

    await syncReferenceRelease2026(db as never, "apply");
    expect(db.stores.provinces.get("38")).toMatchObject({ name: "Tỉnh Thanh Hóa", id: "province:38" });
    expect(db.stores.skills.has("java")).toBe(true);
    const replay = await syncReferenceRelease2026(db as never, "apply");
    expect(replay.provinces).toEqual({ create: 0, unchanged: 34 });
    expect(replay.skills.unchanged).toBe(67);
    expect(replay.certificates.unchanged).toBe(30);
    expect(db.stores.provinces.get("38")?.id).toBe("province:38");
  });

  it("stops on a conflicting or inactive province before any reference write", async () => {
    for (const patch of [{ name: "Old name" }, { isActive: false }]) {
      const db = fakeDb();
      const province = ADMINISTRATIVE_2026_SNAPSHOT.provinces.find((item) => item.code === "38")!;
      db.stores.provinces.set("38", { ...province, id: "existing-id", isActive: true, ...patch });
      await expect(syncReferenceRelease2026(db as never, "apply")).rejects.toThrow(/requires history review/);
      expect(db.province.createMany).not.toHaveBeenCalled();
      expect(db.skill.upsert).not.toHaveBeenCalled();
      expect(db.languageCertificateType.upsert).not.toHaveBeenCalled();
    }
  });

  it("refuses unknown province codes instead of mixing administrative versions", async () => {
    const db = fakeDb();
    db.stores.provinces.set("999", { code: "999", name: "Unknown", divisionType: "province", isActive: true, id: "existing-id" });
    await expect(syncReferenceRelease2026(db as never, "apply")).rejects.toThrow(/outside reviewed 2026 catalog/);
    expect(db.province.createMany).not.toHaveBeenCalled();
  });

  it("does not claim or write any ward records", async () => {
    const db = fakeDb();
    const report = await syncReferenceRelease2026(db as never, "dry-run");
    expect(report.wards).toMatch(/no complete, verified 2026 ward snapshot/);
    expect("ward" in db).toBe(false);
  });

  it("checks career-catalog parents before inserting provinces", async () => {
    const db = fakeDb();
    db.skillCategory.findMany = async () => [];
    await expect(syncReferenceRelease2026(db as never, "apply")).rejects.toThrow(/missing\/inactive category/);
    expect(db.province.createMany).not.toHaveBeenCalled();
    expect(db.skill.upsert).not.toHaveBeenCalled();
  });
});
