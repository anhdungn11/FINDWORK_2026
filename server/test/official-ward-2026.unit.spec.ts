import { ADMINISTRATIVE_2026_SNAPSHOT } from "../prisma/seed-data/vietnam-administrative-2026";
import {
  loadOfficialWardSnapshot, validateOfficialWardSnapshot,
  type OfficialWardSnapshot,
} from "../prisma/seed-data/official-ward-snapshot-2026";
import { planOfficialWardImport, wardCodename, type ProvinceRow, type WardRow } from "../prisma/seed-data/official-ward-import-plan";

const snapshot = loadOfficialWardSnapshot();
const copy = (): OfficialWardSnapshot => structuredClone(snapshot);
const provinces: ProvinceRow[] = ADMINISTRATIVE_2026_SNAPSHOT.provinces.map((row) => ({
  id: `00000000-0000-4000-8000-${row.code.padStart(12, "0")}`,
  code: row.code, name: row.name, isActive: true,
}));

describe("official ward snapshot and guarded import plan", () => {
  it("validates source checksum, 3,321 official codes, 34 parents, unit types and 2026 changes", () => {
    expect(validateOfficialWardSnapshot(snapshot)).toEqual({
      provinces: 34, wards: 3321, types: { ward: 709, commune: 2599, "special-zone": 13 },
      changes2026: 22, normalizedSourceNames: 39,
    });
    expect(snapshot.wards.find((row) => row.code === "25270")).toMatchObject({
      name: "Phường Lộc Ninh", provinceCode: "75", effectiveDate: "2026-04-30", legalSourceId: "resolution-237-2026",
    });
    expect(snapshot.wards.find((row) => row.code === "07294")).toMatchObject({
      name: "Phường Bố Hạ", provinceCode: "24", effectiveDate: "2026-09-20", legalSourceId: "resolution-388-2026",
    });
  });

  it("rejects duplicate codes, wrong parent, missing coverage and inaccurate legal transitions", () => {
    const duplicate = copy();
    duplicate.wards[1]!.code = duplicate.wards[0]!.code;
    expect(() => validateOfficialWardSnapshot(duplicate)).toThrow(/duplicate ward code/);
    const parent = copy();
    parent.wards[0]!.provinceCode = "99";
    expect(() => validateOfficialWardSnapshot(parent)).toThrow(/Unknown parent/);
    const incomplete = copy();
    incomplete.wards.pop();
    expect(() => validateOfficialWardSnapshot(incomplete)).toThrow(/coverage/);
    const transition = copy();
    transition.wards.find((row) => row.code === "25270")!.legalSourceId = "decision-19-2025";
    expect(() => validateOfficialWardSnapshot(transition)).toThrow(/source\/date mismatch/);
  });

  it("previews inserts, preserves matching UUIDs and blocks incompatible existing rows", () => {
    const initial = planOfficialWardImport(snapshot, provinces, []);
    expect(initial).toMatchObject({ databaseProvinces: 34, databaseWards: 0, insertCount: 3321,
      unchanged: 0, missingParents: [], provinceMismatches: [], duplicateCodes: 0, invalidRows: 0,
      existingRowsRequiringChanges: [], extraExistingCodes: [] });
    const first = snapshot.wards[0]!;
    const province = provinces.find((row) => row.code === first.provinceCode)!;
    const matching: WardRow = { id: "00000000-0000-4000-8000-000000000001", code: first.code,
      provinceId: province.id, name: first.name, divisionType: first.divisionType,
      codename: wardCodename(first.name, first.code), isActive: true };
    const repeat = planOfficialWardImport(snapshot, provinces, [matching]);
    expect(repeat.insertCount).toBe(3320);
    expect(repeat.unchanged).toBe(1);
    expect(repeat.existingRowsRequiringChanges).toEqual([]);
    const changed = planOfficialWardImport(snapshot, provinces, [{ ...matching, name: "Legacy label" }]);
    expect(changed.existingRowsRequiringChanges).toEqual([{ code: first.code, fields: ["name"] }]);
    const missingParent = planOfficialWardImport(snapshot, provinces.filter((row) => row.code !== "01"), []);
    expect(missingParent.missingParents).toEqual(["01"]);
  });
});
