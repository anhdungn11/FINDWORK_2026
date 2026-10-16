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
  if (access === "loading") return <div style={{ padding: 24 }}><LoadingBlock rows={2} label="Đang kiểm tra phiên đăng nhập" /></div>;
  if (access === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }
  if (access === "forbidden") {
    return (
      <main style={{ padding: 24, maxWidth: 560, margin: "10vh auto" }} data-testid="forbidden-page">
        <div className={`${ui.state} ${ui.stateError}`} role="alert">
          <h1 className={ui.stateTitle}>Bạn không có quyền truy cập khu vực này</h1>
          <p className={ui.stateText}>Tài khoản hiện tại không có quyền quản trị nền tảng. Không có dữ liệu quản trị nào được tải.</p>
          <Link className={`${ui.btn} ${ui.btnPrimary}`} to="/">Về trang chủ</Link>
        </div>
      </main>
    );
  }
  return <Outlet />;
};

export default RoleRoute;
