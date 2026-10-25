import type {
  WardOption,
} from "@/data/reference/locations/location.types";
import { publicApi } from "@/services/api/publicApi";

/**
 * Official Location Reference Service.
 * Connects directly to FINDWORK Backend (/reference/wards) with in-memory caching.
 * Matches official 3,321 ward catalog (Decision 19/2025/QD-TTg).
 */
const wardCache = new Map<string, WardOption[]>();

const normalizeProvinceCode = (code: string | number) => {
  return String(code).padStart(2, "0");
};

const normalizeWardCode = (code: string | number) => {
  return String(code).padStart(5, "0");
};

export const getWardsByProvinceCode = async (
  provinceCode: string,
  signal?: AbortSignal,
): Promise<WardOption[]> => {
  if (!provinceCode) {
    return [];
  }

  const normalizedProvinceCode = normalizeProvinceCode(provinceCode);

  const cached = wardCache.get(normalizedProvinceCode);
  if (cached) {
    return cached;
  }

  try {
    const dtos = await publicApi.listWards(normalizedProvinceCode, signal);
    const wards: WardOption[] = dtos.map((w) => ({
      code: normalizeWardCode(w.code),
      provinceCode: normalizeProvinceCode(w.provinceCode),
      name: w.name,
      divisionType: w.divisionType,
      codename: w.codename,
    }));

    wardCache.set(normalizedProvinceCode, wards);
    return wards;
  } catch {
    return [];
  }
};
