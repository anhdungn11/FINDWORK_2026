import { useNavigate, Navigate, Link } from "react-router-dom";
import { useAsyncData } from "@/hooks/useAsyncData";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import type { ApiFailure } from "@/services/api/apiFailure";
import { LoadingBlock, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { CompanyRegistrationOnboarding } from "@/features/company/components/CompanyRegistrationOnboarding";
import { useAuthStore } from "@/store/authStore";

const EmployerOnboardingPage = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { data, error, loading, reload } = useAsyncData(
    (signal) => companyWorkspaceApi.listMine(signal),
    []
  );

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
    <main>
      <CompanyRegistrationOnboarding
        onCreated={() => {
          navigate("/employer", { replace: true });
        }}
      />
    </main>
  );
};

export default EmployerOnboardingPage;
