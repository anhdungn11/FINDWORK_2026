import type { ProvinceOption, WardOption } from "../../../data/reference/locations/location.types";

export interface LocationValue {
  provinceCode: string;
  provinceName: string;
  wardCode?: string;
  wardName?: string;
  addressLine?: string;
  formattedAddress: string;
}

export interface LocationMergerAlias {
  alias: string;
  officialProvinceCode: string;
  officialProvinceName: string;
  note?: string;
}

export interface LocationSelectProps {
  id?: string;
  label?: string;
  value?: Partial<LocationValue>;
  onChange: (value: LocationValue) => void;
  required?: boolean;
  disabled?: boolean;
  includeWard?: boolean;
  includeAddressLine?: boolean;
  error?: string;
  placeholder?: string;
}
