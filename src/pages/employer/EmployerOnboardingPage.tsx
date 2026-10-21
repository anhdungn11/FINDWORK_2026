import { useNavigate, Navigate, Link } from "react-router-dom";
import { LogOut, Home, User } from "lucide-react";
import { useAsyncData } from "@/hooks/useAsyncData";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import type { ApiFailure } from "@/services/api/apiFailure";
import { LoadingBlock, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { CompanyRegistrationOnboarding } from "@/features/company/components/CompanyRegistrationOnboarding";
import { useAuthStore } from "@/store/authStore";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import styles from "@/layouts/EmployerLayout.module.css";

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

      {/* MAIN ONBOARDING BODY */}
      <main style={{ maxWidth: 680, margin: "32px auto", padding: "0 16px", width: "100%" }}>
        {/* CONTEXT INFORMATION CARD */}
        <div
          style={{
            marginBottom: 20,
            padding: "16px 20px",
            background: "var(--color-surface, #ffffff)",
            border: "1px solid var(--color-border, #e2e8f0)",
            borderRadius: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
          data-testid="onboarding-account-status"
        >
          <div>
            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary, #64748b)" }}>
              Tài khoản đang đăng nhập:
            </div>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary, #1e293b)" }}>
              {user?.email || "Chưa xác định"}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary, #64748b)", marginTop: 2 }}>
              Tài khoản hiện chưa thuộc về hoặc sở hữu doanh nghiệp nào.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className={ui.btn}
              style={{ fontSize: "0.8125rem", padding: "6px 12px" }}
              onClick={handleSwitchAccount}
            >
              Đổi tài khoản khác
            </button>
          </div>
        </div>

        {/* READ-ONLY GATE GUIDANCE */}
        {!writes && (
          <div
            className={`${ui.notice} ${ui.noticeWarn}`}
            role="note"
            data-testid="onboarding-writes-disabled-notice"
            style={{ marginBottom: 20, padding: "16px 20px" }}
          >
            <strong style={{ display: "block", marginBottom: 6 }}>
              Chế độ chỉ xem (Read-only): Cổng ghi dữ liệu doanh nghiệp đang khóa
            </strong>
            <p style={{ margin: "0 0 12px", lineHeight: 1.5, fontSize: "0.875rem" }}>
              Trong môi trường kiểm thử này, tính năng tạo doanh nghiệp mới tạm thời bị vô hiệu hóa
              (<code>VITE_ENABLE_WORKSPACE_WRITES=false</code>) để bảo toàn dữ liệu. Bạn có thể sử dụng các liên kết an toàn dưới đây để điều hướng:
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className={`${ui.btn} ${ui.btnPrimary}`} to="/">
                Về trang chủ
              </Link>
              <Link className={`${ui.btn}`} to="/candidate">
                Không gian tìm việc
              </Link>
              <button
                type="button"
                className={`${ui.btn}`}
                onClick={handleSwitchAccount}
              >
                Đăng nhập tài khoản khác
              </button>
            </div>
          </div>
        )}

        <CompanyRegistrationOnboarding
          onCreated={() => {
            navigate("/employer", { replace: true });
          }}
        />
      </main>
    </div>
  );
};

export default EmployerOnboardingPage;
