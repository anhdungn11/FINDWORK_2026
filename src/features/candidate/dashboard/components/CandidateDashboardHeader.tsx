import { Link } from "react-router-dom";
import { Briefcase, Building2, FileText, Sparkles, User as UserIcon } from "lucide-react";
import type { AuthUser } from "../../../../store/authStore";
import { formatUserRole, formatUserStatus } from "../utils/dashboardProgress";
import styles from "../styles/CandidateDashboard.module.css";

interface CandidateDashboardHeaderProps {
  user: AuthUser;
  displayName: string;
}

export const CandidateDashboardHeader = ({
  user,
  displayName,
}: CandidateDashboardHeaderProps) => {
  const greeting = displayName
    ? `Chào mừng trở lại, ${displayName}!`
    : "Chào mừng bạn đến với FINDWORK!";

  const formattedRole = formatUserRole(user.role);
  const formattedStatus = formatUserStatus(user.status);
  const isActiveStatus = (user.status ?? "").trim().toUpperCase() === "ACTIVE";

  return (
    <header className={styles.headerCard}>
      <div className={styles.headerMain}>
        <span className={styles.headerEyebrow}>
          <Sparkles size={14} aria-hidden="true" />
          Không gian ứng viên
        </span>

        <h1 className={styles.headerTitle}>{greeting}</h1>

        <p className={styles.headerSubtitle}>
          Quản lý tiến độ hoàn thiện hồ sơ, chuẩn bị CV và sẵn sàng tiếp cận các cơ hội việc làm đa ngành trên toàn quốc.
        </p>

        <div className={styles.userBadgeList}>
          <span className={styles.userBadge}>
            <UserIcon size={12} aria-hidden="true" />
            {user.email}
          </span>

          {formattedRole && (
            <span className={styles.userBadge}>
              <Briefcase size={12} aria-hidden="true" />
              {formattedRole}
            </span>
          )}

          {formattedStatus && (
            <span
              className={`${styles.userBadge} ${
                isActiveStatus ? styles.userBadgeSuccess : ""
              }`}
            >
              {formattedStatus}
            </span>
          )}
        </div>
      </div>

      <div className={styles.headerActions}>
        <Link
          to="/employer"
          className={styles.buttonSecondary}
          title="Chuyển sang không gian nhà tuyển dụng để quản lý doanh nghiệp và tin tuyển dụng"
        >
          <Building2 size={15} aria-hidden="true" />
          Tuyển dụng
        </Link>
        <Link to="/cv" className={styles.buttonSecondary}>
          <FileText size={15} aria-hidden="true" />
          CV của tôi
        </Link>
        <Link to="/jobs" className={styles.buttonPrimary}>
          <Briefcase size={15} aria-hidden="true" />
          Tìm việc làm
        </Link>
      </div>
    </header>
  );
};
