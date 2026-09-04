import { useState } from "react";

import { jobs } from "@/data/mock/jobs.mock";

import JobActiveFilters from "@/features/jobs/components/JobActiveFilters/JobActiveFilters";
import JobAdvancedFilters from "@/features/jobs/components/JobAdvancedFilters/JobAdvancedFilters";
import JobDiscoveryCard from "@/features/jobs/components/JobDiscoveryCard/JobDiscoveryCard";
import JobQuickFilters from "@/features/jobs/components/JobQuickFilters/JobQuickFilters";
import JobSearchBar from "@/features/jobs/components/JobSearchBar/JobSearchBar";

import { useJobFilters } from "@/features/jobs/hooks/useJobFilters";
import type { JobSortOption } from "@/features/jobs/utils/job-filter.utils";

import styles from "./JobsPage.module.css";

const JobsPage = () => {
  const [isFilterPanelOpen, setIsFilterPanelOpen] =
    useState(false);

  const {
    keyword,
    location,
    sortBy,
    advancedFilters,

    locations,
    categories,
    jobTypes,
    workplaces,
    experiences,

    filteredJobs,

    isRemote,
    isFresher,
    isInternship,

    activeFilterCount,
    hasActiveFilters,

    setKeyword,
    setLocation,
    setSortBy,

    updateAdvancedFilter,

    toggleRemote,
    toggleFresher,
    toggleInternship,

    clearAdvancedFilters,
  } = useJobFilters(jobs);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1 className={styles.title}>
              Khám phá công việc phù hợp với bạn
            </h1>

            <p className={styles.description}>
              Tìm kiếm cơ hội theo kỹ năng, ngành nghề và khu vực
              bạn mong muốn.
            </p>

            <div className={styles.searchWrapper}>
              <JobSearchBar
                keyword={keyword}
                location={location}
                locations={locations}
                onKeywordChange={setKeyword}
                onLocationChange={setLocation}
              />
            </div>

            <JobQuickFilters
              sortBy={sortBy}
              isRemote={isRemote}
              isFresher={isFresher}
              isInternship={isInternship}
              isFilterPanelOpen={isFilterPanelOpen}
              activeFilterCount={activeFilterCount}
              onSortChange={setSortBy}
              onToggleRemote={toggleRemote}
              onToggleFresher={toggleFresher}
              onToggleInternship={toggleInternship}
              onToggleFilterPanel={() =>
                setIsFilterPanelOpen(
                  (current) => !current,
                )
              }
            />

            <JobAdvancedFilters
              isOpen={isFilterPanelOpen}
              filters={advancedFilters}
              categories={categories}
              jobTypes={jobTypes}
              workplaces={workplaces}
              experiences={experiences}
              resultCount={filteredJobs.length}
              hasActiveFilters={hasActiveFilters}
              onClose={() =>
                setIsFilterPanelOpen(false)
              }
              onClear={clearAdvancedFilters}
              onUpdate={updateAdvancedFilter}
            />

            <JobActiveFilters
              keyword={keyword}
              location={location}
              filters={advancedFilters}
              onKeywordChange={setKeyword}
              onLocationChange={setLocation}
              onUpdateFilter={updateAdvancedFilter}
              onClearAdvancedFilters={clearAdvancedFilters}
            />
          </div>
        </div>
      </section>

      <section className={styles.resultsSection}>
        <div className="container">
          <div className={styles.contentLayout}>
            <div className={styles.jobsColumn}>
              <div className={styles.resultsHeader}>
                <div>
                  <h2>Cơ hội việc làm</h2>

                  <p>
                    {filteredJobs.length} công việc được tìm thấy.
                  </p>
                </div>

                <select
                  className={styles.sortSelect}
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(
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

              {filteredJobs.length > 0 ? (
                <>
                  <div className={styles.jobList}>
                    {filteredJobs.map((job) => (
                      <JobDiscoveryCard
                        key={job.id}
                        job={job}
                      />
                    ))}
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
                      onClick={clearAdvancedFilters}
                    >
                      Xóa bộ lọc
                    </button>
                  )}
                </div>
              )}
            </div>

            <aside className={styles.sidebar}>
              <div className={styles.marketCard}>
                <div className={styles.marketHeader}>
                  <span className={styles.eyebrow}>
                    THỊ TRƯỜNG VIỆC LÀM
                  </span>

                  <span className={styles.trendIcon}>
                    ↗
                  </span>
                </div>

                <h3>Xu hướng tuyển dụng</h3>

                <p className={styles.marketDescription}>
                  Dữ liệu cập nhật tuần này
                </p>

                <div className={styles.trendList}>
                  <div className={styles.trendItem}>
                    <div>
                      <strong>
                        Kinh doanh / Bán hàng
                      </strong>

                      <span>
                        Nhu cầu tuyển dụng tăng
                      </span>
                    </div>

                    <b>+18%</b>
                  </div>

                  <div className={styles.trendItem}>
                    <div>
                      <strong>
                        Marketing / Truyền thông
                      </strong>

                      <span>
                        Nhu cầu tuyển dụng tăng
                      </span>
                    </div>

                    <b>+14%</b>
                  </div>

                  <div className={styles.trendItem}>
                    <div>
                      <strong>
                        CNTT / Phần mềm
                      </strong>

                      <span>
                        Nhu cầu tuyển dụng tăng
                      </span>
                    </div>

                    <b>+12%</b>
                  </div>

                  <div className={styles.trendItem}>
                    <div>
                      <strong>
                        Logistics / Chuỗi cung ứng
                      </strong>

                      <span>
                        Nhu cầu tuyển dụng tăng
                      </span>
                    </div>

                    <b>+10%</b>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.analysisButton}
                >
                  Xem phân tích chi tiết
                </button>
              </div>

              <div className={styles.sideAction}>
                <div>
                  <strong>
                    Nhận việc làm phù hợp
                  </strong>

                  <span>
                    Đăng ký để nhận việc mới mỗi ngày
                  </span>
                </div>

                <span>→</span>
              </div>

              <div className={styles.sideAction}>
                <div>
                  <strong>Việc đã lưu</strong>

                  <span>
                    Xem danh sách việc bạn đã lưu
                  </span>
                </div>

                <span>→</span>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
};

export default JobsPage;