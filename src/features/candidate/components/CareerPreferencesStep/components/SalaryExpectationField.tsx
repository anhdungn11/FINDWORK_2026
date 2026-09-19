import type {
  CareerPreferences,
  SalaryExpectationType,
} from "@/features/candidate/types/onboarding.types";

import fieldStyles from "../styles/PreferenceField.module.css";
import styles from "../styles/PreferenceChoices.module.css";

interface SalaryExpectationFieldProps {
  value: CareerPreferences["salaryExpectation"];
  onTypeChange: (
    type: SalaryExpectationType,
  ) => void;
  onMinChange: (
    value: number | null,
  ) => void;
  onMaxChange: (
    value: number | null,
  ) => void;
}

const SALARY_TYPES: Array<{
  value: SalaryExpectationType;
  label: string;
}> = [
  { value: "range", label: "Khoảng lương" },
  { value: "negotiable", label: "Có thể thương lượng" },
  { value: "not-important", label: "Không quá quan trọng" },
];

const toNumberOrNull = (
  input: string,
) => {
  if (!input) {
    return null;
  }

  const parsed = Number(input);
  return Number.isFinite(parsed)
    ? parsed
    : null;
};

const SalaryExpectationField = ({
  value,
  onTypeChange,
  onMinChange,
  onMaxChange,
}: SalaryExpectationFieldProps) => {
  const rangeInvalid =
    value.type === "range" &&
    value.min !== null &&
    value.max !== null &&
    value.min > value.max;

  return (
    <section className={styles.section}>
      <div className={styles.block}>
        <span className={styles.eyebrow}>
          MỨC LƯƠNG MONG MUỐN
        </span>
        <h4>Mức thu nhập bạn đang hướng tới</h4>

        <div className={styles.segmented}>
          {SALARY_TYPES.map((option) => {
            const selected =
              value.type === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={
                  selected
                    ? styles.segmentActive
                    : styles.segment
                }
                aria-pressed={selected}
                onClick={() =>
                  onTypeChange(option.value)
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {value.type === "range" && (
          <div className={styles.salaryGrid}>
            <label>
              <span>Từ</span>
              <div className={styles.moneyInput}>
                <input
                  type="number"
                  min={0}
                  step={500000}
                  value={value.min ?? ""}
                  placeholder="15.000.000"
                  onChange={(event) =>
                    onMinChange(
                      toNumberOrNull(
                        event.target.value,
                      ),
                    )
                  }
                />
                <span>VND</span>
              </div>
            </label>

            <label>
              <span>Đến</span>
              <div className={styles.moneyInput}>
                <input
                  type="number"
                  min={0}
                  step={500000}
                  value={value.max ?? ""}
                  placeholder="25.000.000"
                  onChange={(event) =>
                    onMaxChange(
                      toNumberOrNull(
                        event.target.value,
                      ),
                    )
                  }
                />
                <span>VND</span>
              </div>
            </label>
          </div>
        )}

        {rangeInvalid && (
          <p className={fieldStyles.error}>
            Mức lương tối đa phải lớn hơn hoặc bằng mức lương tối thiểu.
          </p>
        )}

        <p className={styles.note}>
          Đơn vị hiện tại: VND / tháng. Đây là tín hiệu ưu tiên, không tự động loại bỏ công việc có mức lương hơi khác kỳ vọng.
        </p>
      </div>
    </section>
  );
};

export default SalaryExpectationField;
