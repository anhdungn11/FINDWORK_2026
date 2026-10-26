import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { LoadingBlock, ui } from "@/components/ui";
import { resolveWorkspaceAccess, type WorkspaceKind } from "./accessPolicy";
import { adminApi } from "@/services/api/adminApi";

const RoleRoute = ({ kind }: { kind: WorkspaceKind }) => {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const setAuth = useAuthStore((s) => s.setAuth);
  const location = useLocation();

  const [probingAdmin, setProbingAdmin] = useState(false);
  const [probeFailed, setProbeFailed] = useState(false);

  useEffect(() => {
    if (status === "idle") void checkAuth();
  }, [status, checkAuth]);

  // When visiting /admin: If authenticated with valid token but role is not yet determined
  // (e.g. backend login doesn't embed role in PublicAuthUser), probe real backend admin authorization
  useEffect(() => {
    let active = true;
    if (
      kind === "admin" &&
      status === "authenticated" &&
      user &&
      accessToken &&
      !user.role &&
      !probeFailed &&
      !probingAdmin
    ) {
      setProbingAdmin(true);
      adminApi
        .getDashboard()
        .then(() => {
          if (!active) return;
          // Backend verified SYSTEM scope permissions
          setAuth({ ...user, role: "SUPER_ADMIN" }, accessToken);
        })
        .catch(() => {
          if (!active) return;
          setProbeFailed(true);
        })
        .finally(() => {
          if (active) setProbingAdmin(false);
        });
    }
    return () => {
      active = false;
    };
  }, [kind, status, user, accessToken, probeFailed, probingAdmin, setAuth]);

  const access = resolveWorkspaceAccess(kind, status, user, accessToken);
  if (access === "loading" || probingAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingBlock rows={2} label={probingAdmin ? "Đang xác thực quyền quản trị nền tảng..." : "Đang kiểm tra phiên đăng nhập"} />
      </div>
    );
  }
  if (access === "unauthenticated") {
    const loginTarget = kind === "employer" ? "/employer/login" : "/login";
    return <Navigate to={loginTarget} replace state={{ from: location.pathname + location.search + location.hash }} />;
  }
  if (access === "forbidden" || probeFailed) {
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
