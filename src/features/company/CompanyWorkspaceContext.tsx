import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAsyncData } from "@/hooks/useAsyncData";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import type { MyCompanyDto } from "@/services/api/apiTypes";
import type { ApiFailure } from "@/services/api/apiFailure";
import { LoadingBlock } from "@/components/ui";
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
