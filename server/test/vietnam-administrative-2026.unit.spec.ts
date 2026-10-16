import { REFERENCE_SNAPSHOT } from "../prisma/seed-data/reference-foundation";
import {
  ADMINISTRATIVE_2026_SNAPSHOT,
  validateAdministrativeProvinceSnapshot,
  validateAdministrativeWardImport,
  type AdministrativeSnapshot,
  type AdministrativeWardImport,
} from "../prisma/seed-data/vietnam-administrative-2026";

const copy = (): AdministrativeSnapshot => structuredClone(ADMINISTRATIVE_2026_SNAPSHOT);

// Synthetic structure fixture only. This is not an official ward catalog.
const syntheticWards = (): AdministrativeWardImport => ({
  version: "vn-admin-wards-2026-10-16",
  asOf: "2026-10-16",
  provinceVersion: ADMINISTRATIVE_2026_SNAPSHOT.version,
  expectedCount: 2,
  wards: [
    { code: "00001", name: "Phường Mẫu Một", divisionType: "ward", provinceCode: "01", effectiveDate: "2025-07-01", legalSourceId: "decision-19-2025" },
    { code: "00002", name: "Xã Mẫu Hai", divisionType: "commune", provinceCode: "04", effectiveDate: "2025-07-01", legalSourceId: "decision-19-2025" },
  ],
});

describe("Vietnam administrative source-preparation 2026-10-16", () => {
  it("validates all 34 official province codes, names, types, dates and source references", () => {
    expect(() => validateAdministrativeProvinceSnapshot(ADMINISTRATIVE_2026_SNAPSHOT)).not.toThrow();
    expect(ADMINISTRATIVE_2026_SNAPSHOT.provinces).toHaveLength(34);
    expect(ADMINISTRATIVE_2026_SNAPSHOT.provinces.filter((item) => item.divisionType === "centrally-governed-city")).toHaveLength(9);
    expect(ADMINISTRATIVE_2026_SNAPSHOT.provinces.map((item) => item.code).sort())
      .toEqual(REFERENCE_SNAPSHOT.provinces.map((item) => item.code).sort());
    expect(ADMINISTRATIVE_2026_SNAPSHOT.provinces.filter((item) => item.effectiveDate > "2025-07-01")
      .map(({ code, name, effectiveDate }) => ({ code, name, effectiveDate }))).toEqual([
        { code: "22", name: "Thành phố Quảng Ninh", effectiveDate: "2026-09-01" },
        { code: "24", name: "Thành phố Bắc Ninh", effectiveDate: "2026-09-20" },
        { code: "75", name: "Thành phố Đồng Nai", effectiveDate: "2026-04-30" },
      ]);
    expect(ADMINISTRATIVE_2026_SNAPSHOT.wardStatus).toMatch(/^blocked-/);
    expect(REFERENCE_SNAPSHOT.provinceBoundaryEffectiveDate).toBe("2025-07-01");
  });

  it("rejects duplicate codes, non-NFC names, wrong unit types and unreviewed changes", () => {
    const duplicate = copy();
    duplicate.provinces[1]!.code = duplicate.provinces[0]!.code;
    expect(() => validateAdministrativeProvinceSnapshot(duplicate)).toThrow(/duplicate province code/);

    const unicode = copy();
    unicode.provinces[0]!.name = "Thành phố Hà Nội";
    expect(() => validateAdministrativeProvinceSnapshot(unicode)).toThrow(/non-NFC/);

    const type = copy();
    type.provinces.find((item) => item.code === "75")!.divisionType = "province";
    expect(() => validateAdministrativeProvinceSnapshot(type)).toThrow(/unit type/);

    const unreviewed = copy();
    unreviewed.provinces.find((item) => item.code === "04")!.name = "Tỉnh Mẫu";
    expect(() => validateAdministrativeProvinceSnapshot(unreviewed)).toThrow(/reviewed official transition/);
  });

  it("rejects mismatched effective dates, missing provenance and false readiness", () => {
    const date = copy();
    date.provinces.find((item) => item.code === "22")!.effectiveDate = "2026-09-31";
    expect(() => validateAdministrativeProvinceSnapshot(date)).toThrow(/effective date/);

    const source = copy();
    source.provinces[0]!.verifiedSourceId = "third-party";
    expect(() => validateAdministrativeProvinceSnapshot(source)).toThrow(/source/);

    const ready = copy();
    ready.wardStatus = "ready";
    expect(() => validateAdministrativeProvinceSnapshot(ready)).toThrow(/readiness status/);
  });

  it("requires a complete ward import tied to the exact province version", () => {
    expect(() => validateAdministrativeWardImport(syntheticWards())).not.toThrow();
    const absent = syntheticWards();
    absent.wards = [];
    expect(() => validateAdministrativeWardImport(absent)).toThrow(/coverage/);
    const mixed = syntheticWards();
    mixed.provinceVersion = "vn-admin-2025-07-01";
    expect(() => validateAdministrativeWardImport(mixed)).toThrow(/mixed/);
  });

  it("rejects duplicate ward codes, unknown parent, Unicode drift and source/date mismatch", () => {
    const duplicate = syntheticWards();
    duplicate.wards[1]!.code = duplicate.wards[0]!.code;
    expect(() => validateAdministrativeWardImport(duplicate)).toThrow(/duplicate ward code/);
    const parent = syntheticWards();
    parent.wards[1]!.provinceCode = "99";
    expect(() => validateAdministrativeWardImport(parent)).toThrow(/Unknown parent/);
    const unicode = syntheticWards();
    unicode.wards[0]!.name = "Phường Mẫu Một";
    expect(() => validateAdministrativeWardImport(unicode)).toThrow(/non-NFC/);
    const date = syntheticWards();
    date.wards[0]!.effectiveDate = "2026-01-01";
    expect(() => validateAdministrativeWardImport(date)).toThrow(/source\/date mismatch/);
  });
});
