import type { OfficialWardSnapshot } from "./official-ward-snapshot-2026";
import { validateOfficialWardSnapshot } from "./official-ward-snapshot-2026";
import { ADMINISTRATIVE_2026_SNAPSHOT } from "./vietnam-administrative-2026";

export type ProvinceRow = { id: string; code: string; name: string; isActive: boolean };
export type WardRow = { id: string; code: string; provinceId: string; name: string;
  divisionType: string; codename: string; isActive: boolean };

export function wardCodename(name: string, code: string): string {
  const stem = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${stem}-${code}`;
}

export function planOfficialWardImport(snapshot: OfficialWardSnapshot, provinces: ProvinceRow[], wards: WardRow[]) {
  const validated = validateOfficialWardSnapshot(snapshot);
  const provinceByCode = new Map(provinces.map((row) => [row.code, row]));
  const officialProvinceByCode = new Map(ADMINISTRATIVE_2026_SNAPSHOT.provinces.map((row) => [row.code, row]));
  const existingByCode = new Map(wards.map((row) => [row.code, row]));
  const snapshotCodes = new Set(snapshot.wards.map((row) => row.code));
  const missingParents: string[] = [];
  const provinceMismatches: string[] = [];
  const existingRowsRequiringChanges: Array<{ code: string; fields: string[] }> = [];
  const inserts: Array<{ code: string; provinceId: string; name: string; divisionType: string;
    codename: string; isActive: true }> = [];
  let unchanged = 0;

  for (const expected of snapshot.wards) {
    const province = provinceByCode.get(expected.provinceCode);
    if (!province || !province.isActive) { missingParents.push(expected.provinceCode); continue; }
    // A renamed or inactive parent needs a separate review before any child insert.
    if (province.name !== officialProvinceByCode.get(expected.provinceCode)?.name) {
      provinceMismatches.push(expected.provinceCode); continue;
    }
    const codename = wardCodename(expected.name, expected.code);
    if (codename.length > 180) throw new Error(`Derived ward codename exceeds schema limit: ${expected.code}`);
    const existing = existingByCode.get(expected.code);
    if (!existing) {
      inserts.push({ code: expected.code, provinceId: province.id, name: expected.name,
        divisionType: expected.divisionType, codename, isActive: true });
      continue;
    }
    const fields = [
      existing.provinceId !== province.id && "provinceId", existing.name !== expected.name && "name",
      existing.divisionType !== expected.divisionType && "divisionType", existing.codename !== codename && "codename",
      !existing.isActive && "isActive",
    ].filter((field): field is string => typeof field === "string");
    if (fields.length) existingRowsRequiringChanges.push({ code: expected.code, fields });
    else unchanged++;
  }
  const extraExistingCodes = wards.filter((row) => !snapshotCodes.has(row.code)).map((row) => row.code).sort();
  return { ...validated, databaseProvinces: provinces.length, databaseWards: wards.length,
    missingParents: [...new Set(missingParents)].sort(), provinceMismatches: [...new Set(provinceMismatches)].sort(),
    duplicateCodes: 0, invalidRows: 0, inserts, insertCount: inserts.length, unchanged,
    existingRowsRequiringChanges, extraExistingCodes };
}
