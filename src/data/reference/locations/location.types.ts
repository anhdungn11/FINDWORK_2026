export type AdministrativeUnitLevel =
  | "province"
  | "ward";

export interface ProvinceOption {
  /**
   * Official 2-digit administrative code.
   * Keep as string so leading zeroes are never lost.
   */
  code: string;

  name: string;

  divisionType:
    | "province"
    | "centrally-governed-city";
}

export interface WardOption {
  /**
   * Official 5-digit administrative code.
   * Keep as string so leading zeroes are never lost.
   */
  code: string;

  provinceCode: string;

  name: string;

  /**
   * Upstream currently returns values such as:
   * "phường", "xã", "đặc khu".
   */
  divisionType: string;

  codename: string;
}
