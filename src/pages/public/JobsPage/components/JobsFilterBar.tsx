import React from "react";
import { Search, MapPin, Briefcase, SlidersHorizontal, X, RotateCcw } from "lucide-react";
import styles from "./JobsFilterBar.module.css";

export interface JobsFilterBarProps {
  keyword: string;
  provinceCode: string;
  categoryCode: string;
  workplaceType: string;
  employmentType: string;
  salaryRange: string;
  sortBy: string;
  categories: Array<{ id: string; code?: string; name: string }>;
  provinces: Array<{ id: string; code?: string; name: string }>;
  onFilterChange: (key: string, value: string) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

const POPULAR_PROVINCES = [
  { code: "", name: "Tất cả địa điểm" },
  { code: "01", name: "Hà Nội" },
  { code: "79", name: "TP. Hồ Chí Minh" },
  { code: "48", name: "Đà Nẵng" },
  { code: "31", name: "Hải Phòng" },
  { code: "24", name: "Bắc Ninh" },
  { code: "75", name: "Đồng Nai" },
  { code: "92", name: "Cần Thơ" },
];

export const JobsFilterBar = ({
  keyword,
  provinceCode,
  categoryCode,
  workplaceType,
  employmentType,
  salaryRange,
  sortBy,
  categories,
  provinces,
  onFilterChange,
  onClearAll,
  hasActiveFilters,
}: JobsFilterBarProps) => {
  return (
    <section className={styles.filterSection} aria-label="Bộ lọc tìm kiếm việc làm">
      <div className="container">
        <div className={styles.searchCard}>
          {/* Primary Search Row */}
          <div className={styles.primarySearchRow}>
            {/* Keyword Input */}
            <div className={styles.inputWrapper}>
              <Search size={18} className={styles.inputIcon} aria-hidden="true" />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Vị trí tuyển dụng, kỹ năng, tên công ty..."
                value={keyword}
                onChange={(e) => onFilterChange("q", e.target.value)}
                aria-label="Từ khóa tìm kiếm việc làm"
                data-testid="job-search-input"
              />
              {keyword && (
                <button
                  type="button"
                  className={styles.clearInputBtn}
                  onClick={() => onFilterChange("q", "")}
                  aria-label="Xóa từ khóa"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Province Select */}
            <div className={styles.selectWrapper}>
              <select
                className={styles.filterSelect}
                value={provinceCode}
                onChange={(e) => onFilterChange("province", e.target.value)}
                aria-label="Chọn tỉnh thành"
                data-testid="job-province-select"
              >
                <option value="">Tất cả tỉnh thành</option>
                {provinces.length > 0
                  ? provinces.map((p) => (
                      <option key={p.code || p.id} value={p.code || ""}>
                        {p.name}
                      </option>
                    ))
                  : POPULAR_PROVINCES.slice(1).map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
              </select>
            </div>

            {/* Category Select */}
            <div className={styles.selectWrapper}>
              <select
                className={styles.filterSelect}
                value={categoryCode}
                onChange={(e) => onFilterChange("category", e.target.value)}
                aria-label="Chọn ngành nghề"
                data-testid="job-category-select"
              >
                <option value="">Tất cả ngành nghề</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.code || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Filters Row: Salary, Workplace, Type, Sort */}
          <div className={styles.secondaryFiltersRow}>
            <div className={styles.filterChipLabel}>
              <SlidersHorizontal size={14} aria-hidden="true" />
              <span>Bộ lọc nâng cao:</span>
            </div>

            {/* Salary Range */}
            <div className={styles.selectWrapper} style={{ minWidth: 150 }}>
              <select
                className={styles.filterSelect}
                value={salaryRange}
                onChange={(e) => onFilterChange("salary", e.target.value)}
                aria-label="Mức lương"
                data-testid="job-salary-select"
              >
                <option value="">Tất cả mức lương</option>
                <option value="under10">Dưới 10 triệu</option>
                <option value="10to20">10 - 20 triệu</option>
                <option value="20to30">20 - 30 triệu</option>
                <option value="above30">Trên 30 triệu</option>
              </select>
            </div>

            {/* Workplace Type */}
            <div className={styles.selectWrapper} style={{ minWidth: 140 }}>
              <select
                className={styles.filterSelect}
                value={workplaceType}
                onChange={(e) => onFilterChange("workplace", e.target.value)}
                aria-label="Hình thức làm việc"
                data-testid="job-workplace-select"
              >
                <option value="">Tất cả hình thức</option>
                <option value="ON_SITE">Tại văn phòng</option>
                <option value="HYBRID">Linh hoạt (Hybrid)</option>
                <option value="REMOTE">Từ xa (Remote)</option>
              </select>
            </div>

            {/* Employment Type */}
            <div className={styles.selectWrapper} style={{ minWidth: 140 }}>
              <select
                className={styles.filterSelect}
                value={employmentType}
                onChange={(e) => onFilterChange("type", e.target.value)}
                aria-label="Loại hình công việc"
                data-testid="job-type-select"
              >
                <option value="">Tất cả loại hình</option>
                <option value="FULL_TIME">Toàn thời gian</option>
                <option value="PART_TIME">Bán thời gian</option>
                <option value="CONTRACT">Hợp đồng</option>
                <option value="INTERNSHIP">Thực tập</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className={styles.selectWrapper} style={{ minWidth: 140 }}>
              <select
                className={styles.filterSelect}
                value={sortBy}
                onChange={(e) => onFilterChange("sort", e.target.value)}
                aria-label="Sắp xếp theo"
                data-testid="job-sort-select"
              >
                <option value="newest">Mới nhất</option>
                <option value="salary_desc">Lương cao đến thấp</option>
                <option value="salary_asc">Lương thấp đến cao</option>
              </select>
            </div>

            {/* Clear All Action */}
            {hasActiveFilters && (
              <button
                type="button"
                className={styles.clearFiltersBtn}
                onClick={onClearAll}
                aria-label="Xóa tất cả bộ lọc"
                data-testid="clear-all-filters-btn"
              >
                <RotateCcw size={14} />
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>

          {/* Quick Location Chips */}
          <div className={styles.quickChipsRow}>
            <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Địa điểm phổ biến:</span>
            {POPULAR_PROVINCES.map((p) => {
              const isActive = provinceCode === p.code;
              return (
                <button
                  key={p.code || "all"}
                  type="button"
                  className={`${styles.quickChip} ${isActive ? styles.quickChipActive : ""}`}
                  onClick={() => onFilterChange("province", p.code)}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default JobsFilterBar;
