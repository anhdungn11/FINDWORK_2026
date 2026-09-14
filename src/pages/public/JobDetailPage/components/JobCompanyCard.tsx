import type {
  JobDetailRecord,
} from "../types/job-detail.types";

import styles from "../styles/JobDetailSidebar.module.css";

interface JobCompanyCardProps {
  job: JobDetailRecord;
}

const JobCompanyCard = ({
  job,
}: JobCompanyCardProps) => {
  return (
    <div className={styles.companyCard}>
      <span className={styles.sectionLabel}>
        NHÀ TUYỂN DỤNG
      </span>

      <div className={styles.companyHeader}>
        <div className={styles.smallLogo}>
          {job.company.charAt(0)}
        </div>

        <div>
          <strong>{job.company}</strong>
          <span>{job.category}</span>
        </div>
      </div>

      <p>
        Xem thông tin doanh nghiệp và các cơ hội
        việc làm khác đang tuyển dụng.
      </p>
    </div>
  );
};

export default JobCompanyCard;
