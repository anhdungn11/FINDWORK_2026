import { useState, useEffect, useRef, useCallback } from "react";
import { adminApi } from "../../services/api/adminApi";
import { companyWorkspaceApi } from "../../services/api/companyWorkspaceApi";
import { canReviewApplications } from "../company/companyWorkspacePermissions";
import { toApiFailure, ApiFailure } from "../../services/api/apiFailure";
import type {
  ReportPeriodKey,
  AdminReportSummaryDto,
  CompanyRecruitmentReportDto,
} from "./reportFormatters";

// ==========================================
// 1. EMPLOYER RECRUITMENT REPORT LOADER
// ==========================================

export interface EmployerReportState {
  report: CompanyRecruitmentReportDto | null;
  loadedCompanyId: string | null;
  loading: boolean;
  error: ApiFailure | null;
}

export interface EmployerReportLoaderOptions {
  getCompanyId: () => string | undefined;
  getMemberRoleNames: () => string[] | undefined;
  onStateChange: (state: EmployerReportState) => void;
  fetchReport?: (
    companyId: string,
    params: { period: ReportPeriodKey; jobId?: string },
    signal: AbortSignal
  ) => Promise<CompanyRecruitmentReportDto>;
}

export class EmployerReportLoader {
  private activeController: AbortController | null = null;
  private requestRevision = 0;
  private state: EmployerReportState = {
    report: null,
    loadedCompanyId: null,
    loading: true,
    error: null,
  };

  constructor(private readonly options: EmployerReportLoaderOptions) {}

  getState(): EmployerReportState {
    return this.state;
  }

  private updateState(partial: Partial<EmployerReportState>): void {
    this.state = { ...this.state, ...partial };
    this.options.onStateChange(this.state);
  }

  handleCompanyChange(): void {
    this.activeController?.abort();
    this.activeController = null;
    this.updateState({
      report: null,
      loadedCompanyId: null,
      loading: true,
      error: null,
    });
  }

  handlePermissionChange(): void {
    const roles = this.options.getMemberRoleNames();
    if (!canReviewApplications(roles)) {
      this.activeController?.abort();
      this.activeController = null;
      this.updateState({
        report: null,
        loadedCompanyId: null,
        loading: false,
        error: new ApiFailure(
          "forbidden",
          403,
          "FORBIDDEN",
          "Tài khoản của bạn không có quyền xem báo cáo ứng tuyển hoặc năng lực chưa được cấp."
        ),
      });
    }
  }

  loadReport(period: ReportPeriodKey, jobId: string): AbortController | null {
    this.activeController?.abort();

    const companyId = this.options.getCompanyId();
    if (!companyId) {
      this.updateState({
        report: null,
        loadedCompanyId: null,
        loading: false,
        error: null,
      });
      return null;
    }

    const roles = this.options.getMemberRoleNames();
    if (!canReviewApplications(roles)) {
      this.updateState({
        report: null,
        loadedCompanyId: null,
        loading: false,
        error: new ApiFailure(
          "forbidden",
          403,
          "FORBIDDEN",
          "Tài khoản của bạn không có quyền xem báo cáo ứng tuyển hoặc năng lực chưa được cấp."
        ),
      });
      return null;
    }

    const controller = new AbortController();
    this.activeController = controller;
    const revision = ++this.requestRevision;
    const targetCompanyId = companyId;

    this.updateState({ loading: true, error: null });

    const fetcher =
      this.options.fetchReport ??
      ((cId, params, sig) => companyWorkspaceApi.getRecruitmentReport(cId, params, sig));

    fetcher(
      targetCompanyId,
      {
        period,
        jobId: jobId !== "ALL" ? jobId : undefined,
      },
      controller.signal
    )
      .then((data) => {
        if (
          !controller.signal.aborted &&
          revision === this.requestRevision &&
          targetCompanyId === this.options.getCompanyId()
        ) {
          this.updateState({
            report: data,
            loadedCompanyId: targetCompanyId,
            error: null,
            loading: false,
          });
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || revision !== this.requestRevision) {
          return;
        }
        this.updateState({
          error: toApiFailure(err),
          loading: false,
        });
      });

    return controller;
  }

  unmount(): void {
    this.activeController?.abort();
    this.activeController = null;
  }
}

export function useEmployerReport(activeCompanyId?: string, memberRoleNames?: string[]) {
  const [state, setState] = useState<EmployerReportState>({
    report: null,
    loadedCompanyId: null,
    loading: true,
    error: null,
  });

  const companyIdRef = useRef(activeCompanyId);
  companyIdRef.current = activeCompanyId;
  const rolesRef = useRef(memberRoleNames);
  rolesRef.current = memberRoleNames;

  const loaderRef = useRef<EmployerReportLoader | null>(null);
  if (!loaderRef.current) {
    loaderRef.current = new EmployerReportLoader({
      getCompanyId: () => companyIdRef.current,
      getMemberRoleNames: () => rolesRef.current,
      onStateChange: (s) => setState(s),
    });
  }

  useEffect(() => {
    loaderRef.current?.handleCompanyChange();
  }, [activeCompanyId]);

  useEffect(() => {
    loaderRef.current?.handlePermissionChange();
  }, [memberRoleNames]);

  useEffect(() => {
    return () => {
      loaderRef.current?.unmount();
    };
  }, []);

  const loadReport = useCallback((period: ReportPeriodKey, jobId: string) => {
    return loaderRef.current?.loadReport(period, jobId) ?? null;
  }, []);

  return {
    ...state,
    loadReport,
  };
}

// ==========================================
// 2. ADMIN PROGRESS REPORT LOADER
// ==========================================

export interface AdminReportState {
  report: AdminReportSummaryDto | null;
  loading: boolean;
  error: ApiFailure | null;
}

export interface AdminReportLoaderOptions {
  onStateChange: (state: AdminReportState) => void;
  fetchReport?: (params: { period: ReportPeriodKey }, signal: AbortSignal) => Promise<AdminReportSummaryDto>;
}

export class AdminReportLoader {
  private activeController: AbortController | null = null;
  private requestRevision = 0;
  private state: AdminReportState = {
    report: null,
    loading: true,
    error: null,
  };

  constructor(private readonly options: AdminReportLoaderOptions) {}

  getState(): AdminReportState {
    return this.state;
  }

  private updateState(partial: Partial<AdminReportState>): void {
    this.state = { ...this.state, ...partial };
    this.options.onStateChange(this.state);
  }

  loadData(period: ReportPeriodKey): AbortController {
    this.activeController?.abort();
    const controller = new AbortController();
    this.activeController = controller;
    const revision = ++this.requestRevision;

    this.updateState({ loading: true, error: null });

    const fetcher =
      this.options.fetchReport ?? ((params, sig) => adminApi.getReportsSummary(params, sig));

    fetcher({ period }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted && revision === this.requestRevision) {
          this.updateState({
            report: data,
            error: null,
            loading: false,
          });
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || revision !== this.requestRevision) {
          return;
        }
        this.updateState({
          error: toApiFailure(err),
          loading: false,
        });
      });

    return controller;
  }

  unmount(): void {
    this.activeController?.abort();
    this.activeController = null;
  }
}

export function useAdminReport() {
  const [state, setState] = useState<AdminReportState>({
    report: null,
    loading: true,
    error: null,
  });

  const loaderRef = useRef<AdminReportLoader | null>(null);
  if (!loaderRef.current) {
    loaderRef.current = new AdminReportLoader({
      onStateChange: (s) => setState(s),
    });
  }

  useEffect(() => {
    return () => {
      loaderRef.current?.unmount();
    };
  }, []);

  const loadData = useCallback((period: ReportPeriodKey) => {
    return loaderRef.current?.loadData(period) ?? new AbortController();
  }, []);

  return {
    ...state,
    loadData,
  };
}
