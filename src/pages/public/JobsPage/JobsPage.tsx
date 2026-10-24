import React, { useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { publicApi, type PublicJobQuery } from "@/services/api/publicApi";
import type { JobDto, JobCategoryDto, ProvinceDto } from "@/services/api/apiTypes";
import CompactJobCard from "@/features/jobs/components/CompactJobCard/CompactJobCard";
import JobPagination from "@/features/jobs/components/JobPagination/JobPagination";
import JobsFilterBar from "./components/JobsFilterBar";
import styles from "./styles/JobsPageLayout.module.css";

const PAGE_SIZE = 12; // 3 columns x 4 rows on desktop

const parseSalaryParams = (
  salaryRange: string
): { salaryAtLeast?: string; salaryAtMost?: string } => {
  switch (salaryRange) {
    case "under10":
      return { salaryAtMost: "10000000" };
    case "10to20":
      return { salaryAtLeast: "10000000", salaryAtMost: "20000000" };
    case "20to30":
      return { salaryAtLeast: "20000000", salaryAtMost: "30000000" };
    case "above30":
      return { salaryAtLeast: "30000000" };
    default:
      return {};
  }
};

export const JobsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);

  // URL Query Parameters
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = Number.isSafeInteger(pageParam) && pageParam >= 1 ? pageParam : 1;
  const pageSizeParam = parseInt(searchParams.get("pageSize") || "12", 10);
  const pageSize = Number.isSafeInteger(pageSizeParam) && pageSizeParam >= 1 && pageSizeParam <= 100 ? pageSizeParam : PAGE_SIZE;
  const keyword = searchParams.get("q") || "";
  const provinceCode = searchParams.get("province") || "";
  const categoryCode = searchParams.get("category") || searchParams.get("categoryCode") || "";
  const workplaceType = searchParams.get("workplace") || searchParams.get("workplaceType") || "";
  const employmentType = searchParams.get("type") || searchParams.get("employmentType") || "";
  const salaryRange = searchParams.get("salary") || "";
  const sortBy = searchParams.get("sort") || "newest";

  // Data states
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Catalogs
  const [categories, setCategories] = useState<JobCategoryDto[]>([]);
  const [provinces, setProvinces] = useState<ProvinceDto[]>([]);

  // Load Catalogs on mount
  useEffect(() => {
    publicApi
      .listJobCategories()
      .then((cats) => setCategories(cats))
      .catch(() => {});

    publicApi
      .listProvinces({ pageSize: 100 })
      .then((p) => setProvinces(p.data))
      .catch(() => {});
  }, []);

  // Fetch Jobs based on active query params
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const { salaryAtLeast, salaryAtMost } = parseSalaryParams(salaryRange);

    const query: PublicJobQuery = {
      page: currentPage,
      pageSize,
      q: keyword.trim() || undefined,
      provinceCode: provinceCode || undefined,
      categoryCode: categoryCode || undefined,
      workplaceType: workplaceType || undefined,
      employmentType: employmentType || undefined,
      salaryAtLeast,
      salaryAtMost,
      sort: (sortBy as any) || "newest",
    };

    publicApi
      .listJobs(query)
      .then((paged) => {
        if (isCancelled) return;
        setJobs(paged.data);
        setPagination(paged.pagination);
        setIsLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err?.message || "Không thể tải danh sách việc làm từ máy chủ.");
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    currentPage,
    keyword,
    provinceCode,
    categoryCode,
    workplaceType,
    employmentType,
    salaryRange,
    sortBy,
    pageSize,
  ]);

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    keyword ||
      provinceCode ||
      categoryCode ||
      workplaceType ||
      employmentType ||
      salaryRange ||
      (sortBy && sortBy !== "newest")
  );

  // Handler for filter changes (resets page to 1)
  const handleFilterChange = (key: string, value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        // Reset page to 1 on filter modification
        next.set("page", "1");
        return next;
      },
      { replace: false }
    );
  };

  // Handler for Clear All
  const handleClearAll = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams();
        next.set("page", "1");
        return next;
      },
      { replace: false }
    );
  };

  // Handler for pagination page click
  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage || newPage < 1 || newPage > pagination.totalPages) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(newPage));
        return next;
      },
      { replace: false }
    );

    // Scroll up smoothly to results header
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className={styles.page}>
      {/* Search & Multi-criteria Filter Bar */}
      <JobsFilterBar
        keyword={keyword}
        provinceCode={provinceCode}
        categoryCode={categoryCode}
        workplaceType={workplaceType}
        employmentType={employmentType}
        salaryRange={salaryRange}
        sortBy={sortBy}
        categories={categories}
        provinces={provinces}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Main Results Section */}
      <section className={styles.resultsSection} ref={resultsRef} aria-label="Danh sách việc làm">
        <div className="container">
          {/* Header Row: Title & Total Count */}
          <div className={styles.resultsHeader}>
            <h1 className={styles.resultsTitle}>
              <span>Khám phá việc làm nổi bật</span>
              {!isLoading && (
                <span className={styles.resultsCountBadge} data-testid="job-results-count">
                  {pagination.total} việc làm
                </span>
              )}
            </h1>
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className={styles.loadingGrid} aria-busy="true" aria-label="Đang tải việc làm">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        backgroundColor: "#f1f5f9",
                      }}
                    />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div className={styles.skeletonLine} style={{ width: "60%" }} />
                      <div className={styles.skeletonLine} style={{ width: "90%" }} />
                    </div>
                  </div>
                  <div className={styles.skeletonLine} style={{ width: "40%", margin: "8px 0" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <div className={styles.skeletonLine} style={{ width: "30%" }} />
                    <div className={styles.skeletonLine} style={{ width: "30%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className={styles.emptyCard}>
              <h3 className={styles.emptyTitle} style={{ color: "var(--color-danger, #ef4444)" }}>
                Không thể tải danh sách việc làm
              </h3>
              <p className={styles.emptyText}>{error}</p>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => handleFilterChange("page", String(currentPage))}
              >
                Tải lại trang
              </button>
            </div>
          )}

          {/* Empty Results State */}
          {!isLoading && !error && jobs.length === 0 && (
            <div className={styles.emptyCard} data-testid="jobs-empty-state">
              <h3 className={styles.emptyTitle}>Không tìm thấy việc làm phù hợp</h3>
              <p className={styles.emptyText}>
                {hasActiveFilters
                  ? "Hãy thử nới lỏng từ khóa tìm kiếm hoặc bỏ chọn một số bộ lọc địa điểm / mức lương để thấy nhiều cơ hội hơn."
                  : "Hiện tại hệ thống đang cập nhật thêm các tin tuyển dụng mới. Vui lòng quay lại sau."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className={styles.resetBtn}
                  onClick={handleClearAll}
                  data-testid="reset-filters-btn"
                >
                  Xóa tất cả bộ lọc
                </button>
              )}
            </div>
          )}

          {/* Populated 3-Column Job Grid */}
          {!isLoading && !error && jobs.length > 0 && (
            <>
              <div className={styles.jobsGrid} data-testid="jobs-grid">
                {jobs.map((job) => (
                  <CompactJobCard key={job.id} job={job} />
                ))}
              </div>

              {/* Real Job Pagination */}
              <JobPagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                pageSize={pagination.pageSize}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default JobsPage;
