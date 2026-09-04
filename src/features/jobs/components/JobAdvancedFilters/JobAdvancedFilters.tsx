import type { AdvancedFilters } from "../../hooks/useJobFilters";

import styles from "./JobAdvancedFilters.module.css";

interface JobAdvancedFiltersProps {
  isOpen: boolean;
  filters: AdvancedFilters;

  categories: string[];
  jobTypes: string[];
  workplaces: string[];
  experiences: string[];

  resultCount: number;
  hasActiveFilters: boolean;

  onClose: () => void;
  onClear: () => void;

  onUpdate: <
    Key extends keyof AdvancedFilters,
  >(
    key: Key,
    value: AdvancedFilters[Key],
  ) => void;
}

const JobAdvancedFilters = ({
  isOpen,
  filters,
  categories,
  jobTypes,
  workplaces,
  experiences,
  resultCount,
  hasActiveFilters,
  onClose,
  onClear,
  onUpdate,
}: JobAdvancedFiltersProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterPanelHeader}>
        <div>
          <span className={styles.filterEyebrow}>
            FINDWORK FILTER
          </span>

          <h3>Tinh chỉnh kết quả tìm kiếm</h3>

          <p>
            Chọn những tiêu chí phù hợp với công việc
            bạn đang tìm.
          </p>
        </div>

        <button
          type="button"
          className={styles.closeFilterButton}
          onClick={onClose}
          aria-label="Đóng bộ lọc"
        >
          ×
        </button>
      </div>

      <div className={styles.filterGrid}>
        <FilterSelect
          label="Ngành nghề"
          value={filters.category}
          placeholder="Tất cả ngành nghề"
          options={categories}
          onChange={(value) =>
            onUpdate("category", value)
          }
        />

        <FilterSelect
          label="Loại công việc"
          value={filters.type}
          placeholder="Tất cả loại việc"
          options={jobTypes}
          onChange={(value) =>
            onUpdate("type", value)
          }
        />

        <FilterSelect
          label="Hình thức làm việc"
          value={filters.workplace}
          placeholder="Tất cả hình thức"
          options={workplaces}
          onChange={(value) =>
            onUpdate("workplace", value)
          }
        />

        <FilterSelect
          label="Kinh nghiệm"
          value={filters.experience}
          placeholder="Tất cả kinh nghiệm"
          options={experiences}
          onChange={(value) =>
            onUpdate("experience", value)
          }
        />

        <label
          className={`${styles.filterField} ${styles.salaryField}`}
        >
          <span>Mức lương tối thiểu</span>

          <div className={styles.selectWrapper}>
            <select
              value={filters.salaryMin}
              onChange={(event) =>
                onUpdate(
                  "salaryMin",
                  Number(event.target.value),
                )
              }
            >
              <option value={0}>
                Không yêu cầu
              </option>

              <option value={10}>
                Từ 10 triệu
              </option>

              <option value={12}>
                Từ 12 triệu
              </option>

              <option value={15}>
                Từ 15 triệu
              </option>

              <option value={20}>
                Từ 20 triệu
              </option>

              <option value={25}>
                Từ 25 triệu
              </option>
            </select>
          </div>
        </label>
      </div>

      <div className={styles.filterPanelFooter}>
        <div className={styles.filterResultInfo}>
          <span className={styles.liveDot} />

          <span>
            {resultCount} công việc phù hợp với bộ lọc
          </span>
        </div>

        <div className={styles.filterActions}>
          {hasActiveFilters && (
            <button
              type="button"
              className={styles.resetFilterButton}
              onClick={onClear}
            >
              Đặt lại
            </button>
          )}

          <button
            type="button"
            className={styles.applyFilterButton}
            onClick={onClose}
          >
            Xem kết quả
          </button>
        </div>
      </div>
    </div>
  );
};

interface FilterSelectProps {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (value: string) => void;
}

const FilterSelect = ({
  label,
  value,
  placeholder,
  options,
  onChange,
}: FilterSelectProps) => {
  return (
    <label className={styles.filterField}>
      <span>{label}</span>

      <div className={styles.selectWrapper}>
        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
        >
          <option value="">
            {placeholder}
          </option>

          {options.map((option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
};

export default JobAdvancedFilters;