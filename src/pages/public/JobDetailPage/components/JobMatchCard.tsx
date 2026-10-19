import { Link } from "react-router-dom";
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
          THÔNG TIN ỨNG TUYỂN
        </span>

        <span className={styles.matchBadge}>
          {job.workplace}
        </span>
      </div>

      <div style={{ margin: "16px 0 12px" }}>
        <strong style={{ fontSize: "1.125rem", color: "var(--color-text-primary)", display: "block" }}>
          {job.type}
        </strong>
        <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
          {job.experience}
        </span>
      </div>

      <p className={styles.matchDescription} style={{ marginBottom: 16 }}>
        Hồ sơ ứng tuyển được nộp trực tuyến qua CV Builder và chuyển tiếp ngay tới nhà tuyển dụng.
      </p>

      <Link
        to={`/jobs/${job.id}/apply`}
        style={{
          display: "block",
          textAlign: "center",
          padding: "10px 16px",
          background: "var(--color-primary)",
          color: "#fff",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "0.9375rem",
        }}
      >
        Nộp đơn ngay
      </Link>
    </div>
  );
};

export default JobMatchCard;
