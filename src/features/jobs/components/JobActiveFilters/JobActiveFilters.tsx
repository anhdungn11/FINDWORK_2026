import type { AdvancedFilters } from "../../hooks/useJobFilters";

import styles from "./JobActiveFilters.module.css";

interface JobActiveFiltersProps {
  keyword: string;
  location: string;
  filters: AdvancedFilters;

  onKeywordChange: (value: string) => void;
  onLocationChange: (value: string) => void;

  onUpdateFilter: <
    Key extends keyof AdvancedFilters,
  >(
    key: Key,
    value: AdvancedFilters[Key],
  ) => void;

  onClearAdvancedFilters: () => void;
}

const JobActiveFilters = ({
  keyword,
  location,
  filters,
  onKeywordChange,
  onLocationChange,
  onUpdateFilter,
  onClearAdvancedFilters,
}: JobActiveFiltersProps) => {
  const hasAdvancedFilters =
    Boolean(filters.category) ||
    Boolean(filters.type) ||
    Boolean(filters.workplace) ||
    Boolean(filters.experience) ||
    filters.salaryMin > 0;

  const hasAnyFilter =
    Boolean(keyword.trim()) ||
    Boolean(location) ||
    hasAdvancedFilters;

  if (!hasAnyFilter) {
    return null;
  }

  const clearAllFilters = () => {
    onKeywordChange("");
    onLocationChange("");
    onClearAdvancedFilters();
  };

  return (
    <div className={styles.activeFilters}>
      <div className={styles.activeFiltersList}>
        {keyword.trim() && (
          <button
            type="button"
            className={styles.filterChip}
            onClick={() =>
              onKeywordChange("")
            }
          >
            {keyword}
            <span>×</span>
          </button>
        )}

        {location && (
          <button
            type="button"
            className={styles.filterChip}
            onClick={() =>
              onLocationChange("")
            }
          >
            {location}
            <span>×</span>
          </button>
        )}

        {filters.category && (
          <button
            type="button"
            className={styles.filterChip}
            onClick={() =>
              onUpdateFilter(
                "category",
                "",
              )
            }
          >
            {filters.category}
            <span>×</span>
          </button>
        )}

        {filters.type && (
          <button
            type="button"
            className={styles.filterChip}
            onClick={() =>
              onUpdateFilter(
                "type",
                "",
              )
            }
          >
            {filters.type}
            <span>×</span>
          </button>
        )}

        {filters.workplace && (
          <button
            type="button"
            className={styles.filterChip}
            onClick={() =>
              onUpdateFilter(
                "workplace",
                "",
              )
            }
          >
            {filters.workplace}
            <span>×</span>
          </button>
        )}

        {filters.experience && (
          <button
            type="button"
            className={styles.filterChip}
            onClick={() =>
              onUpdateFilter(
                "experience",
                "",
              )
            }
          >
            {filters.experience}
            <span>×</span>
          </button>
        )}

        {filters.salaryMin > 0 && (
          <button
            type="button"
            className={styles.filterChip}
            onClick={() =>
              onUpdateFilter(
                "salaryMin",
                0,
              )
            }
          >
            Từ {filters.salaryMin} triệu
            <span>×</span>
          </button>
        )}
      </div>

      <button
        type="button"
        className={styles.clearAllButton}
        onClick={clearAllFilters}
      >
        Xóa tất cả
      </button>
    </div>
  );
};

export default JobActiveFilters;