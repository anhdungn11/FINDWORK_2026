import type {
  ChangeEvent,
} from "react";

import {
  VIETNAM_PROVINCES,
} from "@/data/reference/locations/provinces";

import {
  useWardOptions,
} from "@/hooks/useWardOptions";

import type {
  PersonalInfo,
} from "@/features/candidate/types/onboarding.types";

import type {
  UpdatePersonalInfoField,
} from "../types/personal-info.types";

import SectionHeader from "./SectionHeader";

import styles from "../PersonalInfoStep.module.css";

interface LocationSectionProps {
  value: PersonalInfo;
  updateField: UpdatePersonalInfoField;
  updateProvinceCode:
    (provinceCode: string) => void;
}

const LocationSection = ({
  value,
  updateField,
  updateProvinceCode,
}: LocationSectionProps) => {
  const {
    wards,
    isLoading,
    error,
  } = useWardOptions(
    value.provinceCode,
  );

  return (
    <section>
      <SectionHeader
        eyebrow="KHU VỰC"
        title="Địa chỉ hiện tại"
        description="Chọn tỉnh / thành phố và phường / xã hiện tại để FINDWORK ưu tiên các cơ hội phù hợp."
      />

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="provinceCode">
            Tỉnh / Thành phố
            <span>*</span>
          </label>

          <select
            id="provinceCode"
            value={value.provinceCode}
            onChange={(
              event:
                ChangeEvent<HTMLSelectElement>,
            ) =>
              updateProvinceCode(
                event.target.value,
              )
            }
          >
            <option value="">
              Chọn tỉnh / thành phố
            </option>

            {VIETNAM_PROVINCES.map(
              (province) => (
                <option
                  key={province.code}
                  value={province.code}
                >
                  {province.name}
                </option>
              ),
            )}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="wardCode">
            Phường / Xã / Đặc khu
            <span>*</span>
          </label>

          <select
            id="wardCode"
            value={value.wardCode}
            disabled={
              !value.provinceCode ||
              isLoading
            }
            onChange={(
              event:
                ChangeEvent<HTMLSelectElement>,
            ) =>
              updateField(
                "wardCode",
                event.target.value,
              )
            }
          >
            <option value="">
              {!value.provinceCode
                ? "Chọn tỉnh / thành phố trước"
                : isLoading
                  ? "Đang tải..."
                  : "Chọn phường / xã / đặc khu"}
            </option>

            {wards.map((ward) => (
              <option
                key={ward.code}
                value={ward.code}
              >
                {ward.name}
              </option>
            ))}
          </select>

          {error && (
            <small role="alert">
              {error}
            </small>
          )}
        </div>

        <div
          className={`${styles.field} ${styles.fullWidth}`}
        >
          <label htmlFor="addressLine">
            Địa chỉ chi tiết
          </label>

          <input
            id="addressLine"
            type="text"
            value={value.addressLine}
            placeholder="Số nhà, tên đường, khu phố..."
            autoComplete="street-address"
            onChange={(
              event:
                ChangeEvent<HTMLInputElement>,
            ) =>
              updateField(
                "addressLine",
                event.target.value,
              )
            }
          />

          <small>
            Không bắt buộc nhập số nhà cụ thể.
          </small>
        </div>
      </div>
    </section>
  );
};

export default LocationSection;
