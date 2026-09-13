import type {
  WardOption,
} from "@/data/reference/locations/location.types";

/**
 * TEMPORARY FRONTEND REFERENCE SOURCE.
 *
 * This adapter isolates React from the external provider.
 * When FINDWORK backend is ready, replace only this service layer
 * with calls to FINDWORK's own reference endpoints.
 */
const LOCATION_REFERENCE_BASE_URL =
  "https://provinces.open-api.vn/api/v2";

interface ProvinceOpenApiWard {
  name: string;
  code: number;
  division_type: string;
  codename: string;
  province_code: number;
}

const wardCache =
  new Map<string, WardOption[]>();

const normalizeProvinceCode = (
  code: string | number,
) => {
  return String(code).padStart(2, "0");
};

const normalizeWardCode = (
  code: string | number,
) => {
  return String(code).padStart(5, "0");
};

const toWardOption = (
  ward: ProvinceOpenApiWard,
): WardOption => {
  return {
    code: normalizeWardCode(ward.code),
    provinceCode:
      normalizeProvinceCode(
        ward.province_code,
      ),
    name: ward.name,
    divisionType: ward.division_type,
    codename: ward.codename,
  };
};

export const getWardsByProvinceCode =
  async (
    provinceCode: string,
    signal?: AbortSignal,
  ): Promise<WardOption[]> => {
    if (!provinceCode) {
      return [];
    }

    const normalizedProvinceCode =
      normalizeProvinceCode(
        provinceCode,
      );

    const cached =
      wardCache.get(
        normalizedProvinceCode,
      );

    if (cached) {
      return cached;
    }

    const provinceNumber =
      Number(normalizedProvinceCode);

    if (
      !Number.isInteger(provinceNumber) ||
      provinceNumber <= 0
    ) {
      return [];
    }

    const query =
      new URLSearchParams({
        province:
          String(provinceNumber),
      });

    const response = await fetch(
      `${LOCATION_REFERENCE_BASE_URL}/w/?${query.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Cannot load wards (${response.status})`,
      );
    }

    const payload =
      (await response.json()) as
        ProvinceOpenApiWard[];

    const wards = payload
      .map(toWardOption)
      .filter(
        (ward) =>
          ward.provinceCode ===
          normalizedProvinceCode,
      );

    wardCache.set(
      normalizedProvinceCode,
      wards,
    );

    return wards;
  };
