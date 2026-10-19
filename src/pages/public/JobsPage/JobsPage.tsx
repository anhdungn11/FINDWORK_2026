import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router-dom";

import {
  jobs as rawMockJobs,
} from "@/data/mock/jobs.mock";
import { publicApi } from "@/services/api/publicApi";
import {
  EMPLOYMENT_TYPE_LABEL,
  WORKPLACE_TYPE_LABEL,
  formatSalary,
} from "@/services/api/apiTypes";
import type { JobRecord } from "@/features/jobs/types/job.types";
import { isDemoFixturesAllowed } from "@/config/featureFlags";

import JobActiveFilters from "@/features/jobs/components/JobActiveFilters/JobActiveFilters";
import JobAdvancedFilters from "@/features/jobs/components/JobAdvancedFilters/JobAdvancedFilters";
import JobDiscoveryCard from "@/features/jobs/components/JobDiscoveryCard/JobDiscoveryCard";
import JobQuickFilters from "@/features/jobs/components/JobQuickFilters/JobQuickFilters";
import JobSearchBar from "@/features/jobs/components/JobSearchBar/JobSearchBar";

import {
  useJobFilters,
} from "@/features/jobs/hooks/useJobFilters";

import JobsHero from "./components/JobsHero";
import JobsResults from "./components/JobsResults";
import JobsResultsSection from "./components/JobsResultsSection";
import JobsSidebar from "./components/JobsSidebar";

import styles from "./styles/JobsPageLayout.module.css";

const mockJobs: JobRecord[] = rawMockJobs.map((j) => ({
  ...j,
  isMock: true,
}));

const JobsPage = () => {
  const routerLocation = useLocation();
  const allowDemo = isDemoFixturesAllowed(routerLocation.search);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [dataSource, setDataSource] = useState<"live" | "demo">("live");
  const [liveJobs, setLiveJobs] = useState<JobRecord[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoadingLive(true);
    setLiveError(null);

    publicApi
      .listJobs({ page: 1, pageSize: 50 })
      .then((paged) => {
        if (!active) return;
        const mapped: JobRecord[] = paged.data.map((dto) => ({
          id: dto.id,
          title: dto.title,
          company: dto.companyName || "Doanh nghiệp",
          category: dto.categoryName || "Chung",
          skills: [],
          location: "Việt Nam",
          workplace: dto.workplaceType ? WORKPLACE_TYPE_LABEL[dto.workplaceType] : "Tại văn phòng",
          type: dto.employmentType ? EMPLOYMENT_TYPE_LABEL[dto.employmentType] : "Toàn thời gian",
          experience: dto.experienceMinMonths
            ? `${Math.floor(dto.experienceMinMonths / 12)} năm kinh nghiệm`
            : "Không yêu cầu",
          salary: formatSalary(dto),
          postedAt: dto.publishedAt ? new Date(dto.publishedAt).toLocaleDateString("vi-VN") : "Mới đăng",
          matchScore: 0,
          isMock: false,
        }));
        setLiveJobs(mapped);
        setIsLoadingLive(false);
      })
      .catch((err) => {
        if (!active) return;
        setLiveError(err?.message || "Không thể kết nối đến máy chủ tin tuyển dụng.");
        setIsLoadingLive(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const activeJobs = useMemo(() => {
    if (allowDemo && dataSource === "demo") return mockJobs;
    return liveJobs;
  }, [allowDemo, dataSource, liveJobs]);

  const jobFilters = useJobFilters(activeJobs);

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
    applyAdvancedFilters,
    getAdvancedFilterResultCount,

    toggleRemote,
    toggleFresher,
    toggleInternship,

    clearAdvancedFilters,
  } = jobFilters;

  return (
    <div className={styles.page}>
      {allowDemo && (
        <aside className={styles.sourceToggleBar} role="region" aria-label="Nguồn dữ liệu việc làm">
          <div className={`container ${styles.sourceToggleContainer}`}>
            <div className={styles.sourceNotice}>
              {dataSource === "live" ? (
                <span>
                  <strong>Nguồn dữ liệu:</strong> Đang kết nối trực tiếp với Backend API (GET /api/v1/jobs)
                  {isLoadingLive && " — Đang tải dữ liệu..."}
                  {liveError && ` — Lỗi kết nối: ${liveError}`}
                  {!isLoadingLive && !liveError && ` (${liveJobs.length} tin tuyển dụng thực tế)`}
                </span>
              ) : (
                <span>
                  <strong>Nguồn dữ liệu:</strong> Đang xem bộ dữ liệu mẫu minh họa (Demo fixtures - {mockJobs.length} tin)
                </span>
              )}
            </div>

            <div className={styles.sourceButtons}>
              <button
                type="button"
                className={`${styles.sourceToggleBtn} ${dataSource === "live" ? styles.sourceToggleBtnActive : ""}`}
                onClick={() => setDataSource("live")}
              >
                Tin thật từ Backend ({liveJobs.length})
              </button>
              <button
                type="button"
                className={`${styles.sourceToggleBtn} ${dataSource === "demo" ? styles.sourceToggleBtnActive : ""}`}
                onClick={() => setDataSource("demo")}
              >
                Bản tin mẫu Demo ({mockJobs.length})
              </button>
            </div>
          </div>
        </aside>
      )}

      <JobsHero
        searchContent={
          <JobSearchBar
            keyword={keyword}
            location={location}
            locations={locations}
            onKeywordChange={setKeyword}
            onLocationChange={setLocation}
          />
        }
        filterContent={
          <>
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
              onToggleFilterPanel={() => setIsFilterPanelOpen((current) => !current)}
            />

            <JobAdvancedFilters
              isOpen={isFilterPanelOpen}
              filters={advancedFilters}
              categories={categories}
              jobTypes={jobTypes}
              workplaces={workplaces}
              experiences={experiences}
              getResultCount={getAdvancedFilterResultCount}
              onClose={() => setIsFilterPanelOpen(false)}
              onApply={applyAdvancedFilters}
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
          </>
        }
      />

      <JobsResultsSection
        resultsContent={
          isLoadingLive ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <p style={{ color: "var(--color-text-secondary)" }}>Đang tải danh sách việc làm...</p>
            </div>
          ) : liveError && dataSource === "live" ? (
            <div style={{ padding: "48px 24px", textAlign: "center", background: "var(--color-surface)", borderRadius: "14px", border: "1px solid var(--color-border)" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "18px", color: "var(--color-danger, #ef4444)" }}>
                Không thể tải danh sách việc làm
              </h3>
              <p style={{ margin: "0 0 20px", fontSize: "14px", color: "var(--color-text-secondary)" }}>
                {liveError}
              </p>
              <button
                type="button"
                className={styles.sourceToggleBtnActive}
                style={{ padding: "10px 20px", borderRadius: "10px", cursor: "pointer", border: "none", fontWeight: 700 }}
                onClick={() => window.location.reload()}
              >
                Thử lại
              </button>
            </div>
          ) : dataSource === "live" && liveJobs.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", background: "var(--color-surface)", borderRadius: "14px", border: "1px solid var(--color-border)" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "18px", color: "var(--color-text-primary)" }}>
                Hiện chưa có tin tuyển dụng nào được xuất bản
              </h3>
              <p style={{ margin: "0 0 20px", fontSize: "14px", color: "var(--color-text-secondary)" }}>
                Các doanh nghiệp đang cập nhật các cơ hội việc làm mới. Bạn có thể quay lại sau hoặc làm mới trang.
              </p>
              <button
                type="button"
                className={styles.sourceToggleBtnActive}
                style={{ padding: "10px 20px", borderRadius: "10px", cursor: "pointer", border: "none", fontWeight: 700 }}
                onClick={() => window.location.reload()}
              >
                Tải lại danh sách
              </button>
            </div>
          ) : (
            <JobsResults
              jobs={filteredJobs}
              sortBy={sortBy}
              hasActiveFilters={hasActiveFilters}
              onSortChange={setSortBy}
              onClearAdvancedFilters={clearAdvancedFilters}
              renderJob={(job) => (
                <JobDiscoveryCard
                  key={job.id}
                  job={job}
                />
              )}
            />
          )
        }
        sidebarContent={<JobsSidebar />}
      />
    </div>
  );
};

export default JobsPage;
