import { Link } from "react-router-dom";
import type { CompanyDetailRecord } from "../types/company-detail.types";
import {
  formatSalary,
  EMPLOYMENT_TYPE_LABEL,
  WORKPLACE_TYPE_LABEL,
  type JobDto,
} from "@/services/api/apiTypes";
import { BriefcaseIcon } from "./CompanyDetailIcons";
import cardStyles from "../styles/CompanyDetailCards.module.css";
import styles from "../styles/CompanyJobsCard.module.css";

interface CompanyJobsCardProps {
  company: CompanyDetailRecord;
  jobs?: JobDto[];
}

const CompanyJobsCard = ({
  company,
  jobs,
}: CompanyJobsCardProps) => {
  const displayCount = jobs ? jobs.length : company.jobsCount;

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
          {displayCount} vị trí
        </span>
      </div>

      {jobs !== undefined ? (
        jobs.length > 0 ? (
          <div className={styles.jobList}>
            {jobs.map((job) => (
              <div key={job.id} className={styles.jobItem}>
                <div className={styles.jobMain}>
                  <h3 className={styles.jobTitle}>
                    <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                  </h3>
                  <div className={styles.jobMeta}>
                    <span className={styles.salary}>{formatSalary(job)}</span>
                    {job.workplaceType && (
                      <span className={styles.tag}>
                        {WORKPLACE_TYPE_LABEL[job.workplaceType] ?? job.workplaceType}
                      </span>
                    )}
                    {job.employmentType && (
                      <span className={styles.tag}>
                        {EMPLOYMENT_TYPE_LABEL[job.employmentType] ?? job.employmentType}
                      </span>
                    )}
                    {job.categoryName && (
                      <span className={styles.tag}>{job.categoryName}</span>
                    )}
                  </div>
                </div>
                <Link to={`/jobs/${job.id}`} className={styles.viewJobBtn}>
                  Xem chi tiết →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyJobs}>
            <div className={styles.emptyJobsIcon}>
              <BriefcaseIcon />
            </div>
            <h3>Hiện tại chưa có tin tuyển dụng nào đang mở</h3>
            <p>
              Doanh nghiệp này hiện chưa đăng tin tuyển dụng đang hoạt động. Vui lòng quay lại sau.
            </p>
          </div>
        )
      ) : (
        <div className={styles.emptyJobs}>
          <div className={styles.emptyJobsIcon}>
            <BriefcaseIcon />
          </div>
          <h3>Danh sách việc làm sẽ được hiển thị ở đây</h3>
          <p>
            Hiện tại dữ liệu công ty và dữ liệu việc làm chưa được liên kết với nhau trong mock data.
          </p>
        </div>
      )}
    </section>
  );
};

export default CompanyJobsCard;
