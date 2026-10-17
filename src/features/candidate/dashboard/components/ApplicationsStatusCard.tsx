import { Link } from "react-router-dom";
import { ArrowRight, Bookmark, Briefcase, Info, Send } from "lucide-react";
import { useSavedJobs } from "@/features/candidate/savedJobs/useSavedJobs";
import styles from "../styles/CandidateDashboard.module.css";

export const ApplicationsStatusCard = () => {
  const { savedCount } = useSavedJobs();

  return (
    <article className={styles.card} aria-labelledby="applications-status-title">
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleArea}>
          <div className={styles.cardIcon}>
            <Briefcase size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 id="applications-status-title" className={styles.cardTitle}>
              Hoạt động ứng tuyển & Việc làm quan tâm
            </h2>
            <p className={styles.cardSubtitle}>
              Quản lý việc làm đã lưu và theo dõi các đơn ứng tuyển của bạn
            </p>
          </div>
        </div>

        <span className={`${styles.cardBadge} ${styles.badgeSuccess}`}>
          Đã kết nối
        </span>
      </div>

      <aside className={`${styles.noticeBanner} ${styles.noticeInfo}`} role="note">
        <Info size={16} aria-hidden="true" />
        <div className={styles.noticeText}>
          <strong>Không gian ứng viên:</strong> Bạn có thể lưu các vị trí phù hợp vào danh sách <em>Việc làm đã lưu</em> và theo dõi tình trạng hồ sơ tại <em>Lịch sử ứng tuyển</em>. Tính năng nộp hồ sơ đã được kết nối với backend API.
        </div>
      </aside>

      <div className={styles.emptyState} style={{ padding: "1.5rem 1rem" }}>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", width: "100%" }}>
          <Link to="/candidate/saved-jobs" className={styles.buttonPrimary} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Bookmark size={16} aria-hidden="true" />
            Việc làm đã lưu ({savedCount})
          </Link>

          <Link to="/candidate/applications" className={styles.buttonSecondary} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Send size={16} aria-hidden="true" />
            Lịch sử ứng tuyển
          </Link>

          <Link to="/jobs" className={styles.buttonSecondary} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            Khám phá việc làm
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
};
