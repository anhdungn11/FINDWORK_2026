import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Download,
  RefreshCw,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
} from "lucide-react";
import { Badge, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import { apiClient } from "@/services/http/apiClient";
import { toApiFailure, type ApiFailure } from "@/services/api/apiFailure";
import { canReviewApplications } from "@/features/company/companyWorkspacePermissions";
import type { JobDto } from "@/services/api/apiTypes";
import {
  type EmployerJobCountsSummary,
  type PipelineSummary,
  type InterviewSummary,
  buildEmployerReportCsv,
  buildEmployerReportJson,
} from "@/features/reports/reportFormatters";

export function exportEmployerReportToCsv(params: {
  companyName: string;
  selectedJobTitle: string;
  jobCounts: EmployerJobCountsSummary;
  pipeline: PipelineSummary | null;
  interviews: InterviewSummary | null;
}): void {
  const csvContent = buildEmployerReportCsv(params);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FINDWORK_Employer_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEmployerReportToJson(params: {
  companyId: string;
  companyName: string;
  selectedJobId: string | null;
  selectedJobTitle: string;
  jobCounts: EmployerJobCountsSummary;
  pipeline: PipelineSummary | null;
  interviews: InterviewSummary | null;
}): void {
  const payload = buildEmployerReportJson(params);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FINDWORK_Employer_Report_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function EmployerReportsPage() {
  const { active } = useCompanyWorkspace();

  // Company tracking to prevent stale state / cross-company exports
  const [loadedCompanyId, setLoadedCompanyId] = useState<string | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<string>("ALL");
  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [jobCounts, setJobCounts] = useState<EmployerJobCountsSummary | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<ApiFailure | null>(null);

  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
  const [interviews, setInterviews] = useState<InterviewSummary | null>(null);
  const [aggregateAvailable, setAggregateAvailable] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<ApiFailure | null>(null);

  const activeCompanyId = active?.id;

  // Reset and load data when active company changes
  useEffect(() => {
    // 1. Immediately clear previous-company state
    setLoadedCompanyId(null);
    setJobs([]);
    setJobCounts(null);
    setPipeline(null);
    setInterviews(null);
    setSelectedJobId("ALL");
    setAggregateAvailable(false);
    setJobsError(null);
    setMetricsError(null);

    if (!activeCompanyId) {
      setJobsLoading(false);
      setMetricsLoading(false);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const loadCompanyData = async () => {
      setJobsLoading(true);
      setJobsError(null);

      try {
        // Fetch verified total counts using database pagination totals for all statuses
        const [totalRes, pubRes, draftRes, pausedRes, closedRes, listRes] = await Promise.all([
          companyWorkspaceApi.listJobs(activeCompanyId, { pageSize: 1 }, signal),
          companyWorkspaceApi.listJobs(activeCompanyId, { status: "PUBLISHED", pageSize: 1 }, signal),
          companyWorkspaceApi.listJobs(activeCompanyId, { status: "DRAFT", pageSize: 1 }, signal),
          companyWorkspaceApi.listJobs(activeCompanyId, { status: "PAUSED", pageSize: 1 }, signal),
          companyWorkspaceApi.listJobs(activeCompanyId, { status: "CLOSED", pageSize: 1 }, signal),
          companyWorkspaceApi.listJobs(activeCompanyId, { pageSize: 100 }, signal),
        ]);

        if (signal.aborted) return;

        setJobCounts({
          total: totalRes.pagination.total,
          published: pubRes.pagination.total,
          draft: draftRes.pagination.total,
          paused: pausedRes.pagination.total,
          closed: closedRes.pagination.total,
        });

        setJobs(listRes.data || []);
        setLoadedCompanyId(activeCompanyId);
      } catch (err) {
        if (signal.aborted) return;
        setJobsError(toApiFailure(err));
      } finally {
        if (!signal.aborted) {
          setJobsLoading(false);
        }
      }
    };

    loadCompanyData();

    return () => {
      controller.abort();
    };
  }, [activeCompanyId]);

  // Load aggregates when loadedCompanyId, selectedJobId, or role permissions change
  useEffect(() => {
    if (!activeCompanyId || loadedCompanyId !== activeCompanyId) return;

    if (!canReviewApplications(active.memberRoleNames)) {
      setPipeline(null);
      setInterviews(null);
      setAggregateAvailable(false);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const loadAggregates = async () => {
      setMetricsLoading(true);
      setMetricsError(null);

      try {
        const queryParams = selectedJobId !== "ALL" ? `?jobId=${encodeURIComponent(selectedJobId)}` : "";
        const res = await apiClient.get(
          `/companies/${encodeURIComponent(activeCompanyId)}/reports/recruitment${queryParams}`,
          { signal }
        );

        if (signal.aborted) return;

        if (res.data?.pipeline?.currentCounts) {
          setPipeline(res.data.pipeline.currentCounts);
          setInterviews(res.data.interviewsSummary ?? null);
          setAggregateAvailable(true);
        } else {
          setAggregateAvailable(false);
        }
      } catch (err: unknown) {
        if (signal.aborted) return;
        const apiFailure = toApiFailure(err);

        // If the error is 403 Forbidden, do NOT swallow: record permission failure
        if (apiFailure.status === 403) {
          setMetricsError(apiFailure);
          setAggregateAvailable(false);
        } else if (apiFailure.status === 404 || apiFailure.status === 501) {
          // Aggregate endpoint not yet implemented on the server
          setAggregateAvailable(false);
          setMetricsError(null);
        } else {
          setMetricsError(apiFailure);
        }
      } finally {
        if (!signal.aborted) {
          setMetricsLoading(false);
        }
      }
    };

    loadAggregates();

    return () => {
      controller.abort();
    };
  }, [activeCompanyId, loadedCompanyId, selectedJobId, active.memberRoleNames]);

  const selectedJobTitle = useMemo(() => {
    if (selectedJobId === "ALL") return "Tất cả tin tuyển dụng";
    const found = jobs.find((j) => j.id === selectedJobId);
    return found ? found.title : "Tin tuyển dụng đã chọn";
  }, [selectedJobId, jobs]);

  const handleRefresh = () => {
    if (!activeCompanyId) return;
    setLoadedCompanyId(null);
    setJobCounts(null);
    setJobsLoading(true);

    companyWorkspaceApi
      .listJobs(activeCompanyId, { pageSize: 1 })
      .then(async (totalRes) => {
        const [pubRes, draftRes, pausedRes, closedRes, listRes] = await Promise.all([
          companyWorkspaceApi.listJobs(activeCompanyId, { status: "PUBLISHED", pageSize: 1 }),
          companyWorkspaceApi.listJobs(activeCompanyId, { status: "DRAFT", pageSize: 1 }),
          companyWorkspaceApi.listJobs(activeCompanyId, { status: "PAUSED", pageSize: 1 }),
          companyWorkspaceApi.listJobs(activeCompanyId, { status: "CLOSED", pageSize: 1 }),
          companyWorkspaceApi.listJobs(activeCompanyId, { pageSize: 100 }),
        ]);

        setJobCounts({
          total: totalRes.pagination.total,
          published: pubRes.pagination.total,
          draft: draftRes.pagination.total,
          paused: pausedRes.pagination.total,
          closed: closedRes.pagination.total,
        });
        setJobs(listRes.data || []);
        setLoadedCompanyId(activeCompanyId);
      })
      .catch((err) => setJobsError(toApiFailure(err)))
      .finally(() => setJobsLoading(false));
  };

  const isDataReadyForExport =
    Boolean(loadedCompanyId) &&
    loadedCompanyId === activeCompanyId &&
    Boolean(jobCounts) &&
    !jobsLoading &&
    !metricsLoading;

  const handleExportCsv = () => {
    if (!isDataReadyForExport || !jobCounts) return;
    exportEmployerReportToCsv({
      companyName: active?.name || "Doanh nghiệp",
      selectedJobTitle,
      jobCounts,
      pipeline,
      interviews,
    });
  };

  const handleExportJson = () => {
    if (!isDataReadyForExport || !jobCounts) return;
    exportEmployerReportToJson({
      companyId: active?.id || "",
      companyName: active?.name || "Doanh nghiệp",
      selectedJobId: selectedJobId === "ALL" ? null : selectedJobId,
      selectedJobTitle,
      jobCounts,
      pipeline,
      interviews,
    });
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 48 }}>
      <PageHeader
        title="Báo cáo tiến độ tuyển dụng"
        subtitle={`Theo dõi hiệu quả tuyển dụng, luồng ứng viên và lịch phỏng vấn của doanh nghiệp: ${active?.name || ""}`}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* JOB SELECTOR */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--color-surface, #fff)", border: "1px solid var(--color-border, #cbd5e1)", borderRadius: 8, padding: "4px 8px" }}>
              <Filter size={16} color="#64748b" />
              <select
                aria-label="Lọc theo tin tuyển dụng"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  outline: "none",
                  cursor: "pointer",
                  maxWidth: 220,
                  textOverflow: "ellipsis",
                }}
              >
                <option value="ALL">Tất cả tin tuyển dụng ({jobCounts?.total ?? jobs.length})</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.status})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className={`${ui.btn} ${ui.btnOutline}`}
              onClick={handleRefresh}
              disabled={jobsLoading || metricsLoading}
              title="Làm mới toàn bộ số liệu"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <RefreshCw size={15} className={jobsLoading || metricsLoading ? "spin" : ""} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              className={`${ui.btn} ${ui.btnOutline}`}
              onClick={handleExportCsv}
              disabled={!isDataReadyForExport}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Download size={15} />
              <span>Xuất CSV</span>
            </button>

            <button
              type="button"
              className={`${ui.btn} ${ui.btnOutline}`}
              onClick={handleExportJson}
              disabled={!isDataReadyForExport}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Download size={15} />
              <span>Xuất JSON</span>
            </button>
          </div>
        }
      />

      {/* FILTER SUMMARY BADGE */}
      <div
        style={{
          background: "var(--color-surface, #fff)",
          border: "1px solid var(--color-border, #e2e8f0)",
          borderRadius: 10,
          padding: "12px 18px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span style={{ fontSize: "0.875rem", color: "#475569" }}>
          Phạm vi xem: <strong>{selectedJobTitle}</strong>.
          Số liệu tin tuyển dụng phản ánh dữ liệu thực tế từ máy chủ.
        </span>
        <Badge tone="info">Doanh nghiệp: {active?.name}</Badge>
      </div>

      {/* LOADING & ERROR STATES */}
      {jobsLoading ? (
        <LoadingBlock rows={5} label="Đang nạp dữ liệu tin tuyển dụng từ máy chủ..." />
      ) : jobsError ? (
        <ApiErrorState error={jobsError} onRetry={handleRefresh} />
      ) : !jobCounts ? (
        <div style={{ textAlign: "center", padding: "48px 16px", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <p style={{ color: "#64748b" }}>Không có dữ liệu tin tuyển dụng từ doanh nghiệp.</p>
        </div>
      ) : (
        <>
          {/* SECTION 1: JOBS STATUS OVERVIEW */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                1. Hiện trạng tin tuyển dụng (Job Postings Overview)
              </h2>
              <Link
                to="/employer/jobs"
                style={{ fontSize: "0.875rem", fontWeight: 600, color: "#4f46e5", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <span>Quản lý tin tuyển dụng</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#64748b" }}>TỔNG SỐ TIN</span>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: 6 }}>
                  {jobCounts.total}
                </div>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Toàn bộ tin của doanh nghiệp</span>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#16a34a" }}>ĐANG CÔNG KHAI</span>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#16a34a", marginTop: 6 }}>
                  {jobCounts.published}
                </div>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Ứng viên đang nộp hồ sơ</span>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#64748b" }}>BẢN NHÁP (DRAFT)</span>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#64748b", marginTop: 6 }}>
                  {jobCounts.draft}
                </div>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Chưa đăng lên sàn</span>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#d97706" }}>TẠM DỪNG (PAUSED)</span>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#d97706", marginTop: 6 }}>
                  {jobCounts.paused}
                </div>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Tạm ngưng nhận hồ sơ</span>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#dc2626" }}>ĐÃ ĐÓNG (CLOSED)</span>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#dc2626", marginTop: 6 }}>
                  {jobCounts.closed}
                </div>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Hoàn thành hoặc kết thúc</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: CANDIDATE APPLICATION PIPELINE */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  2. Phễu ứng viên & Luồng xét duyệt (Application Pipeline Funnel)
                </h2>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  Phân loại trạng thái luân chuyển hồ sơ ứng viên thực tế theo quy trình tuyển dụng chuẩn.
                </span>
              </div>
              <Link
                to="/employer/applicants"
                style={{ fontSize: "0.875rem", fontWeight: 600, color: "#4f46e5", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <span>Xem danh sách ứng viên</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {metricsLoading ? (
              <LoadingBlock rows={3} label="Đang kiểm tra chỉ số luồng hồ sơ ứng viên..." />
            ) : metricsError ? (
              <ApiErrorState error={metricsError} />
            ) : aggregateAvailable && pipeline ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, padding: "16px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>TỔNG TIẾP NHẬN</span>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                    {pipeline.total}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Lượt nộp hồ sơ</span>
                </div>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2563eb" }}>MỚI TIẾP NHẬN</span>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#2563eb", marginTop: 4 }}>
                    {pipeline.SUBMITTED}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Chờ mở hồ sơ</span>
                </div>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#d97706" }}>ĐANG XEM XÉT</span>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d97706", marginTop: 4 }}>
                    {pipeline.REVIEWING}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Đang đánh giá CV</span>
                </div>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#7c3aed" }}>ĐÃ CHỌN LỌC</span>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#7c3aed", marginTop: 4 }}>
                    {pipeline.SHORTLISTED}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Phù hợp tiêu chí</span>
                </div>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0891b2" }}>PHỎNG VẤN</span>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0891b2", marginTop: 4 }}>
                    {pipeline.INTERVIEW}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Vòng phỏng vấn</span>
                </div>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#16a34a" }}>ĐỀ NGHỊ VIỆC LÀM</span>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
                    {pipeline.OFFERED}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Đã gửi offer</span>
                </div>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>TỪ CHỐI</span>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#64748b", marginTop: 4 }}>
                    {pipeline.REJECTED}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Không phù hợp</span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "#fff",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 12,
                  padding: "28px 24px",
                  textAlign: "center",
                }}
              >
                <div style={{ display: "inline-flex", marginBottom: 10 }}>
                  <Badge tone="warning">Chưa khả dụng trên máy chủ</Badge>
                </div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#334155", margin: "4px 0" }}>
                  Chỉ số phễu ứng viên tổng hợp toàn doanh nghiệp chưa khả dụng
                </h3>
                <p style={{ fontSize: "0.8125rem", color: "#64748b", maxWidth: 560, margin: "8px auto 0", lineHeight: 1.5 }}>
                  Hệ thống không tổng hợp ước lượng từng phần để đảm bảo tính chính xác tuyệt đối. Vui lòng xem danh sách chi tiết theo từng tin tuyển dụng tại mục Quản lý ứng viên.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 3: INTERVIEW SCHEDULING & OUTCOMES */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
              3. Lịch phỏng vấn & Kết quả tổ chức (Interviews & Recruitment Outcomes)
            </h2>

            {aggregateAvailable && interviews ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#64748b" }}>TỔNG SỐ BUỔI PHỎNG VẤN</span>
                    <Calendar size={18} color="#4f46e5" />
                  </div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>
                    {interviews.total}
                  </div>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Tổng lịch đã thiết lập</span>
                </div>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0891b2" }}>LỊCH SẮP TỚI</span>
                    <Clock size={18} color="#0891b2" />
                  </div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0891b2" }}>
                    {interviews.scheduled}
                  </div>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Đang lên kế hoạch gặp ứng viên</span>
                </div>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#16a34a" }}>ĐÃ HOÀN THÀNH</span>
                    <CheckCircle2 size={18} color="#16a34a" />
                  </div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#16a34a" }}>
                    {interviews.completed}
                  </div>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Đã trao đổi xong</span>
                </div>

                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#64748b" }}>LỊCH ĐÃ HỦY</span>
                    <XCircle size={18} color="#64748b" />
                  </div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#64748b" }}>
                    {interviews.cancelled}
                  </div>
                  <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Hủy do trùng lịch hoặc thay đổi</span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "#fff",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 12,
                  padding: "28px 24px",
                  textAlign: "center",
                }}
              >
                <div style={{ display: "inline-flex", marginBottom: 10 }}>
                  <Badge tone="warning">Chưa khả dụng trên máy chủ</Badge>
                </div>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#334155", margin: "4px 0" }}>
                  Chỉ số lịch phỏng vấn tổng hợp chưa khả dụng
                </h3>
                <p style={{ fontSize: "0.8125rem", color: "#64748b", maxWidth: 560, margin: "8px auto 0", lineHeight: 1.5 }}>
                  Chỉ số tổ chức phỏng vấn độc lập cần API thống kê tổng hợp từ máy chủ. Lịch phỏng vấn cụ thể của từng ứng viên được quản lý trực tiếp trong trang chi tiết ứng viên.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 4: COMMERCIAL PACKAGE STATUS */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
              4. Gói dịch vụ & Chi phí tuyển dụng (Commercial Package Tracking)
            </h2>

            <div
              style={{
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: 12,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ background: "#e2e8f0", padding: 10, borderRadius: 10, color: "#475569" }}>
                  <Package size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9375rem" }}>
                    Gói dịch vụ hiện tại: Gói cơ bản doanh nghiệp FINDWORK (Miễn phí)
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: 4 }}>
                    Toàn bộ tính năng đăng tin tuyển dụng, sàng lọc hồ sơ ứng viên và lên lịch phỏng vấn đang được cung cấp miễn phí trong giai đoạn hiện tại. Chưa tích hợp dịch vụ thu phí hoặc hạn mức đăng tin.
                  </div>
                </div>
              </div>
              <Badge tone="neutral">Không phát sinh chi phí</Badge>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
