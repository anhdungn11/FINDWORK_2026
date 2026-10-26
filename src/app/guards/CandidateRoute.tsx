import { Suspense, useEffect } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { UserX } from "lucide-react";
import { useAuthStore, type AuthState } from "../../store/authStore";
import { useEmployerMembership } from "../../features/company/hooks/useEmployerMembership";
import { useI18n } from "../../i18n/i18nStore";

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

export const CandidateRestrictedAccess = () => {
  const t = useI18n((s) => s.t);
  return (
    <main
      style={{ padding: "48px 24px", maxWidth: 640, margin: "8vh auto" }}
      data-testid="candidate-restricted-access"
    >
      <div
        role="alert"
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: "32px 24px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#eff6ff",
            color: "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <UserX size={24} />
        </div>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 8px",
          }}
        >
          {t.access.candidateOnlyTitle}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#64748b",
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          {t.access.candidateOnlyMessage}
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/employer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 18px",
              borderRadius: 8,
              background: "#0284c7",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            {t.access.goToEmployer}
          </Link>
          <Link
            to="/jobs"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 18px",
              borderRadius: 8,
              background: "#f1f5f9",
              color: "#334155",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              border: "1px solid #cbd5e1",
            }}
          >
            {t.access.browseJobs}
          </Link>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 18px",
              borderRadius: 8,
              background: "#ffffff",
              color: "#64748b",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              border: "1px solid #e2e8f0",
            }}
          >
            {t.access.backHome}
          </Link>
        </div>
      </div>
    </main>
  );
};

const CandidateRoute = () => {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const location = useLocation();
  const { isEmployer, loading: membershipLoading } = useEmployerMembership();
  const t = useI18n((s) => s.t);

  useEffect(() => {
    if (status === "idle") void checkAuth();
  }, [status, checkAuth]);

  const routeState = getCandidateRouteState(status, Boolean(user && accessToken));
  if (routeState === "loading" || (routeState === "allowed" && membershipLoading)) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p role="status">
          {status === "loggingOut" ? t.nav.loggingOut : t.access.checkingSession}
        </p>
      </div>
    );
  }
  if (routeState === "denied") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }

  // Employer accounts are not permitted in Candidate Workspace
  if (isEmployer) {
    return <CandidateRestrictedAccess />;
  }

  return (
    <Suspense fallback={<CandidateRouteFallback />}>
      <Outlet />
    </Suspense>
  );
};

export default CandidateRoute;
