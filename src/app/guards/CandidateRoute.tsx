import { Suspense, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore, type AuthState } from "../../store/authStore";

export const getCandidateRouteState = (
  status: AuthState["status"],
  hasSession: boolean,
): "loading" | "allowed" | "denied" => {
  if (status === "idle" || status === "loading" || status === "loggingOut") return "loading";
  return status === "authenticated" && hasSession ? "allowed" : "denied";
};

const CandidateRouteFallback = () => (
  <div style={{ padding: "48px 16px", textAlign: "center" }}>
    <p role="status">Đang tải trang...</p>
  </div>
);

const CandidateRoute = () => {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const location = useLocation();

  useEffect(() => {
    if (status === "idle") void checkAuth();
  }, [status, checkAuth]);

  const routeState = getCandidateRouteState(status, Boolean(user && accessToken));
  if (routeState === "loading") {
    return <p role="status">{status === "loggingOut" ? "Đang đăng xuất..." : "Đang kiểm tra phiên đăng nhập..."}</p>;
  }
  if (routeState === "denied") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }
  return (
    <Suspense fallback={<CandidateRouteFallback />}>
      <Outlet />
    </Suspense>
  );
};

export default CandidateRoute;
