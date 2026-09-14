import type {
  JobDetailRecord,
} from "../types/job-detail.types";

import styles from "../styles/JobDetailSidebar.module.css";

interface JobMatchCardProps {
  job: JobDetailRecord;
}

const JobMatchCard = ({
  job,
}: JobMatchCardProps) => {
  return (
    <div className={styles.matchCard}>
      <div className={styles.matchTop}>
        <span className={styles.sectionLabel}>
          FINDWORK MATCH
        </span>

        <span className={styles.matchBadge}>
          Gợi ý
        </span>
      </div>

      <div className={styles.matchScore}>
        <strong>{job.matchScore}%</strong>
        <span>phù hợp</span>
      </div>

      <div className={styles.progressTrack}>
        <div
          className={styles.progressBar}
          style={{
            width: `${job.matchScore}%`,
          }}
        />
      </div>

      <p className={styles.matchDescription}>
        Điểm phù hợp hiện đang được mô phỏng từ
        dữ liệu mẫu và sẽ được tính từ hồ sơ ứng
        viên khi hệ thống hoàn thiện.
      </p>
    </div>
  );
};

export default JobMatchCard;
