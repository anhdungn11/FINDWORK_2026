import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Building2 } from "lucide-react";
import { useAsyncData } from "@/hooks/useAsyncData";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import type { MyCompanyDto } from "@/services/api/apiTypes";
import type { ApiFailure } from "@/services/api/apiFailure";
import { LoadingBlock, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";

interface CompanyWorkspaceValue {
  companies: MyCompanyDto[];
  active: MyCompanyDto | null;
  setActiveId: (id: string) => void;
  reload: () => void;
}

const STORAGE_KEY = "findwork_active_company_id";

function getStoredActiveCompanyId(): string | null {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

function setStoredActiveCompanyId(id: string): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  } catch {
    // Ignore storage quota or security errors
  }
}

const Ctx = createContext<CompanyWorkspaceValue | null>(null);

/** Nạp danh sách công ty mà tài khoản là thành viên (GET /companies/me) — nguồn duy nhất cho workspace. */
export const CompanyWorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { data, error, loading, reload } = useAsyncData((signal) => companyWorkspaceApi.listMine(signal), []);
  const [activeId, setActiveIdState] = useState<string | null>(getStoredActiveCompanyId);

  const setActiveId = (id: string) => {
    setActiveIdState(id);
    setStoredActiveCompanyId(id);
  };

  const value = useMemo<CompanyWorkspaceValue | null>(() => {
    if (!data) return null;
    const active = (activeId ? data.find((c) => c.id === activeId) : null) ?? data[0] ?? null;
    return { companies: data, active, setActiveId, reload };
  }, [data, activeId, reload]);

  if (loading) return <LoadingBlock rows={3} label="Đang tải không gian doanh nghiệp" />;
  if (error) return <ApiErrorState error={error as ApiFailure} onRetry={reload} />;
  if (!value || !value.active) {
    // Khi tài khoản thuần Ứng viên (0 công ty) truy cập các route quản trị doanh nghiệp (/employer/jobs, /employer/applicants...),
    // hiển thị trang thông báo giới hạn quyền thay vì tự động chuyển tiếp tới form tạo công ty.
    if (
      location.pathname.startsWith("/employer/jobs") ||
      location.pathname.startsWith("/employer/applicants") ||
      location.pathname.startsWith("/employer/profile") ||
      location.pathname.startsWith("/employer/members") ||
      location.pathname.startsWith("/employer/locations") ||
      location.pathname === "/employer" ||
      location.pathname === "/employer/"
    ) {
      return (
        <main
          style={{ padding: "48px 24px", maxWidth: 640, margin: "8vh auto" }}
          data-testid="employer-restricted-access"
        >
          <div className={`${ui.state} ${ui.stateError}`} role="alert">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Building2 size={24} color="var(--color-primary, #4f6ef7)" />
              <h1 className={ui.stateTitle} style={{ margin: 0 }}>
                Khu vực dành riêng cho Nhà tuyển dụng
              </h1>
            </div>
            <p className={ui.stateText}>
              Tài khoản hiện tại của bạn chưa tham gia hoặc sở hữu doanh nghiệp nào trên FINDWORK.
              Khu vực quản trị tuyển dụng này chỉ dành cho tài khoản có tư cách doanh nghiệp hợp lệ.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <Link className={`${ui.btn} ${ui.btnPrimary}`} to="/candidate">
                Về không gian ứng viên
              </Link>
              <Link className={ui.btn} to="/employer/onboarding">
                Đăng ký doanh nghiệp mới
              </Link>
              <Link className={ui.btn} to="/jobs">
                Xem việc làm
              </Link>
            </div>
          </div>
        </main>
      );
    }

    return <Navigate to="/employer/onboarding" replace state={{ from: location.pathname }} />;
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCompanyWorkspace = (): CompanyWorkspaceValue & { active: MyCompanyDto } => {
  const v = useContext(Ctx);
  if (!v || !v.active) throw new Error("useCompanyWorkspace phải nằm trong CompanyWorkspaceProvider");
  return v as CompanyWorkspaceValue & { active: MyCompanyDto };
};
