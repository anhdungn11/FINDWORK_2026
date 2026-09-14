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
