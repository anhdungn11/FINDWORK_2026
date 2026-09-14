import type {
  ReactNode,
} from "react";

import type {
  JobSortOption,
} from "@/features/jobs/types/job-filter.types";

import headerStyles from "../styles/JobsResultsHeader.module.css";
import styles from "../styles/JobsResults.module.css";

interface JobsResultsProps<TJob> {
  jobs: TJob[];
  sortBy: JobSortOption;

  hasActiveFilters: boolean;

  onSortChange: (
    value: JobSortOption,
  ) => void;

  onClearAdvancedFilters:
    () => void;

  renderJob: (
    job: TJob,
  ) => ReactNode;
}

const JobsResults = <
  TJob,
>({
  jobs,
  sortBy,
  hasActiveFilters,
  onSortChange,
  onClearAdvancedFilters,
  renderJob,
}: JobsResultsProps<TJob>) => {
  return (
    <div className={styles.jobsColumn}>
      <div className={headerStyles.resultsHeader}>
        <div>
          <h2>Cơ hội việc làm</h2>

          <p>
            {jobs.length} công việc được tìm thấy.
          </p>
        </div>

        <select
          className={headerStyles.sortSelect}
          value={sortBy}
          onChange={(event) =>
            onSortChange(
              event.target.value as JobSortOption,
            )
          }
          aria-label="Sắp xếp việc làm"
        >
          <option value="match">
            Phù hợp nhất
          </option>

          <option value="latest">
            Mới nhất
          </option>

          <option value="salary">
            Mức lương
          </option>
        </select>
      </div>

      {jobs.length > 0 ? (
        <>
          <div className={styles.jobList}>
            {jobs.map(
              (job) =>
                renderJob(job),
            )}
          </div>

          <div className={styles.loadMore}>
            <button type="button">
              Xem thêm việc làm
            </button>
          </div>
        </>
      ) : (
        <div className={styles.emptyState}>
          <h3>Không tìm thấy công việc</h3>

          <p>
            Thử thay đổi từ khóa, khu vực hoặc bộ lọc.
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              className={
                styles.emptyResetButton
              }
              onClick={
                onClearAdvancedFilters
              }
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default JobsResults;
