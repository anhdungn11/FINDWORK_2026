import type { Company } from "@/data/mock/companies.mock";

import styles from "./CompanyCard.module.css";

interface CompanyCardProps {
  company: Company;
}

const CompanyCard = ({ company }: CompanyCardProps) => {
  return (
    <article className={styles.card}>
      <div className={styles.logo}>
        {company.name.charAt(0)}
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>
          {company.name}
        </h3>

        <p className={styles.industry}>
          {company.industry}
        </p>

        <p className={styles.location}>
          {company.location}
        </p>

        <span className={styles.jobsCount}>
          {company.jobsCount} việc làm đang tuyển
        </span>
      </div>
    </article>
  );
};

export default CompanyCard;