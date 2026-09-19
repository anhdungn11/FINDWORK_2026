import type {
  CareerLevel,
  CareerPreferences,
} from "@/features/candidate/types/onboarding.types";

import {
  CAREER_LEVEL_OPTIONS,
} from "../utils/career-preferences.constants";

import styles from "../styles/PreferenceField.module.css";

interface CareerAvailabilityFieldProps {
  desiredCareerLevel: CareerLevel;
  availability: CareerPreferences["availability"];
  willingToRelocate: boolean;
  onCareerLevelChange: (
    value: CareerLevel,
  ) => void;
  onAvailabilityTypeChange: (
    value: CareerPreferences["availability"]["type"],
  ) => void;
  onAvailableFromChange: (
    value: string,
  ) => void;
  onRelocationChange: (
    value: boolean,
  ) => void;
}

const CareerAvailabilityField = ({
  desiredCareerLevel,
  availability,
  willingToRelocate,
  onCareerLevelChange,
  onAvailabilityTypeChange,
  onAvailableFromChange,
  onRelocationChange,
}: CareerAvailabilityFieldProps) => {
  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>
            CẤP ĐỘ & THỜI ĐIỂM
          </span>
          <h4>Mức độ sẵn sàng cho cơ hội mới</h4>
        </div>
      </div>

      <div className={styles.twoColumnGrid}>
        <label className={styles.field}>
          <span>Cấp độ mong muốn</span>
          <select
            value={desiredCareerLevel}
            onChange={(event) =>
              onCareerLevelChange(
                event.target.value as CareerLevel,
              )
            }
          >
            {CAREER_LEVEL_OPTIONS.map(
              (option) => (
                <option
                  key={option.value || "unset"}
                  value={option.value}
                >
                  {option.label}
                </option>
              ),
            )}
          </select>
        </label>

        <label className={styles.field}>
          <span>Có thể bắt đầu làm việc</span>
          <select
            value={availability.type}
            onChange={(event) =>
              onAvailabilityTypeChange(
                event.target.value as CareerPreferences["availability"]["type"],
              )
            }
          >
            <option value="">
              Chưa xác định
            </option>
            <option value="immediately">
              Có thể đi làm ngay
            </option>
            <option value="specific-date">
              Từ ngày cụ thể
            </option>
          </select>
        </label>
      </div>

      {availability.type ===
        "specific-date" && (
        <label className={styles.field}>
          <span>Ngày có thể bắt đầu</span>
          <input
            type="date"
            value={availability.availableFrom}
            onChange={(event) =>
              onAvailableFromChange(
                event.target.value,
              )
            }
          />
        </label>
      )}

      <label className={styles.checkboxRowStrong}>
        <input
          type="checkbox"
          checked={willingToRelocate}
          onChange={(event) =>
            onRelocationChange(
              event.target.checked,
            )
          }
        />
        <span>
          <strong>
            Tôi sẵn sàng chuyển nơi ở
          </strong>
          <small>
            FINDWORK có thể mở rộng phạm vi gợi ý khi có cơ hội phù hợp ở địa phương khác.
          </small>
        </span>
      </label>
    </section>
  );
};

export default CareerAvailabilityField;
