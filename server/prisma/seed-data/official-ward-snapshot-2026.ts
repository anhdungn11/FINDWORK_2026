import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ADMINISTRATIVE_2026_SNAPSHOT, validateAdministrativeWardImport,
  type AdministrativeWardImport,
} from "./vietnam-administrative-2026";

export interface OfficialWardSnapshot extends AdministrativeWardImport {
  source: {
    authority: string; endpoint: string; operation: string;
    currentDateParameter: string; baselineDateParameter: string;
    currentXmlSha256: string; baselineXmlSha256: string;
    currentXmlBytes: number; baselineXmlBytes: number;
    registerUrl: string; countsUrl: string;
  };
  sources: Record<string, { url: string; effectiveDate: string }>;
  countsByProvince: Record<string, number>;
  changesSinceBaseline: { changed: number; dongNai: number; bacNinh: number; added: number; removed: number };
  sourceNameNormalizationCodes: string[];
}

export const OFFICIAL_WARD_SNAPSHOT_PATH = resolve(__dirname, "vietnam-wards-2026-10-24.json");
export const OFFICIAL_WARD_SNAPSHOT_SHA256 = "5c1f716a3ae1ab854a9d642e1bf82293999f7e66c8bb067edc6663b12ba18f2d";

// The Statistics Office 2026 PX counts, recorded per province from Tinh_tk_new.aspx.
export const OFFICIAL_2026_WARD_COUNTS: Readonly<Record<string, number>> = {
  "01": 126, "04": 56, "08": 124, "11": 45, "12": 38, "14": 75, "15": 99, "19": 92, "20": 65,
  "22": 54, "24": 99, "25": 148, "31": 114, "33": 104, "37": 129, "38": 166, "40": 130, "42": 69,
  "44": 78, "46": 40, "48": 94, "51": 96, "52": 135, "56": 65, "66": 102, "68": 124, "75": 95,
  "79": 168, "80": 96, "82": 102, "86": 124, "91": 102, "92": 103, "96": 64,
};

const DONG_NAI_CODES = ["25270", "25357", "25363", "26116", "26170", "26248", "26326", "26368", "26425", "26485"];
const BAC_NINH_CODES = ["07294", "07375", "07399", "07444", "07840", "09193", "09292", "09313", "09319", "09454", "09475", "09496"];

export function loadOfficialWardSnapshot(): OfficialWardSnapshot {
  const bytes = readFileSync(OFFICIAL_WARD_SNAPSHOT_PATH);
  // Git on Windows may check out CRLF; checksum the canonical UTF-8/LF artifact.
  const contents = bytes.toString("utf8").replace(/\r\n/g, "\n");
  const hash = createHash("sha256").update(contents, "utf8").digest("hex");
  if (hash !== OFFICIAL_WARD_SNAPSHOT_SHA256) throw new Error("Official ward artifact SHA-256 mismatch");
  return JSON.parse(contents) as OfficialWardSnapshot;
}

export function validateOfficialWardSnapshot(snapshot: OfficialWardSnapshot) {
  validateAdministrativeWardImport(snapshot, ADMINISTRATIVE_2026_SNAPSHOT);
  if (snapshot.version !== "vn-admin-wards-2026-10-24" || snapshot.asOf !== "2026-10-24" ||
      snapshot.expectedCount !== 3321 || snapshot.provinceVersion !== ADMINISTRATIVE_2026_SNAPSHOT.version) {
    throw new Error("Official ward snapshot version or count mismatch");
  }
  if (snapshot.source.authority !== "Cục Thống kê" ||
      snapshot.source.endpoint !== "https://danhmuchanhchinh.nso.gov.vn/DMDVHC.asmx" ||
      snapshot.source.operation !== "DanhMucPhuongXa" ||
      snapshot.source.currentDateParameter !== "24/10/2026" ||
      snapshot.source.baselineDateParameter !== "01/07/2025" ||
      !/^[a-f0-9]{64}$/.test(snapshot.source.currentXmlSha256) ||
      !/^[a-f0-9]{64}$/.test(snapshot.source.baselineXmlSha256) ||
      snapshot.source.currentXmlBytes < 100_000 || snapshot.source.baselineXmlBytes < 100_000) {
    throw new Error("Official ward SOAP provenance is incomplete");
  }
  const expectedSources = {
    "decision-19-2025": ["https://vanban.chinhphu.vn/?classid=1&docid=214409&pageid=27160", "2025-07-01"],
    "resolution-237-2026": ["https://vanban.chinhphu.vn/?classid=2&docid=217876&pageid=27160", "2026-04-30"],
    "resolution-388-2026": ["https://congbao.chinhphu.vn/van-ban/nghi-quyet-so-388-nq-ubtvqh16-470313/67975.htm", "2026-09-20"],
  };
  for (const [id, [url, date]] of Object.entries(expectedSources)) {
    if (snapshot.sources[id]?.url !== url || snapshot.sources[id]?.effectiveDate !== date) {
      throw new Error(`Official ward legal source mismatch: ${id}`);
    }
  }
  const counts: Record<string, number> = {};
  const types: Record<string, number> = {};
  const transitions = { "resolution-237-2026": [] as string[], "resolution-388-2026": [] as string[] };
  let previousCode = "";
  for (const ward of snapshot.wards) {
    if (ward.code <= previousCode) throw new Error("Official ward rows are not sorted by unique code");
    previousCode = ward.code;
    counts[ward.provinceCode] = (counts[ward.provinceCode] ?? 0) + 1;
    types[ward.divisionType] = (types[ward.divisionType] ?? 0) + 1;
    if (ward.legalSourceId === "resolution-237-2026" || ward.legalSourceId === "resolution-388-2026") {
      transitions[ward.legalSourceId].push(ward.code);
    }
  }
  if (Object.keys(counts).length !== 34 || Object.keys(snapshot.countsByProvince).length !== 34) {
    throw new Error("Official ward province coverage is incomplete");
  }
  for (const [code, count] of Object.entries(OFFICIAL_2026_WARD_COUNTS)) {
    if (counts[code] !== count || snapshot.countsByProvince[code] !== count) {
      throw new Error(`Official ward 2026 count mismatch for province ${code}`);
    }
  }
  if (types.ward !== 709 || types.commune !== 2599 || types["special-zone"] !== 13 ||
      transitions["resolution-237-2026"].join(",") !== DONG_NAI_CODES.join(",") ||
      transitions["resolution-388-2026"].join(",") !== BAC_NINH_CODES.join(",") ||
      JSON.stringify(snapshot.changesSinceBaseline) !== JSON.stringify({ changed: 22, dongNai: 10, bacNinh: 12, added: 0, removed: 0 })) {
    throw new Error("Official ward unit types or 2026 legal transitions mismatch");
  }
  const normalizations = snapshot.sourceNameNormalizationCodes;
  if (normalizations.length !== 39 || new Set(normalizations).size !== normalizations.length ||
      normalizations.some((code) => !snapshot.wards.some((ward) => ward.code === code))) {
    throw new Error("Source name normalization audit is incomplete");
  }
  return { provinces: 34, wards: snapshot.wards.length, types, changes2026: 22, normalizedSourceNames: normalizations.length };
}
