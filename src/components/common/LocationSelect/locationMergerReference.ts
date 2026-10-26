/**
 * FINDWORK — VIETNAM ADMINISTRATIVE MERGER & ALIAS REFERENCE
 *
 * Vị trí: src/components/common/LocationSelect/locationMergerReference.ts
 * Nguồn tham chiếu: Quyết định 19/2025/QĐ-TTg về 34 đơn vị hành chính cấp tỉnh
 *
 * Mục đích:
 * Hỗ trợ người tìm việc và nhà tuyển dụng tra cứu đơn vị hành chính theo cả tên hiện hành
 * và các địa danh cũ / địa danh sáp nhập lịch sử (ví dụ: Hà Tây, Bắc Giang, Hà Nam, v.v.)
 * mà không sửa đổi cơ sở dữ liệu hay bịa đặt tên đơn vị hành chính.
 */

import { VIETNAM_PROVINCES } from "../../../data/reference/locations/provinces";
import type { LocationMergerAlias } from "./types";

export const HISTORICAL_PROVINCE_MERGERS: LocationMergerAlias[] = [
  { alias: "Hà Tây", officialProvinceCode: "01", officialProvinceName: "Thành phố Hà Nội", note: "Sáp nhập vào Hà Nội từ 2008" },
  { alias: "Hà Sơn Bình", officialProvinceCode: "01", officialProvinceName: "Thành phố Hà Nội", note: "Địa danh cũ thời kỳ 1975-1991" },
  { alias: "Bắc Giang", officialProvinceCode: "24", officialProvinceName: "Tỉnh Bắc Ninh", note: "Khu vực Bắc Ninh - Bắc Giang (Hà Bắc cũ)" },
  { alias: "Hà Bắc", officialProvinceCode: "24", officialProvinceName: "Tỉnh Bắc Ninh", note: "Địa danh cũ Bắc Ninh - Bắc Giang" },
  { alias: "Hà Nam", officialProvinceCode: "37", officialProvinceName: "Tỉnh Ninh Bình", note: "Khu vực đồng bằng sông Hồng sáp nhập" },
  { alias: "Nam Định", officialProvinceCode: "37", officialProvinceName: "Tỉnh Ninh Bình", note: "Khu vực Nam Định sáp nhập cụm Ninh Bình" },
  { alias: "Hà Nam Ninh", officialProvinceCode: "37", officialProvinceName: "Tỉnh Ninh Bình", note: "Tỉnh cũ thời kỳ 1975-1991" },
  { alias: "Hải Hưng", officialProvinceCode: "33", officialProvinceName: "Tỉnh Hưng Yên", note: "Tỉnh cũ Hải Dương - Hưng Yên" },
  { alias: "Hải Dương", officialProvinceCode: "33", officialProvinceName: "Tỉnh Hưng Yên", note: "Khu vực Hải Hưng cũ" },
  { alias: "Vĩnh Phú", officialProvinceCode: "25", officialProvinceName: "Tỉnh Phú Thọ", note: "Tỉnh cũ Vĩnh Phúc - Phú Thọ" },
  { alias: "Vĩnh Phúc", officialProvinceCode: "25", officialProvinceName: "Tỉnh Phú Thọ", note: "Khu vực Vĩnh Phú cũ" },
  { alias: "Bắc Thái", officialProvinceCode: "19", officialProvinceName: "Tỉnh Thái Nguyên", note: "Tỉnh cũ Bắc Kạn - Thái Nguyên" },
  { alias: "Bắc Kạn", officialProvinceCode: "19", officialProvinceName: "Tỉnh Thái Nguyên", note: "Khu vực Bắc Thái cũ" },
  { alias: "Hà Giang", officialProvinceCode: "08", officialProvinceName: "Tỉnh Tuyên Quang", note: "Khu vực Hà Tuyên cũ" },
  { alias: "Hà Tuyên", officialProvinceCode: "08", officialProvinceName: "Tỉnh Tuyên Quang", note: "Tỉnh cũ Hà Giang - Tuyên Quang" },
  { alias: "Hoàng Liên Sơn", officialProvinceCode: "15", officialProvinceName: "Tỉnh Lào Cai", note: "Tỉnh cũ Yên Bái - Lào Cai" },
  { alias: "Yên Bái", officialProvinceCode: "15", officialProvinceName: "Tỉnh Lào Cai", note: "Khu vực Hoàng Liên Sơn cũ" },
  { alias: "Quảng Bình", officialProvinceCode: "44", officialProvinceName: "Tỉnh Quảng Trị", note: "Khu vực Bình Trị Thiên cũ" },
  { alias: "Bình Trị Thiên", officialProvinceCode: "44", officialProvinceName: "Tỉnh Quảng Trị", note: "Tỉnh cũ Quảng Bình - Quảng Trị - Thừa Thiên" },
  { alias: "Thừa Thiên Huế", officialProvinceCode: "46", officialProvinceName: "Thành phố Huế", note: "Trở thành TP Huế trực thuộc TW" },
  { alias: "Quảng Nam", officialProvinceCode: "48", officialProvinceName: "Thành phố Đà Nẵng", note: "Khu vực Quảng Nam - Đà Nẵng cũ" },
  { alias: "Bình Định", officialProvinceCode: "51", officialProvinceName: "Tỉnh Quảng Ngãi", note: "Khu vực Nghĩa Bình cũ" },
  { alias: "Kon Tum", officialProvinceCode: "52", officialProvinceName: "Tỉnh Gia Lai", note: "Khu vực Gia Lai - Kon Tum cũ" },
  { alias: "Đắk Nông", officialProvinceCode: "66", officialProvinceName: "Tỉnh Đắk Lắk", note: "Khu vực Đắk Lắk cũ" },
  { alias: "Bình Thuận", officialProvinceCode: "56", officialProvinceName: "Tỉnh Khánh Hòa", note: "Khu vực duyên hải Nam Trung Bộ" },
  { alias: "Ninh Thuận", officialProvinceCode: "56", officialProvinceName: "Tỉnh Khánh Hòa", note: "Khu vực Thuận Hải cũ" },
  { alias: "Bình Phước", officialProvinceCode: "75", officialProvinceName: "Tỉnh Đồng Nai", note: "Khu vực Sông Bé cũ" },
  { alias: "Bình Dương", officialProvinceCode: "75", officialProvinceName: "Tỉnh Đồng Nai", note: "Khu vực Sông Bé cũ" },
  { alias: "Sông Bé", officialProvinceCode: "75", officialProvinceName: "Tỉnh Đồng Nai", note: "Tỉnh cũ Bình Dương - Bình Phước" },
  { alias: "Bà Rịa - Vũng Tàu", officialProvinceCode: "79", officialProvinceName: "Thành phố Hồ Chí Minh", note: "Vùng kinh tế trọng điểm Đông Nam Bộ" },
  { alias: "Long An", officialProvinceCode: "80", officialProvinceName: "Tỉnh Tây Ninh", note: "Khu vực giáp ranh Tây Nam Bộ" },
  { alias: "Tiền Giang", officialProvinceCode: "82", officialProvinceName: "Tỉnh Đồng Tháp", note: "Khu vực Định Tường cũ" },
  { alias: "Bến Tre", officialProvinceCode: "86", officialProvinceName: "Tỉnh Vĩnh Long", note: "Khu vực Cửu Long cũ" },
  { alias: "Trà Vinh", officialProvinceCode: "86", officialProvinceName: "Tỉnh Vĩnh Long", note: "Khu vực Cửu Long cũ" },
  { alias: "Kiên Giang", officialProvinceCode: "91", officialProvinceName: "Tỉnh An Giang", note: "Khu vực Rạch Giá - An Giang" },
  { alias: "Hậu Giang", officialProvinceCode: "92", officialProvinceName: "Thành phố Cần Thơ", note: "Tỉnh cũ Hậu Giang" },
  { alias: "Sóc Trăng", officialProvinceCode: "92", officialProvinceName: "Thành phố Cần Thơ", note: "Khu vực Hậu Giang cũ" },
  { alias: "Bạc Liêu", officialProvinceCode: "96", officialProvinceName: "Tỉnh Cà Mau", note: "Tỉnh cũ Minh Hải" },
  { alias: "Minh Hải", officialProvinceCode: "96", officialProvinceName: "Tỉnh Cà Mau", note: "Tỉnh cũ Cà Mau - Bạc Liêu" },
];

export interface SearchProvinceResult {
  code: string;
  name: string;
  divisionType: "province" | "centrally-governed-city";
  matchedAlias?: string;
  note?: string;
}

export function searchProvincesWithMergers(query: string): SearchProvinceResult[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return VIETNAM_PROVINCES.map((p) => ({
      code: p.code,
      name: p.name,
      divisionType: p.divisionType,
    }));
  }

  const results: SearchProvinceResult[] = [];
  const addedCodes = new Set<string>();

  // 1. Tìm theo tên tỉnh chính thức
  for (const province of VIETNAM_PROVINCES) {
    if (province.name.toLowerCase().includes(q)) {
      results.push({
        code: province.code,
        name: province.name,
        divisionType: province.divisionType,
      });
      addedCodes.add(province.code);
    }
  }

  // 2. Tìm theo tên cũ / tên sáp nhập lịch sử
  for (const merger of HISTORICAL_PROVINCE_MERGERS) {
    if (merger.alias.toLowerCase().includes(q)) {
      if (!addedCodes.has(merger.officialProvinceCode)) {
        const official = VIETNAM_PROVINCES.find((p) => p.code === merger.officialProvinceCode);
        if (official) {
          results.push({
            code: official.code,
            name: official.name,
            divisionType: official.divisionType,
            matchedAlias: merger.alias,
            note: merger.note,
          });
          addedCodes.add(merger.officialProvinceCode);
        }
      }
    }
  }

  return results;
}
