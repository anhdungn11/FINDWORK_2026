import { useEffect } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { LoadingBlock, ui } from "@/components/ui";
import { resolveWorkspaceAccess, type WorkspaceKind } from "./accessPolicy";

const RoleRoute = ({ kind }: { kind: WorkspaceKind }) => {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const location = useLocation();

  useEffect(() => {
    if (status === "idle") void checkAuth();
  }, [status, checkAuth]);

  const access = resolveWorkspaceAccess(kind, status, user, accessToken);
  if (access === "loading") {
    return (
      <div style={{ padding: 24 }}>
        <LoadingBlock rows={2} label="Đang kiểm tra phiên đăng nhập" />
      </div>
    );
  }
  if (access === "unauthenticated") {
    const loginTarget = kind === "employer" ? "/employer/login" : "/login";
    return <Navigate to={loginTarget} replace state={{ from: location.pathname + location.search + location.hash }} />;
  }
  if (access === "forbidden") {
    return (
      <main style={{ padding: 24, maxWidth: 560, margin: "10vh auto" }} data-testid="forbidden-page">
        <div className={`${ui.state} ${ui.stateError}`} role="alert">
          <h2>Từ chối truy cập</h2>
          <p>Tài khoản của bạn không có quyền truy cập vào khu vực làm việc này.</p>
          <div style={{ marginTop: 16 }}>
            <Link to="/" className={ui.btn}>Về trang chủ</Link>
          </div>
        </div>
      </main>
    );
  }

  return <Outlet />;
};

export default RoleRoute;
