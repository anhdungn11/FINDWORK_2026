import CompanySearchPanel from "./CompanySearchPanel";

import styles from "../styles/CompaniesHero.module.css";

interface CompaniesHeroProps {
  keyword: string;
  industry: string;
  location: string;

  industryOptions: string[];
  locationOptions: string[];

  companyCount: number;
  totalJobs: number;

  verifiedOnly?: boolean;
  onVerifiedOnlyChange?: (value: boolean) => void;

  onKeywordChange: (
    value: string,
  ) => void;

  onIndustryChange: (
    value: string,
  ) => void;

  onLocationChange: (
    value: string,
  ) => void;
}

const CompaniesHero = ({
  keyword,
  industry,
  location,
  industryOptions,
  locationOptions,
  companyCount,
  totalJobs,
  verifiedOnly,
  onVerifiedOnlyChange,
  onKeywordChange,
  onIndustryChange,
  onLocationChange,
}: CompaniesHeroProps) => {
  return (
    <section className={styles.hero}>
      <div
        className={`container ${styles.heroContent}`}
      >
        <span className={styles.eyebrow}>
          FINDWORK COMPANIES
        </span>

        <h1 className={styles.title}>
          Khám phá nơi bạn muốn làm việc
        </h1>

        <p className={styles.description}>
          Tìm hiểu doanh nghiệp, lĩnh vực hoạt động
          và những cơ hội việc làm đang mở.
        </p>

        <CompanySearchPanel
          keyword={keyword}
          industry={industry}
          location={location}
          industryOptions={
            industryOptions
          }
          locationOptions={
            locationOptions
          }
          onKeywordChange={
            onKeywordChange
          }
          onIndustryChange={
            onIndustryChange
          }
          onLocationChange={
            onLocationChange
          }
        />

        <div className={styles.heroMeta}>
          <span>
            {companyCount} doanh nghiệp
          </span>

          <span className={styles.metaDot} />

          <span>
            {totalJobs} cơ hội việc làm
          </span>

          {onVerifiedOnlyChange && (
            <>
              <span className={styles.metaDot} />
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={verifiedOnly === true}
                  onChange={(e) => onVerifiedOnlyChange(e.target.checked)}
                  style={{ accentColor: "var(--color-primary)", cursor: "pointer" }}
                />
                Chỉ doanh nghiệp đã xác thực
              </label>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default CompaniesHero;
