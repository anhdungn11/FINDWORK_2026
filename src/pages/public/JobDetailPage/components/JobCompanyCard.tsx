import { Link } from "react-router-dom";
import { resolveApiUrl } from "@/services/http/apiClient";
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
  const logoUrl = job.companyLogoUrl ? resolveApiUrl(job.companyLogoUrl) : null;
  const companyTarget = job.companyId ? `/companies/${job.companyId}` : null;

  return (
    <div className={styles.companyCard}>
      <span className={styles.sectionLabel}>
        NHÀ TUYỂN DỤNG
      </span>

      <div className={styles.companyHeader}>
        <div className={styles.smallLogo}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={job.company}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            job.company.charAt(0)
          )}
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

      {companyTarget && (
        <div style={{ marginTop: 12 }}>
          <Link
            to={companyTarget}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--color-primary, #0284c7)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Xem hồ sơ công ty &rarr;
          </Link>
        </div>
      )}
    </div>
  );
};

export default JobCompanyCard;
