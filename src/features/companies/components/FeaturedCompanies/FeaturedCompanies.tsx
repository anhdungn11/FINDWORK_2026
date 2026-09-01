import { companies } from "@/data/mock/companies.mock";

import CompanyCard from "@/features/companies/components/CompanyCard/CompanyCard";

import styles from "./FeaturedCompanies.module.css";

const FeaturedCompanies = () => {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.heading}>
          <h2 className={styles.title}>
            Công ty nổi bật
          </h2>

          <p className={styles.description}>
            Khám phá những doanh nghiệp đang tuyển dụng tích cực.
          </p>
        </div>

        <div className={styles.grid}>
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCompanies;