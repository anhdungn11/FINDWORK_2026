import { REFERENCE_SNAPSHOT, type ProvinceSource } from "./reference-foundation";

export interface AdministrativeSource {
  document: string;
  url: string;
  effectiveDate?: string;
  observedAsOf?: string;
}

export interface AdministrativeProvince extends ProvinceSource {
  effectiveDate: string;
  legalSourceId: string;
  verifiedSourceId: string;
}

export interface AdministrativeSnapshot {
  version: string;
  asOf: string;
  previousProvinceSnapshot: string;
  provinceStatus: string;
  wardStatus: string;
  sources: Record<string, AdministrativeSource>;
  provinces: AdministrativeProvince[];
  wardEvidence: {
    baseSourceId: string;
    laterSourceIds: string[];
    currentRegisterSourceId: string;
    missing: string;
  };
}

export interface AdministrativeWard {
  code: string;
  name: string;
  divisionType: "ward" | "commune" | "special-zone";
  provinceCode: string;
  effectiveDate: string;
  legalSourceId: string;
}

export interface AdministrativeWardImport {
  version: string;
  asOf: string;
  provinceVersion: string;
  expectedCount: number;
  wards: AdministrativeWard[];
}

export const ADMINISTRATIVE_2026_SNAPSHOT = require("./vietnam-administrative-2026-10-16.json") as AdministrativeSnapshot;

const changedProvinces = new Map([
  ["22", { name: "Thành phố Quảng Ninh", effectiveDate: "2026-09-01", legalSourceId: "resolution-36-2026" }],
  ["24", { name: "Thành phố Bắc Ninh", effectiveDate: "2026-09-20", legalSourceId: "resolution-39-2026" }],
  ["75", { name: "Thành phố Đồng Nai", effectiveDate: "2026-04-30", legalSourceId: "resolution-30-2026" }],
]);

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function normalizedName(value: string): boolean {
  return value === value.trim() && value === value.normalize("NFC") && value.length > 0;
}

function officialUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      ["vanban.chinhphu.vn", "congbao.chinhphu.vn", "danhmuchanhchinh.nso.gov.vn"].includes(url.hostname);
  } catch {
    return false;
  }
}

function source(snapshot: AdministrativeSnapshot, id: string, asOf: string): AdministrativeSource {
  const value = snapshot.sources[id];
  if (!value || !normalizedName(value.document) || !officialUrl(value.url) ||
      (value.effectiveDate !== undefined && (!validDate(value.effectiveDate) || value.effectiveDate > asOf)) ||
      (value.observedAsOf !== undefined && (!validDate(value.observedAsOf) || value.observedAsOf !== asOf))) {
    throw new Error(`Administrative source ${id} is missing, unofficial, or outside the snapshot date`);
  }
  return value;
}

/** Validates a reviewed source-preparation artifact. This does not authorize or perform a seed. */
export function validateAdministrativeProvinceSnapshot(snapshot: AdministrativeSnapshot): void {
  if (snapshot.version !== `vn-admin-${snapshot.asOf}` || !validDate(snapshot.asOf) ||
      snapshot.asOf !== "2026-10-16" || snapshot.provinceStatus !== "verified-source-preparation" ||
      snapshot.wardStatus !== "blocked-no-complete-verified-2026-extract" ||
      snapshot.previousProvinceSnapshot !== "reference-snapshot.json#provinceBoundaryEffectiveDate=2025-07-01") {
    throw new Error("Administrative dataset version, date, or readiness status is invalid");
  }
  if (snapshot.provinces.length !== 34 || REFERENCE_SNAPSHOT.provinces.length !== 34) {
    throw new Error("Province coverage is not 34 records");
  }
  const old = new Map(REFERENCE_SNAPSHOT.provinces.map((item) => [item.code, item]));
  const codes = new Set<string>();
  const names = new Set<string>();
  for (const item of snapshot.provinces) {
    if (!/^\d{2}$/.test(item.code) || codes.has(item.code) || !old.has(item.code)) {
      throw new Error(`Invalid or duplicate province code ${item.code}`);
    }
    codes.add(item.code);
    if (!normalizedName(item.name) || names.has(item.name.toLocaleLowerCase("vi"))) {
      throw new Error(`Invalid, duplicate, or non-NFC province name ${item.code}`);
    }
    names.add(item.name.toLocaleLowerCase("vi"));
    if (!((item.divisionType === "province" && item.name.startsWith("Tỉnh ")) ||
          (item.divisionType === "centrally-governed-city" && item.name.startsWith("Thành phố ")))) {
      throw new Error(`Province unit type does not match official name ${item.code}`);
    }
    if (!validDate(item.effectiveDate) || item.effectiveDate > snapshot.asOf) {
      throw new Error(`Invalid province effective date ${item.code}`);
    }
    const legal = source(snapshot, item.legalSourceId, snapshot.asOf);
    const register = source(snapshot, item.verifiedSourceId, snapshot.asOf);
    if (legal.effectiveDate !== item.effectiveDate || register.observedAsOf !== snapshot.asOf ||
        item.verifiedSourceId !== "nso-current") {
      throw new Error(`Province source/date mismatch ${item.code}`);
    }
    const change = changedProvinces.get(item.code);
    const baseline = old.get(item.code)!;
    const expected = change
      ? { ...change, divisionType: "centrally-governed-city" }
      : { name: baseline.name, divisionType: baseline.divisionType, effectiveDate: "2025-07-01", legalSourceId: "decision-19-2025" };
    if (item.name !== expected.name || item.divisionType !== expected.divisionType ||
        item.effectiveDate !== expected.effectiveDate || item.legalSourceId !== expected.legalSourceId) {
      throw new Error(`Province ${item.code} differs from reviewed official transition`);
    }
  }
  if (snapshot.wardEvidence.baseSourceId !== "decision-19-2025" ||
      snapshot.wardEvidence.currentRegisterSourceId !== "nso-current" ||
      snapshot.wardEvidence.laterSourceIds.length !== 2 ||
      !snapshot.wardEvidence.laterSourceIds.includes("resolution-237-2026") ||
      !snapshot.wardEvidence.laterSourceIds.includes("resolution-388-2026") ||
      !normalizedName(snapshot.wardEvidence.missing)) {
    throw new Error("Ward blocker evidence is incomplete");
  }
  for (const id of [snapshot.wardEvidence.baseSourceId, snapshot.wardEvidence.currentRegisterSourceId,
    ...snapshot.wardEvidence.laterSourceIds]) source(snapshot, id, snapshot.asOf);
}

/** Structural gate for a separately sourced complete ward catalog; no catalog is bundled yet. */
export function validateAdministrativeWardImport(
  input: AdministrativeWardImport,
  provinces: AdministrativeSnapshot = ADMINISTRATIVE_2026_SNAPSHOT,
): void {
  validateAdministrativeProvinceSnapshot(provinces);
  if (input.version !== `vn-admin-wards-${input.asOf}` || !validDate(input.asOf) ||
      input.asOf !== provinces.asOf || input.provinceVersion !== provinces.version ||
      !Number.isInteger(input.expectedCount) || input.expectedCount <= 0 ||
      input.wards.length !== input.expectedCount) {
    throw new Error("Ward coverage or administrative version is incomplete or mixed");
  }
  const provinceCodes = new Set(provinces.provinces.map((item) => item.code));
  const codes = new Set<string>();
  const names = new Set<string>();
  const prefixes = { ward: "Phường ", commune: "Xã ", "special-zone": "Đặc khu " };
  for (const item of input.wards) {
    if (!/^\d{5}$/.test(item.code) || codes.has(item.code)) {
      throw new Error(`Invalid or duplicate ward code ${item.code}`);
    }
    codes.add(item.code);
    if (!provinceCodes.has(item.provinceCode)) throw new Error(`Unknown parent province ${item.provinceCode}`);
    if (!Object.hasOwn(prefixes, item.divisionType) || !normalizedName(item.name) ||
        !item.name.startsWith(prefixes[item.divisionType])) {
      throw new Error(`Invalid, non-NFC, or inconsistent ward name/type ${item.code}`);
    }
    const scopedName = `${item.provinceCode}:${item.name.toLocaleLowerCase("vi")}`;
    if (names.has(scopedName)) throw new Error(`Duplicate ward name within province ${item.code}`);
    names.add(scopedName);
    const legal = source(provinces, item.legalSourceId, input.asOf);
    if (!validDate(item.effectiveDate) || item.effectiveDate > input.asOf || legal.effectiveDate !== item.effectiveDate) {
      throw new Error(`Ward legal source/date mismatch ${item.code}`);
    }
  }
}

if (require.main === module) {
  validateAdministrativeProvinceSnapshot(ADMINISTRATIVE_2026_SNAPSHOT);
  process.stdout.write("Province source-preparation snapshot valid: 34/34; ward catalog BLOCKED; no database access.\n");
}
