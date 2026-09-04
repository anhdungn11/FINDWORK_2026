import type { JobSortOption } from "../../utils/job-filter.utils";

import styles from "./JobQuickFilters.module.css";

interface JobQuickFiltersProps {
  sortBy: JobSortOption;

  isRemote: boolean;
  isFresher: boolean;
  isInternship: boolean;

  isFilterPanelOpen: boolean;
  activeFilterCount: number;

  onSortChange: (value: JobSortOption) => void;

  onToggleRemote: () => void;
  onToggleFresher: () => void;
  onToggleInternship: () => void;

  onToggleFilterPanel: () => void;
}

const JobQuickFilters = ({
  sortBy,
  isRemote,
  isFresher,
  isInternship,
  isFilterPanelOpen,
  activeFilterCount,
  onSortChange,
  onToggleRemote,
  onToggleFresher,
  onToggleInternship,
  onToggleFilterPanel,
}: JobQuickFiltersProps) => {
  return (
    <div className={styles.quickFilters}>
      <button
        type="button"
        className={
          sortBy === "match"
            ? styles.quickFilterActive
            : undefined
        }
        onClick={() => onSortChange("match")}
      >
        Dành cho bạn
      </button>

      <button
        type="button"
        className={
          sortBy === "latest"
            ? styles.quickFilterActive
            : undefined
        }
        onClick={() => onSortChange("latest")}
      >
        Mới nhất
      </button>

      <button
        type="button"
        disabled
        title="Tính năng này sẽ hoạt động khi có vị trí của người dùng"
      >
        Gần bạn
      </button>

      <button
        type="button"
        className={
          isRemote
            ? styles.quickFilterActive
            : undefined
        }
        onClick={onToggleRemote}
      >
        Remote
      </button>

      <button
        type="button"
        className={
          isFresher
            ? styles.quickFilterActive
            : undefined
        }
        onClick={onToggleFresher}
      >
        Fresher
      </button>

      <button
        type="button"
        className={
          isInternship
            ? styles.quickFilterActive
            : undefined
        }
        onClick={onToggleInternship}
      >
        Internship
      </button>

      <button
        type="button"
        className={`${styles.filterButton} ${
          isFilterPanelOpen
            ? styles.filterButtonOpen
            : ""
        }`}
        onClick={onToggleFilterPanel}
      >
        Bộ lọc

        {activeFilterCount > 0 && (
          <span className={styles.filterCount}>
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default JobQuickFilters;