import type {
  ReactNode,
} from "react";

import CompaniesEmptyState from "./CompaniesEmptyState";

import headerStyles from "../styles/CompaniesResultsHeader.module.css";
import styles from "../styles/CompaniesResults.module.css";

interface CompaniesResultsProps<
  TCompany,
> {
  companies: TCompany[];

  filteredCount: number;
  totalCount: number;

  hasFilters: boolean;

  onClearFilters: () => void;

  renderCompany: (
    company: TCompany,
  ) => ReactNode;

  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
  };
}

const CompaniesResults = <
  TCompany,
>({
  companies,
  filteredCount,
  totalCount,
  hasFilters,
  onClearFilters,
  renderCompany,
  pagination,
}: CompaniesResultsProps<TCompany>) => {
  return (
    <section
      className={styles.resultsSection}
    >
      <div className="container">
        <div
          className={headerStyles.resultsHeader}
        >
          <div>
            <span
              className={
                headerStyles.sectionEyebrow
              }
            >
              DOANH NGHIỆP
            </span>

            <h2>
              Công ty đang tuyển dụng
            </h2>

            <p>
              Hiển thị {filteredCount} trên{" "}
              {totalCount} doanh nghiệp
            </p>
          </div>

          {hasFilters && (
            <button
              type="button"
              className={
                headerStyles.clearButton
              }
              onClick={
                onClearFilters
              }
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {companies.length > 0 ? (
          <>
            <div
              className={
                styles.companyGrid
              }
            >
              {companies.map(
                (company) =>
                  renderCompany(
                    company,
                  ),
              )}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={pagination.page <= 1}
                  onClick={() => pagination.onPageChange(pagination.page - 1)}
                >
                  ← Trang trước
                </button>
                <span className={styles.pageIndicator}>
                  Trang {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => pagination.onPageChange(pagination.page + 1)}
                >
                  Trang sau →
                </button>
              </div>
            )}
          </>
        ) : (
          <CompaniesEmptyState
            onClearFilters={
              onClearFilters
            }
          />
        )}
      </div>
    </section>
  );
};

export default CompaniesResults;
