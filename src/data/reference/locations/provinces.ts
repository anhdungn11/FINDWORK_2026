import type {
  ProvinceOption,
} from "./location.types";

/**
 * Official province-level codes effective from 01/07/2025.
 * Source of truth: Decision 19/2025/QD-TTg.
 */
export const VIETNAM_PROVINCES: ProvinceOption[] = [
  { code: "01", name: "Thành phố Hà Nội", divisionType: "centrally-governed-city" },
  { code: "04", name: "Tỉnh Cao Bằng", divisionType: "province" },
  { code: "08", name: "Tỉnh Tuyên Quang", divisionType: "province" },
  { code: "11", name: "Tỉnh Điện Biên", divisionType: "province" },
  { code: "12", name: "Tỉnh Lai Châu", divisionType: "province" },
  { code: "14", name: "Tỉnh Sơn La", divisionType: "province" },
  { code: "15", name: "Tỉnh Lào Cai", divisionType: "province" },
  { code: "19", name: "Tỉnh Thái Nguyên", divisionType: "province" },
  { code: "20", name: "Tỉnh Lạng Sơn", divisionType: "province" },
  { code: "22", name: "Tỉnh Quảng Ninh", divisionType: "province" },
  { code: "24", name: "Tỉnh Bắc Ninh", divisionType: "province" },
  { code: "25", name: "Tỉnh Phú Thọ", divisionType: "province" },
  { code: "31", name: "Thành phố Hải Phòng", divisionType: "centrally-governed-city" },
  { code: "33", name: "Tỉnh Hưng Yên", divisionType: "province" },
  { code: "37", name: "Tỉnh Ninh Bình", divisionType: "province" },
  { code: "38", name: "Tỉnh Thanh Hóa", divisionType: "province" },
  { code: "40", name: "Tỉnh Nghệ An", divisionType: "province" },
  { code: "42", name: "Tỉnh Hà Tĩnh", divisionType: "province" },
  { code: "44", name: "Tỉnh Quảng Trị", divisionType: "province" },
  { code: "46", name: "Thành phố Huế", divisionType: "centrally-governed-city" },
  { code: "48", name: "Thành phố Đà Nẵng", divisionType: "centrally-governed-city" },
  { code: "51", name: "Tỉnh Quảng Ngãi", divisionType: "province" },
  { code: "52", name: "Tỉnh Gia Lai", divisionType: "province" },
  { code: "56", name: "Tỉnh Khánh Hòa", divisionType: "province" },
  { code: "66", name: "Tỉnh Đắk Lắk", divisionType: "province" },
  { code: "68", name: "Tỉnh Lâm Đồng", divisionType: "province" },
  { code: "75", name: "Tỉnh Đồng Nai", divisionType: "province" },
  { code: "79", name: "Thành phố Hồ Chí Minh", divisionType: "centrally-governed-city" },
  { code: "80", name: "Tỉnh Tây Ninh", divisionType: "province" },
  { code: "82", name: "Tỉnh Đồng Tháp", divisionType: "province" },
  { code: "86", name: "Tỉnh Vĩnh Long", divisionType: "province" },
  { code: "91", name: "Tỉnh An Giang", divisionType: "province" },
  { code: "92", name: "Thành phố Cần Thơ", divisionType: "centrally-governed-city" },
  { code: "96", name: "Tỉnh Cà Mau", divisionType: "province" },
];

export const getProvinceByCode = (
  code: string,
) => {
  return VIETNAM_PROVINCES.find(
    (province) =>
      province.code === code,
  );
};
