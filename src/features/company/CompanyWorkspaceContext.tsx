import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useAsyncData } from "@/hooks/useAsyncData";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import type { MyCompanyDto } from "@/services/api/apiTypes";
import type { ApiFailure } from "@/services/api/apiFailure";
import { LoadingBlock, EmptyState } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";

interface CompanyWorkspaceValue {
  companies: MyCompanyDto[];
  active: MyCompanyDto | null;
  setActiveId: (id: string) => void;
}

const Ctx = createContext<CompanyWorkspaceValue | null>(null);

/** Nạp danh sách công ty mà tài khoản là thành viên (GET /companies/me) — nguồn duy nhất cho workspace. */
export const CompanyWorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { data, error, loading, reload } = useAsyncData((signal) => companyWorkspaceApi.listMine(signal), []);
  const [activeId, setActiveId] = useState<string | null>(null);

  const value = useMemo<CompanyWorkspaceValue | null>(() => {
    if (!data) return null;
    const active = data.find((c) => c.id === activeId) ?? data[0] ?? null;
    return { companies: data, active, setActiveId };
  }, [data, activeId]);

  if (loading) return <LoadingBlock rows={3} label="Đang tải không gian doanh nghiệp" />;
  if (error) return <ApiErrorState error={error as ApiFailure} onRetry={reload} />;
  if (!value || !value.active) {
    return (
      <EmptyState
        title="Tài khoản chưa thuộc doanh nghiệp nào"
        text="Bạn chưa là thành viên của công ty nào. Hãy chấp nhận lời mời từ chủ doanh nghiệp hoặc liên hệ quản trị viên. Chức năng tạo doanh nghiệp mới chưa có giao diện trong phiên bản này."
        actionLabel="Về trang chủ"
        actionTo="/"
      />
    );
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCompanyWorkspace = (): CompanyWorkspaceValue & { active: MyCompanyDto } => {
  const v = useContext(Ctx);
  if (!v || !v.active) throw new Error("useCompanyWorkspace phải nằm trong CompanyWorkspaceProvider");
  return v as CompanyWorkspaceValue & { active: MyCompanyDto };
};
