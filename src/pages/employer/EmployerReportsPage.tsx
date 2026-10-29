import { useEffect, useState, useRef, useCallback } from "react";
import {
  Calendar,
  Download,
  RefreshCw,
  Filter,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { Badge, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import { toApiFailure, ApiFailure } from "@/services/api/apiFailure";
import { canReviewApplications } from "@/features/company/companyWorkspacePermissions";
import type { JobDto } from "@/services/api/apiTypes";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import {
  type CompanyRecruitmentReportDto,
  type ReportPeriodKey,
  REPORT_PERIOD_LABELS,
  buildEmployerReportCsv,
  buildEmployerReportJson,
} from "@/features/reports/reportFormatters";

export function exportEmployerReportToCsv(report: CompanyRecruitmentReportDto): void {
  const csvContent = buildEmployerReportCsv(report);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = (report.companyName || "Employer").replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, "_");
  link.download = `FINDWORK_${safeName}_Bao_cao_tuyen_dung_${report.period.key}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEmployerReportToJson(report: CompanyRecruitmentReportDto): void {
  const payload = buildEmployerReportJson(report);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = (report.companyName || "Employer").replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, "_");
  link.download = `FINDWORK_${safeName}_Bao_cao_tuyen_dung_${report.period.key}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const WritesNotice = () =>
  isWorkspaceWritesEnabled() ? null : (
    <div
      className={`${ui.notice} ${ui.noticeWarn}`}
      role="note"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        borderRadius: 10,
        marginBottom: 24,
      }}
    >
      <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0 }} />
      <div>
        <strong style={{ color: "#92400e" }}>Chế độ bảo vệ dữ liệu (Safe Read-Only Mode):</strong>{" "}
        <span style={{ color: "#78350f" }}>
          Hệ thống đang hoạt động ở chế độ giám sát và trích xuất báo cáo an toàn. Các thao tác ghi dữ liệu doanh nghiệp tạm khóa.
        </span>
      </div>
    </div>
  );

export default function EmployerReportsPage() {
  const { active } = useCompanyWorkspace();
  const activeCompanyId = active?.id;

  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriodKey>("30d");
  const [selectedJobId, setSelectedJobId] = useState<string>("ALL");
  const [jobsList, setJobsList] = useState<JobDto[]>([]);

  const [report, setReport] = useState<CompanyRecruitmentReportDto | null>(null);
  const [loadedCompanyId, setLoadedCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiFailure | null>(null);

  const activeControllerRef = useRef<AbortController | null>(null);
  const requestRevision = useRef(0);

  // 1. Immediately reset state and abort in-flight requests on active company change to prevent cross-company stale data/export
  useEffect(() => {
    activeControllerRef.current?.abort();
    setLoadedCompanyId(null);
    setReport(null);
    setJobsList([]);
    setSelectedJobId("ALL");
    setError(null);
    setLoading(true);
  }, [activeCompanyId]);

  // 2. Fetch jobs list for filter dropdown when active company changes
  useEffect(() => {
    if (!activeCompanyId) return;

    const controller = new AbortController();
    companyWorkspaceApi
      .listJobs(activeCompanyId, { pageSize: 100 }, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) {
          setJobsList(res.data || []);
        }
      })
      .catch(() => {
        // Silently catch job list error; report endpoint is the primary authority
      });

    return () => {
      controller.abort();
    };
  }, [activeCompanyId]);

  // 3. Fetch recruitment report when activeCompanyId, selectedPeriod, or selectedJobId changes
  const loadReport = useCallback(
    (periodToFetch: ReportPeriodKey, jobIdToFetch: string) => {
      activeControllerRef.current?.abort();

      if (!activeCompanyId) {
        setLoading(false);
        setReport(null);
        setLoadedCompanyId(null);
        return null;
      }

      if (!canReviewApplications(active?.memberRoleNames)) {
        setError(
          new ApiFailure(
            "forbidden",
            403,
            "FORBIDDEN",
            "Tài khoản của bạn không có quyền xem báo cáo ứng tuyển hoặc năng lực chưa được cấp."
          )
        );
        setLoading(false);
        setReport(null);
        setLoadedCompanyId(null);
        return null;
      }

      const controller = new AbortController();
      activeControllerRef.current = controller;
      const revision = ++requestRevision.current;
      const targetCompanyId = activeCompanyId;

      setLoading(true);
      setError(null);

      companyWorkspaceApi
        .getRecruitmentReport(
          targetCompanyId,
          {
            period: periodToFetch,
            jobId: jobIdToFetch !== "ALL" ? jobIdToFetch : undefined,
          },
          controller.signal
        )
        .then((data) => {
          if (revision === requestRevision.current && targetCompanyId === activeCompanyId) {
            setReport(data);
            setLoadedCompanyId(targetCompanyId);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || revision !== requestRevision.current) {
            return;
          }
          const apiFailure = toApiFailure(err);
          setError(apiFailure);
        })
        .finally(() => {
          if (revision === requestRevision.current) {
            setLoading(false);
          }
        });

      return controller;
    },
    [activeCompanyId, active?.memberRoleNames]
  );

  useEffect(() => {
    const controller = loadReport(selectedPeriod, selectedJobId);
    return () => {
      controller?.abort();
    };
  }, [loadReport, selectedPeriod, selectedJobId]);

  const isDataReadyForExport = Boolean(report && loadedCompanyId === activeCompanyId && !loading && !error);

  if (!active) {
    return (
      <div style={{ padding: "48px 16px", textAlign: "center" }}>
        <p style={{ color: "#64748b" }}>Vui lòng chọn một doanh nghiệp để xem báo cáo tuyển dụng.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", paddingBottom: 48 }}>
      <PageHeader
        title="Báo cáo tiến độ tuyển dụng"
        subtitle={`Theo dõi tổng quan hiện trạng tin đăng, phễu hồ sơ ứng viên và lịch phỏng vấn của ${active.name}.`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`${ui.btn} ${ui.btnOutline}`}
              onClick={() => loadReport(selectedPeriod, selectedJobId)}
              disabled={loading}
              title="Tải lại số liệu từ máy chủ"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              className={`${ui.btn} ${ui.btnOutline}`}
              onClick={() => report && exportEmployerReportToCsv(report)}
              disabled={!isDataReadyForExport}
              title={isDataReadyForExport ? "Tải xuống báo cáo dạng CSV" : "Đang đồng bộ số liệu doanh nghiệp hiện tại..."}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Download size={15} />
              <span>Xuất CSV</span>
            </button>

            <button
              type="button"
              className={`${ui.btn} ${ui.btnOutline}`}
              onClick={() => report && exportEmployerReportToJson(report)}
              disabled={!isDataReadyForExport}
              title={isDataReadyForExport ? "Tải xuống dữ liệu JSON" : "Đang đồng bộ số liệu doanh nghiệp hiện tại..."}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Download size={15} />
              <span>Xuất JSON</span>
            </button>
          </div>
        }
      />

      <WritesNotice />

      {/* FILTER TOOLBAR (PERIOD & JOB SELECTION) */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {/* PERIOD FILTER */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={18} color="#2563eb" />
            <label htmlFor="employer-period-filter" style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569" }}>
              Chu kỳ:
            </label>
            <select
              id="employer-period-filter"
              aria-label="Chu kỳ báo cáo"
              className={ui.select}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as ReportPeriodKey)}
              style={{ width: "auto", minWidth: 220, fontWeight: 500 }}
            >
              <option value="30d">30 ngày gần nhất (Mặc định)</option>
              <option value="7d">7 ngày gần nhất</option>
              <option value="90d">90 ngày gần nhất</option>
              <option value="all">Toàn bộ thời gian (Tất cả)</option>
            </select>
          </div>

          {/* JOB FILTER */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={18} color="#2563eb" />
            <label htmlFor="employer-job-filter" style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569" }}>
              Tin tuyển dụng:
            </label>
            <select
              id="employer-job-filter"
              aria-label="Lọc theo tin tuyển dụng"
              className={ui.select}
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              style={{ width: "auto", minWidth: 240, maxWidth: 360, fontWeight: 500 }}
            >
              <option value="ALL">Tất cả tin tuyển dụng</option>
              {jobsList.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} ({job.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        <Badge tone="success">Số liệu tổng hợp thực từ máy chủ</Badge>
      </div>

      {/* METRICS VIEW */}
      {loading ? (
        <LoadingBlock rows={5} label="Đang nạp báo cáo tiến độ tuyển dụng từ máy chủ..." />
      ) : error ? (
        <ApiErrorState error={error} onRetry={() => loadReport(selectedPeriod, selectedJobId)} />
      ) : !report ? (
        <div style={{ textAlign: "center", padding: "48px 16px", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <p style={{ color: "#64748b" }}>Không có dữ liệu báo cáo cho doanh nghiệp này.</p>
        </div>
      ) : (
        <>
          {/* SCOPE CLARIFICATION BANNER */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 24,
              fontSize: "0.875rem",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              Phạm vi báo cáo: <strong style={{ color: "#0f172a" }}>{report.companyName}</strong> | Tin tuyển dụng:{" "}
              <strong style={{ color: "#0f172a" }}>{report.jobFilter.title}</strong>
              <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: 2 }}>
                Khoảng thời gian:{" "}
                <strong style={{ color: "#334155" }}>
                  {report.period.startDate ? new Date(report.period.startDate).toLocaleDateString("vi-VN") : "Khởi tạo"} —{" "}
                  {new Date(report.period.endDate).toLocaleDateString("vi-VN")}
                </strong>
                {" "}({REPORT_PERIOD_LABELS[report.period.key as ReportPeriodKey] ?? report.period.key})
              </div>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>
              * Hiện trạng tin & luồng ứng viên là số liệu thực tế thời gian thực (Uncapped Aggregates).
            </div>
          </div>

          {/* SECTION 1: JOBS SUMMARY */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                1. Hiện trạng tin tuyển dụng (Jobs Summary)
              </h2>
              <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: "4px 0 0" }}>
                Thống kê các trạng thái tin tuyển dụng của doanh nghiệp trong cơ sở dữ liệu.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 16,
              }}
            >
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#64748b" }}>TỔNG SỐ TIN</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                  {report.jobsSummary.total}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#16a34a" }}>ĐANG CÔNG KHAI</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
                  {report.jobsSummary.published}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#64748b" }}>BẢN NHÁP (DRAFT)</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                  {report.jobsSummary.draft}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#d97706" }}>TẠM DỪNG (PAUSED)</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#d97706", marginTop: 4 }}>
                  {report.jobsSummary.paused}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#475569" }}>ĐÃ ĐÓNG (CLOSED)</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#475569", marginTop: 4 }}>
                  {report.jobsSummary.closed}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#dc2626" }}>HẾT HẠN (EXPIRED)</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#dc2626", marginTop: 4 }}>
                  {report.jobsSummary.expired}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#94a3b8" }}>LƯU TRỮ (ARCHIVED)</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#94a3b8", marginTop: 4 }}>
                  {report.jobsSummary.archived}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: CANDIDATE PIPELINE */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  2. Phễu ứng viên & Luồng xét duyệt (Application Pipeline)
                </h2>
                <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: "4px 0 0" }}>
                  Phân bố trạng thái thực tế của hồ sơ ứng tuyển và số lượt nộp hồ sơ phát sinh trong chu kỳ.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Nộp trong chu kỳ:</span>
                <Badge tone="info">{report.pipeline.periodSubmissions} hồ sơ</Badge>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 12,
              }}
            >
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>TỔNG HỒ SƠ</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                  {report.pipeline.currentCounts.total}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>BẢN NHÁP</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                  {report.pipeline.currentCounts.DRAFT}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2563eb" }}>MỚI NỘP</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#2563eb", marginTop: 4 }}>
                  {report.pipeline.currentCounts.SUBMITTED}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#d97706" }}>ĐANG XEM XÉT</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d97706", marginTop: 4 }}>
                  {report.pipeline.currentCounts.REVIEWING}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0284c7" }}>ĐÃ CHỌN LỌC</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0284c7", marginTop: 4 }}>
                  {report.pipeline.currentCounts.SHORTLISTED}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#4f46e5" }}>PHỎNG VẤN</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#4f46e5", marginTop: 4 }}>
                  {report.pipeline.currentCounts.INTERVIEW}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#16a34a" }}>ĐỀ NGHỊ (OFFER)</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
                  {report.pipeline.currentCounts.OFFERED}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#dc2626" }}>TỪ CHỐI</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dc2626", marginTop: 4 }}>
                  {report.pipeline.currentCounts.REJECTED}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>RÚT HỒ SƠ</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#64748b", marginTop: 4 }}>
                  {report.pipeline.currentCounts.WITHDRAWN}
                </div>
              </div>
            </div>

            {/* RECRUITMENT OUTCOMES / HIRES (UNAVAILABLE) */}
            <div
              style={{
                marginTop: 16,
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <strong style={{ fontSize: "0.875rem", color: "#334155" }}>Kết quả tuyển dụng hoàn tất (Hires):</strong>{" "}
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>{report.pipeline.hires.note}</span>
              </div>
              <Badge tone="neutral">UNAVAILABLE</Badge>
            </div>
          </div>

          {/* SECTION 3: INTERVIEW SCHEDULING */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                3. Quản lý lịch phỏng vấn (Interviews Summary)
              </h2>
              <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: "4px 0 0" }}>
                Thống kê các buổi phỏng vấn đã thiết lập cho ứng viên, độc lập với giai đoạn hồ sơ hiện tại.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#64748b" }}>TỔNG LỊCH PHỎNG VẤN</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                  {report.interviewsSummary.total}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#2563eb" }}>SẮP TỚI (SCHEDULED)</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#2563eb", marginTop: 4 }}>
                  {report.interviewsSummary.scheduled}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#d97706" }}>ĐÃ DỜI (RESCHEDULED)</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#d97706", marginTop: 4 }}>
                  {report.interviewsSummary.rescheduled}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#16a34a" }}>HOÀN THÀNH (COMPLETED)</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
                  {report.interviewsSummary.completed}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#dc2626" }}>ĐÃ HỦY (CANCELLED)</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#dc2626", marginTop: 4 }}>
                  {report.interviewsSummary.cancelled}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: COMMERCIAL PACKAGE STATUS (EXPLICIT TRACKING) */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
              4. Gói dịch vụ & Hạn mức thương mại (Commercial Package)
            </h2>
            <div
              style={{
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: 12,
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Building2 size={20} color="#64748b" />
                  <div>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#334155", margin: 0 }}>
                      Gói dịch vụ doanh nghiệp
                    </h3>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Chưa triển khai gói dịch vụ thu phí</span>
                  </div>
                </div>
                <Badge tone="neutral">UNAVAILABLE</Badge>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "#64748b", lineHeight: 1.5, margin: "10px 0 0" }}>
                {report.commercialPackage.note}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
