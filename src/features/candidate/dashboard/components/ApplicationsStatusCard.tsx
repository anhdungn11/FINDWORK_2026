import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Info } from "lucide-react";
import styles from "../styles/CandidateDashboard.module.css";

export const ApplicationsStatusCard = () => {
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
              Theo dõi trạng thái tìm việc và các tin tuyển dụng bạn quan tâm
            </p>
          </div>
        </div>

        <span className={`${styles.cardBadge} ${styles.badgeMuted}`}>
          Chưa hỗ trợ nộp trực tuyến
        </span>
      </div>

      <aside className={`${styles.noticeBanner} ${styles.noticeInfo}`} role="note">
        <Info size={16} aria-hidden="true" />
        <div className={styles.noticeText}>
          <strong>Trạng thái hệ thống:</strong> Bạn có thể tìm kiếm và xem danh sách tin tuyển dụng trên sàn FINDWORK. Chức năng nộp hồ sơ ứng tuyển trực tuyến và lưu việc làm (Saved Jobs) hiện chưa được backend hỗ trợ tại phiên bản này. Bảng điều khiển cam kết không hiển thị KPI hay dữ liệu giả lập.
        </div>
      </aside>

      <div className={styles.emptyState}>
        <h3 className={styles.emptyTitle}>Chức năng nộp hồ sơ trực tuyến chưa khả dụng</h3>
        <p className={styles.emptyDescription}>
          Hiện tại bạn có thể khám phá và xem chi tiết các tin tuyển dụng đang mở trên FINDWORK để nắm bắt yêu cầu thị trường. Tính năng nộp hồ sơ ứng tuyển trực tuyến đang trong lộ trình phát triển của backend.
        </p>

        <Link to="/jobs" className={styles.buttonSecondary}>
          Xem danh sách việc làm
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
};
