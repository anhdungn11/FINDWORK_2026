import type {
  PreferredEmploymentType,
  PreferredWorkplaceType,
} from "@/features/candidate/types/onboarding.types";

import {
  EMPLOYMENT_TYPE_OPTIONS,
  WORKPLACE_TYPE_OPTIONS,
} from "../utils/career-preferences.constants";

import styles from "../styles/PreferenceChoices.module.css";

interface EmploymentPreferencesFieldProps {
  employmentTypes: PreferredEmploymentType[];
  workplaceTypes: PreferredWorkplaceType[];
  onEmploymentTypeToggle: (
    value: PreferredEmploymentType,
  ) => void;
  onWorkplaceTypeToggle: (
    value: PreferredWorkplaceType,
  ) => void;
}

const EmploymentPreferencesField = ({
  employmentTypes,
  workplaceTypes,
  onEmploymentTypeToggle,
  onWorkplaceTypeToggle,
}: EmploymentPreferencesFieldProps) => {
  return (
    <section className={styles.section}>
      <div className={styles.block}>
        <span className={styles.eyebrow}>
          LOẠI CÔNG VIỆC
        </span>
        <h4>Bạn đang tìm hình thức tuyển dụng nào?</h4>

        <div className={styles.choiceGrid}>
          {EMPLOYMENT_TYPE_OPTIONS.map(
            (option) => {
              const selected =
                employmentTypes.includes(
                  option.value,
                );

              return (
                <button
                  key={option.value}
                  type="button"
                  className={
                    selected
                      ? styles.choiceActive
                      : styles.choice
                  }
                  aria-pressed={selected}
                  onClick={() =>
                    onEmploymentTypeToggle(
                      option.value,
                    )
                  }
                >
                  <span className={styles.indicator}>
                    {selected ? "✓" : ""}
                  </span>
                  {option.label}
                </button>
              );
            },
          )}
        </div>
      </div>

      <div className={styles.block}>
        <span className={styles.eyebrow}>
          HÌNH THỨC LÀM VIỆC
        </span>
        <h4>Môi trường làm việc phù hợp với bạn</h4>

        <div className={styles.choiceGridCompact}>
          {WORKPLACE_TYPE_OPTIONS.map(
            (option) => {
              const selected =
                workplaceTypes.includes(
                  option.value,
                );

              return (
                <button
                  key={option.value}
                  type="button"
                  className={
                    selected
                      ? styles.choiceActive
                      : styles.choice
                  }
                  aria-pressed={selected}
                  onClick={() =>
                    onWorkplaceTypeToggle(
                      option.value,
                    )
                  }
                >
                  <span className={styles.indicator}>
                    {selected ? "✓" : ""}
                  </span>
                  {option.label}
                </button>
              );
            },
          )}
        </div>
      </div>
    </section>
  );
};

export default EmploymentPreferencesField;
