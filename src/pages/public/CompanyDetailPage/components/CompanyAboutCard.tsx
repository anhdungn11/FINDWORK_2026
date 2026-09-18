import type {
  CompanyDetailRecord,
} from "../types/company-detail.types";

import styles from "../styles/CompanyDetailCards.module.css";

interface CompanyAboutCardProps {
  company: CompanyDetailRecord;
}

const CompanyAboutCard = ({
  company,
}: CompanyAboutCardProps) => {
  return (
    <section className={styles.sectionCard}>
      <span className={styles.sectionLabel}>
        GIỚI THIỆU
      </span>

      <h2>Về {company.name}</h2>

      <p className={styles.description}>
        {company.description}
      </p>
    </section>
  );
};

export default CompanyAboutCard;
