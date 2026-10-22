import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import type { MyCompanyDto } from "@/services/api/apiTypes";

export interface EmployerMembershipState {
  isEmployer: boolean;
  loading: boolean;
  companies: MyCompanyDto[];
}

let cachedUserId: string | null = null;
let cachedCompanies: MyCompanyDto[] = [];
let inFlightPromise: Promise<MyCompanyDto[]> | null = null;

/**
 * Xóa cache phân quyền doanh nghiệp khi đăng xuất hoặc đổi tài khoản.
 */
export const invalidateEmployerMembershipCache = (): void => {
  cachedUserId = null;
  cachedCompanies = [];
  inFlightPromise = null;
};

/**
 * Xác định tư cách Nhà tuyển dụng dựa trên dữ liệu thành viên doanh nghiệp thực tế từ Backend (GET /companies/me).
 * Không sử dụng cờ giả lập ở frontend.
 * - Tài khoản thuần Ứng viên (0 doanh nghiệp): isEmployer = false
 * - Tài khoản Doanh nghiệp (thuộc tối thiểu 1 doanh nghiệp ACTIVE): isEmployer = true
 */
export const useEmployerMembership = (): EmployerMembershipState => {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  const [state, setState] = useState<EmployerMembershipState>(() => {
    if (status !== "authenticated" || !user) {
      return { isEmployer: false, loading: false, companies: [] };
    }
    if (cachedUserId === user.id) {
      const activeCompanies = cachedCompanies.filter((c) => c.status === "ACTIVE");
      return {
        isEmployer: activeCompanies.length > 0,
        loading: false,
        companies: cachedCompanies,
      };
    }
    return { isEmployer: false, loading: true, companies: [] };
  });

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      cachedUserId = null;
      cachedCompanies = [];
      inFlightPromise = null;
      setState({ isEmployer: false, loading: false, companies: [] });
      return;
    }

    if (cachedUserId === user.id) {
      const activeCompanies = cachedCompanies.filter((c) => c.status === "ACTIVE");
      setState({
        isEmployer: activeCompanies.length > 0,
        loading: false,
        companies: cachedCompanies,
      });
      return;
    }

    let active = true;
    setState((prev) => ({ ...prev, loading: true }));

    if (!inFlightPromise) {
      inFlightPromise = companyWorkspaceApi
        .listMine()
        .then((res) => {
          cachedUserId = user.id;
          cachedCompanies = res;
          return res;
        })
        .finally(() => {
          inFlightPromise = null;
        });
    }

    inFlightPromise
      .then((companies) => {
        if (!active) return;
        const activeCompanies = companies.filter((c) => c.status === "ACTIVE");
        setState({
          isEmployer: activeCompanies.length > 0,
          loading: false,
          companies,
        });
      })
      .catch(() => {
        if (!active) return;
        setState({
          isEmployer: false,
          loading: false,
          companies: [],
        });
      });

    return () => {
      active = false;
    };
  }, [status, user]);

  return state;
};
