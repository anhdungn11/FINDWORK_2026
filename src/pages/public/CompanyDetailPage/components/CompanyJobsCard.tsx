import type {
  CompanyDetailRecord,
} from "../types/company-detail.types";

import {
  BriefcaseIcon,
} from "./CompanyDetailIcons";

import cardStyles from "../styles/CompanyDetailCards.module.css";
import styles from "../styles/CompanyJobsCard.module.css";

interface CompanyJobsCardProps {
  company: CompanyDetailRecord;
}

const CompanyJobsCard = ({
  company,
}: CompanyJobsCardProps) => {
  return (
    <section className={cardStyles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={cardStyles.sectionLabel}>
            CƠ HỘI NGHỀ NGHIỆP
          </span>

          <h2>
            Việc làm đang tuyển
          </h2>
        </div>

        <span className={styles.jobCount}>
          {company.jobsCount} vị trí
        </span>
      </div>

      <div className={styles.emptyJobs}>
        <div
          className={styles.emptyJobsIcon}
        >
          <BriefcaseIcon />
        </div>

        <h3>
          Danh sách việc làm sẽ được hiển thị ở đây
        </h3>

        <p>
          Hiện tại dữ liệu công ty và dữ liệu việc làm
          chưa được liên kết với nhau trong mock data.
        </p>
      </div>
    </section>
  );
};

export default CompanyJobsCard;
