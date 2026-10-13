import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, FileQuestion, FileText, Plus } from "lucide-react";
import type { Resume } from "../../../resume/types/resume.types";
import { formatDashboardDate } from "../utils/dashboardProgress";
import styles from "../styles/CandidateDashboard.module.css";

interface CvSummaryCardProps {
  resumes: Resume[];
}

export const CvSummaryCard = ({ resumes }: CvSummaryCardProps) => {
  const count = resumes.length;
  const maxCount = 10;
  const recentResumes = resumes.slice(0, 3);

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleArea}>
          <div className={styles.cardIcon}>
            <FileText size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className={styles.cardTitle}>CV Center (Quản lý CV)</h2>
            <p className={styles.cardSubtitle}>
              CV sử dụng để nộp hồ sơ ứng tuyển
            </p>
          </div>
        </div>

        <span className={`${styles.cardBadge} ${count > 0 ? styles.badgeSuccess : styles.badgeMuted}`}>
          {count}/{maxCount} CV
        </span>
      </div>

      {/* Storage Limitation Alert Banner */}
      <aside className={`${styles.noticeBanner} ${styles.noticeWarning}`} role="note">
        <AlertCircle size={16} aria-hidden="true" />
        <div className={styles.noticeText}>
          <strong>Lưu ý về lưu trữ CV:</strong> CV tạo bằng công cụ (Builder) được lưu theo tài khoản trong sessionStorage của trình duyệt. Tệp PDF tải lên chỉ lưu tạm trong bộ nhớ RAM của phiên hiện tại (không lưu bền vững khi làm mới trang hoặc chuyển tài khoản). Dữ liệu chưa được đồng bộ lưu trữ vĩnh viễn trên cơ sở dữ liệu đám mây PostgreSQL.
        </div>
      </aside>

      {count === 0 ? (
        <div className={styles.emptyState}>
          <FileQuestion size={32} className={styles.emptyIcon} aria-hidden="true" />
          <h3 className={styles.emptyTitle}>Chưa có CV nào trong phiên này</h3>
          <p className={styles.emptyDescription}>
            Bạn có thể tạo CV chuyên nghiệp bằng trình tạo CV tích hợp sẵn hoặc tải file PDF từ máy tính của bạn tại CV Center.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            <Link to="/cv/create" className={styles.buttonPrimary}>
              <Plus size={14} aria-hidden="true" />
              Tạo CV mới
            </Link>
            <Link to="/cv" className={styles.buttonSecondary}>
              <FileText size={14} aria-hidden="true" />
              Đến CV Center
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.itemList}>
            {recentResumes.map((resume) => (
              <div key={resume.id} className={styles.itemRow}>
                <div className={styles.itemMeta}>
                  <div className={styles.itemName} title={resume.name}>
                    {resume.name}
                  </div>
                  <div className={styles.itemSub}>
                    <span>
                      {resume.sourceType === "builder" ? "Tạo bằng công cụ" : "Tải lên PDF"}
                    </span>
                    <span>•</span>
                    <span>Cập nhật: {formatDashboardDate(resume.updatedAt)}</span>
                    {resume.isDefault && (
                      <span className={`${styles.cardBadge} ${styles.badgeSuccess} ${styles.buttonSmall}`}>
                        Mặc định
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  to={`/cv/${resume.id}/preview`}
                  className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
                  aria-label={`Xem trước CV ${resume.name}`}
                >
                  <Eye size={13} aria-hidden="true" />
                  Xem
                </Link>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <Link to="/cv" className={styles.buttonSecondary}>
              Xem tất cả ({count} CV)
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </>
      )}
    </article>
  );
};
