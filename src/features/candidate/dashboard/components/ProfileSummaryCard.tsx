import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Info,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  UserX,
} from "lucide-react";
import type { AuthUser } from "../../../../store/authStore";
import type {
  CandidateProfileState,
  DashboardProgressResult,
} from "../types/dashboard.types";
import {
  formatCareerStatus,
  formatDashboardDate,
  formatUserRole,
} from "../utils/dashboardProgress";
import styles from "../styles/CandidateDashboard.module.css";

interface ProfileSummaryCardProps {
  user: AuthUser;
  progress: DashboardProgressResult;
  profileState: CandidateProfileState;
  onRetryProfile?: () => void;
}

export const ProfileSummaryCard = ({
  user,
  progress,
  profileState,
  onRetryProfile,
}: ProfileSummaryCardProps) => {
  const { status, profile, errorMessage } = profileState;

  return (
    <article className={styles.card} aria-labelledby="profile-summary-title">
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleArea}>
          <div className={styles.cardIcon}>
            <UserIcon size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 id="profile-summary-title" className={styles.cardTitle}>
              Hồ sơ ứng viên
            </h2>
            <p className={styles.cardSubtitle}>
              Trạng thái hồ sơ chính thức kết nối từ hệ thống máy chủ
            </p>
          </div>
        </div>

        {/* State Badge */}
        {status === "loading" && (
          <span className={`${styles.cardBadge} ${styles.badgeMuted}`}>
            <Clock size={12} aria-hidden="true" />
            Đang kiểm tra
          </span>
        )}
        {status === "exists" && (
          <span className={`${styles.cardBadge} ${styles.badgeSuccess}`}>
            <CheckCircle2 size={12} aria-hidden="true" />
            Đã tạo hồ sơ
          </span>
        )}
        {status === "not_created" && (
          <span className={`${styles.cardBadge} ${styles.badgeDraft}`}>
            Chưa tạo hồ sơ
          </span>
        )}
        {status === "forbidden" && (
          <span className={`${styles.cardBadge} ${styles.badgeWarning}`}>
            <ShieldAlert size={12} aria-hidden="true" />
            Không đủ quyền
          </span>
        )}
        {status === "error" && (
          <span className={`${styles.cardBadge} ${styles.badgeError}`}>
            <AlertTriangle size={12} aria-hidden="true" />
            Lỗi kết nối
          </span>
        )}
      </div>

      {/* Basic Account Info Row */}
      <div className={styles.infoRowList}>
        <div className={styles.infoPair}>
          <span className={styles.infoLabel}>Tài khoản email</span>
          <span className={styles.infoValue}>{user.email}</span>
        </div>
        {user.role && (
          <div className={styles.infoPair}>
            <span className={styles.infoLabel}>Vai trò tài khoản</span>
            <span className={styles.infoValue}>{formatUserRole(user.role)}</span>
          </div>
        )}

        {status === "exists" && profile && (
          <>
            <div className={styles.infoPair}>
              <span className={styles.infoLabel}>Họ và tên hồ sơ</span>
              <span className={styles.infoValue}>{profile.fullName}</span>
            </div>
            <div className={styles.infoPair}>
              <span className={styles.infoLabel}>Trạng thái hồ sơ</span>
              <span className={styles.infoValue}>Đã tạo trên hệ thống</span>
            </div>
            <div className={styles.infoPair}>
              <span className={styles.infoLabel}>Trạng thái tìm việc</span>
              <span className={styles.infoValue}>
                {formatCareerStatus(profile.careerStatus)}
              </span>
            </div>
            <div className={styles.infoPair}>
              <span className={styles.infoLabel}>Tỉnh / Thành phố</span>
              <span className={styles.infoValue}>
                {profile.province?.name || (profile.provinceId ? "Đã lưu địa chỉ" : "Chưa cập nhật")}
              </span>
            </div>
            <div className={styles.infoPair}>
              <span className={styles.infoLabel}>Quyền riêng tư</span>
              <span className={styles.infoValue}>
                {profile.privacySetting
                  ? profile.privacySetting.searchableProfile
                    ? "Cho phép nhà tuyển dụng tìm kiếm hồ sơ"
                    : "Không cho phép tìm kiếm hồ sơ"
                  : "Mặc định hệ thống"}
              </span>
            </div>
            <div className={styles.infoPair}>
              <span className={styles.infoLabel}>Cập nhật gần nhất</span>
              <span className={styles.infoValue}>
                {formatDashboardDate(profile.updatedAt)}
              </span>
            </div>
          </>
        )}

        {status === "not_created" && (
          <div className={styles.infoPair}>
            <span className={styles.infoLabel}>Trạng thái hồ sơ</span>
            <span className={styles.infoValue}>Chưa tạo hồ sơ chính thức (404 Not Found)</span>
          </div>
        )}

        {status === "forbidden" && (
          <div className={styles.infoPair}>
            <span className={styles.infoLabel}>Quyền truy cập</span>
            <span className={styles.infoValue}>Thiếu quyền profile.view (403 Forbidden)</span>
          </div>
        )}
      </div>

      {/* Status-specific Views */}

      {/* Case 1: Loading State */}
      {status === "loading" && (
        <div
          role="status"
          aria-live="polite"
          style={{ padding: "1.5rem", textAlign: "center", color: "var(--color-text-secondary, #64748b)" }}
        >
          <span>Đang xác thực thông tin hồ sơ từ máy chủ...</span>
        </div>
      )}

      {/* Case 2: Profile Exists */}
      {status === "exists" && profile && (
        <>
          <aside className={`${styles.noticeBanner} ${styles.noticeInfo}`} role="note">
            <Info size={16} aria-hidden="true" />
            <div className={styles.noticeText}>
              <strong>Ghi chú kỹ thuật:</strong> Hồ sơ ứng viên đã được tạo thành công trong hệ thống. Hệ thống backend hiện lưu trữ hồ sơ theo mô hình dữ liệu chuẩn (không có cờ trạng thái xuất bản công khai).
            </div>
          </aside>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <Link to="/candidate/profile" className={styles.buttonPrimary}>
              <ShieldCheck size={14} aria-hidden="true" />
              Xem & chỉnh sửa hồ sơ
            </Link>
            <Link to="/candidate/onboarding" className={styles.buttonSecondary}>
              <ArrowRight size={14} aria-hidden="true" />
              Xem bản nháp Onboarding
            </Link>
          </div>
        </>
      )}

      {/* Case 3: Profile Not Created (Confirmed 404 from backend contract) */}
      {status === "not_created" && (
        <div className={styles.emptyState}>
          <UserX size={32} className={styles.emptyIcon} aria-hidden="true" />
          <h3 className={styles.emptyTitle}>Chưa có hồ sơ ứng viên chính thức</h3>
          <p className={styles.emptyDescription}>
            Hệ thống xác nhận tài khoản chưa có bản ghi hồ sơ ứng viên. Bạn có thể chuẩn bị thông tin thông qua quy trình Onboarding 7 bước trước khi khởi tạo hồ sơ.
          </p>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            <Link to="/candidate/onboarding" className={styles.buttonPrimary}>
              {progress.category === "not_started"
                ? "Bắt đầu Onboarding"
                : "Tiếp tục hoàn thiện bản nháp"}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      {/* Case 4: Forbidden (403 from backend PermissionGuard) */}
      {status === "forbidden" && (
        <aside className={`${styles.noticeBanner} ${styles.noticeWarning}`} role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <div className={styles.noticeText}>
            <strong>Truy cập bị từ chối (HTTP 403):</strong> Tài khoản hiện tại chưa được cấp quyền xem hồ sơ ứng viên (thiếu quyền <code>profile.view</code>). Điều này không có nghĩa là hồ sơ chưa tồn tại. Vui lòng kiểm tra vai trò tài khoản hoặc liên hệ quản trị viên.
          </div>
        </aside>
      )}

      {/* Case 5: Network or Server Error (500 / offline) */}
      {status === "error" && (
        <div>
          <aside className={`${styles.noticeBanner} ${styles.noticeError}`} role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <div className={styles.noticeText}>
              <strong>Lỗi kiểm tra hồ sơ:</strong> Không thể xác minh hồ sơ ứng viên do sự cố kết nối hoặc máy chủ ({errorMessage || "Lỗi mạng"}).
            </div>
          </aside>

          {onRetryProfile && (
            <button
              type="button"
              onClick={onRetryProfile}
              className={styles.buttonSecondary}
              style={{ marginTop: "0.5rem" }}
            >
              <RefreshCw size={14} aria-hidden="true" />
              Thử lại kiểm tra hồ sơ
            </button>
          )}
        </div>
      )}
    </article>
  );
};
