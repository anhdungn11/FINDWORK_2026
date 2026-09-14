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
        </div>
      </div>
    </section>
  );
};

export default CompaniesHero;
