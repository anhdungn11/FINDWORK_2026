import { useNavigate, Navigate, Link } from "react-router-dom";
import { LogOut, Home, User, AlertCircle, ArrowRightLeft, Mail, CheckCircle2 } from "lucide-react";
import { useAsyncData } from "@/hooks/useAsyncData";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import type { ApiFailure } from "@/services/api/apiFailure";
import { LoadingBlock, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { CompanyRegistrationOnboarding } from "@/features/company/components/CompanyRegistrationOnboarding";
import { useAuthStore } from "@/store/authStore";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import styles from "@/layouts/EmployerLayout.module.css";
import onboardingStyles from "./EmployerOnboardingPage.module.css";

const EmployerOnboardingPage = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const writes = isWorkspaceWritesEnabled();

  const { data, error, loading, reload } = useAsyncData(
    (signal) => companyWorkspaceApi.listMine(signal),
    []
  );

  const handleLogout = async () => {
    if (await logout()) {
      navigate("/", { replace: true });
    }
  };

  const handleSwitchAccount = async () => {
    if (await logout()) {
      navigate("/employer/login", { replace: true });
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 48, maxWidth: 640, margin: "0 auto" }}>
        <LoadingBlock rows={3} label="Đang kiểm tra dữ liệu doanh nghiệp..." />
      </main>
    );
  }

  if (error) {
    const apiError = error as ApiFailure;
    if (apiError.kind === "forbidden" || apiError.status === 403) {
      return (
        <main style={{ padding: 24, maxWidth: 560, margin: "10vh auto" }} data-testid="employer-forbidden-page">
          <div className={`${ui.state} ${ui.stateError}`} role="alert">
            <h1 className={ui.stateTitle}>Tài khoản hiện tại không có quyền đăng ký doanh nghiệp</h1>
            <p className={ui.stateText}>
              Hệ thống không cho phép tài khoản hiện tại khởi tạo doanh nghiệp mới. Vui lòng đăng xuất và đăng ký một tài khoản nhà tuyển dụng chuyên biệt.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                type="button"
                className={`${ui.btn} ${ui.btnPrimary}`}
                onClick={async () => {
                  await logout();
                  navigate("/employer/register", { replace: true });
                }}
              >
                Đăng ký tài khoản tuyển dụng mới
              </button>
              <Link className={`${ui.btn}`} to="/">
                Về trang chủ
              </Link>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main style={{ padding: 48, maxWidth: 640, margin: "0 auto" }}>
        <ApiErrorState error={apiError} onRetry={reload} />
      </main>
    );
  }

  // If user already owns or belongs to at least one active company, navigate to workspace
  if (data && data.length > 0) {
    return <Navigate to="/employer" replace />;
  }

  return (
    <div className={styles.layout}>
      {/* ONBOARDING TOPBAR */}
      <header className={styles.topbar}>
        <div className={styles.brandGroup}>
          <Link to="/" className={styles.brand}>
            FINDWORK
          </Link>
          <span className={styles.brandTag}>Dành cho nhà tuyển dụng</span>
        </div>

        <span className={styles.spacer} />

        <div className={styles.topbarRight}>
          <Link
            to="/"
            className={styles.viewPublicLink}
            title="Quay về trang chủ FINDWORK"
          >
            <Home size={15} />
            <span>Trang chủ</span>
          </Link>

          <Link
            to="/candidate"
            className={styles.viewPublicLink}
            title="Chuyển sang không gian tìm việc (Ứng viên)"
          >
            <User size={15} />
            <span>Không gian ứng viên</span>
          </Link>

          {user && (
            <div className={styles.accountInfo}>
              <span className={styles.accountEmail} title={user.email}>
                {user.email}
              </span>
              <span className={styles.accountRole}>Chưa có doanh nghiệp</span>
            </div>
          )}

          <button
            type="button"
            className={styles.logoutBtn}
            onClick={handleLogout}
            title="Đăng xuất khỏi tài khoản này"
          >
            <LogOut size={15} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* MAIN ONBOARDING CONTAINER */}
      <main className={onboardingStyles.container}>
        {/* SINGLE COMPACT ENVIRONMENT NOTICE IF WRITES ARE DISABLED */}
        {!writes && (
          <div
            className={onboardingStyles.noticeBanner}
            role="note"
            data-testid="onboarding-writes-disabled-notice"
          >
            <div className={onboardingStyles.noticeHeader}>
              <AlertCircle size={18} color="var(--color-warning, #d97706)" />
              <span>Chế độ chỉ xem (Read-only): Cổng ghi dữ liệu doanh nghiệp đang tạm khóa</span>
            </div>
            <p className={onboardingStyles.noticeText}>
              Trong môi trường thử nghiệm hiện tại, tính năng thành lập doanh nghiệp mới tạm thời không ghi nhận dữ liệu để đảm bảo an toàn hệ thống. Bạn có thể sử dụng các liên kết an toàn dưới đây để tiếp tục trải nghiệm:
            </p>
            <div className={onboardingStyles.noticeActions}>
              <Link className={`${ui.btn} ${ui.btnPrimary}`} to="/">
                Về trang chủ
              </Link>
              <Link className={ui.btn} to="/candidate">
                Không gian tìm việc
              </Link>
              <button
                type="button"
                className={ui.btn}
                onClick={handleSwitchAccount}
              >
                Đăng nhập tài khoản khác
              </button>
            </div>
          </div>
        )}

        {/* BALANCED 2-COLUMN DESKTOP LAYOUT */}
        <div className={onboardingStyles.grid}>
          {/* LEFT COLUMN: IDENTITY & ONBOARDING GUIDANCE */}
          <div className={onboardingStyles.leftPanel}>
            {/* ACCOUNT IDENTITY CARD */}
            <div className={onboardingStyles.accountCard} data-testid="onboarding-account-status">
              <div className={onboardingStyles.accountRow}>
                <div className={onboardingStyles.accountAvatar}>
                  <User size={22} />
                </div>
                <div className={onboardingStyles.accountMeta}>
                  <div className={onboardingStyles.accountLabel}>Tài khoản đang đăng nhập</div>
                  <div className={onboardingStyles.accountEmail} title={user?.email || "Chưa xác định"}>
                    {user?.email || "Chưa xác định"}
                  </div>
                  <div className={onboardingStyles.accountStatusText}>
                    Tài khoản hiện chưa thuộc về hoặc sở hữu doanh nghiệp nào.
                  </div>
                </div>
              </div>

              <div className={onboardingStyles.accountActions}>
                <button
                  type="button"
                  className={ui.btn}
                  style={{ fontSize: "0.8125rem", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
                  onClick={handleSwitchAccount}
                >
                  <ArrowRightLeft size={14} />
                  <span>Đổi tài khoản khác</span>
                </button>
              </div>
            </div>

            {/* VALUE PROPOSITION & STEPS GUIDE */}
            <div className={onboardingStyles.guideCard}>
              <div className={onboardingStyles.guideTitle}>Các bước khởi tạo không gian tuyển dụng</div>
              <ul className={onboardingStyles.guideList}>
                <li className={onboardingStyles.guideItem}>
                  <span className={onboardingStyles.guideStepNumber}>1</span>
                  <div>
                    <strong>Đăng ký tổ chức</strong>: Thiết lập tên doanh nghiệp và đường dẫn định danh thương hiệu độc quyền.
                  </div>
                </li>
                <li className={onboardingStyles.guideItem}>
                  <span className={onboardingStyles.guideStepNumber}>2</span>
                  <div>
                    <strong>Đăng tin tuyển dụng</strong>: Tạo bài tuyển dụng với mô tả, đãi ngộ và câu hỏi sàng lọc hồ sơ.
                  </div>
                </li>
                <li className={onboardingStyles.guideItem}>
                  <span className={onboardingStyles.guideStepNumber}>3</span>
                  <div>
                    <strong>Kết nối nhân sự</strong>: Mời các đồng nghiệp trong phòng HR cùng đánh giá và phỏng vấn ứng viên.
                  </div>
                </li>
              </ul>
            </div>

            {/* INVITATION HELPER BOX */}
            <div className={onboardingStyles.invitationBox}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Mail size={16} color="var(--color-primary, #4f6ef7)" />
                <h4 className={onboardingStyles.invitationTitle}>Bạn được mời tham gia vào doanh nghiệp khác?</h4>
              </div>
              <p className={onboardingStyles.invitationText}>
                Nếu đã nhận được email mời từ quản trị viên, hãy nhấp vào đường dẫn trong thư mời để tham gia trực tiếp vào tổ chức mà không cần tạo doanh nghiệp mới.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: REGISTRATION FORM */}
          <div className={onboardingStyles.rightPanel}>
            <CompanyRegistrationOnboarding
              onCreated={() => {
                navigate("/employer", { replace: true });
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployerOnboardingPage;
