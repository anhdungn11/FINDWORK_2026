import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Users,
  Calendar,
  Download,
  RefreshCw,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  UserCheck,
  AlertCircle,
  Package,
} from "lucide-react";
import { Badge, Card, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import { canReviewApplications } from "@/features/company/companyWorkspacePermissions";
import type { CompanyApplicationDto, CompanyInterviewDto, JobDto } from "@/services/api/apiTypes";
import {
  type EmployerReportingPeriod,
  EMPLOYER_PERIOD_LABELS,
  type PipelineSummary,
  type InterviewSummary,
  buildEmployerReportCsv,
  buildEmployerReportJson,
} from "@/features/reports/reportFormatters";

export type ReportingPeriod = EmployerReportingPeriod;

export function exportEmployerReportToCsv(params: {
  companyName: string;
  period: ReportingPeriod;
  selectedJobTitle: string;
  jobCounts: { total: number; published: number; draft: number; paused: number; closed: number };
  pipeline: PipelineSummary;
  interviews: InterviewSummary;
}): void {
  const csvContent = buildEmployerReportCsv(params);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FINDWORK_Employer_Report_${params.period}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEmployerReportToJson(params: {
  companyId: string;
  companyName: string;
  period: ReportingPeriod;
  selectedJobId: string | null;
  selectedJobTitle: string;
  jobCounts: { total: number; published: number; draft: number; paused: number; closed: number };
  pipeline: PipelineSummary;
  interviews: InterviewSummary;
}): void {
  const payload = buildEmployerReportJson(params);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FINDWORK_Employer_Report_${params.period}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function EmployerReportsPage() {
  const { active } = useCompanyWorkspace();
  const [period, setPeriod] = useState<ReportingPeriod>("all");
  const [selectedJobId, setSelectedJobId] = useState<string>("ALL");

  const [jobs, setJobs] = useState<JobDto[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<Error | null>(null);

  const [pipeline, setPipeline] = useState<PipelineSummary>({
    SUBMITTED: 0,
    REVIEWING: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    OFFERED: 0,
    REJECTED: 0,
    total: 0,
  });
  const [interviews, setInterviews] = useState<InterviewSummary>({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<Error | null>(null);

  // Load jobs list
  const loadJobs = async () => {
    if (!active?.id) return;
    setJobsLoading(true);
    setJobsError(null);
    try {
      const res = await companyWorkspaceApi.listJobs(active.id, { pageSize: 100 });
      setJobs(res.data || []);
    } catch (err) {
      setJobsError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [active?.id]);

  // Load applications and interviews
  const loadMetrics = async () => {
    if (!active?.id) return;
    if (!canReviewApplications(active.memberRoleNames)) {
      setPipeline({
        SUBMITTED: 0,
        REVIEWING: 0,
        SHORTLISTED: 0,
        INTERVIEW: 0,
        OFFERED: 0,
        REJECTED: 0,
        total: 0,
      });
      setInterviews({ total: 0, scheduled: 0, completed: 0, cancelled: 0 });
      return;
    }

    setMetricsLoading(true);
    setMetricsError(null);

    try {
      const targetJobs = selectedJobId === "ALL" ? jobs : jobs.filter((j) => j.id === selectedJobId);

      if (targetJobs.length === 0) {
        setPipeline({
          SUBMITTED: 0,
          REVIEWING: 0,
          SHORTLISTED: 0,
          INTERVIEW: 0,
          OFFERED: 0,
          REJECTED: 0,
          total: 0,
        });
        setInterviews({ total: 0, scheduled: 0, completed: 0, cancelled: 0 });
        setMetricsLoading(false);
        return;
      }

      // Fetch applications for target jobs
      const appResponses = await Promise.all(
        targetJobs.map((j) =>
          companyWorkspaceApi.listJobApplications(active.id, j.id, { pageSize: 100 }).catch(() => null)
        )
      );

      const pipelineCounts: PipelineSummary = {
        SUBMITTED: 0,
        REVIEWING: 0,
        SHORTLISTED: 0,
        INTERVIEW: 0,
        OFFERED: 0,
        REJECTED: 0,
        total: 0,
      };

      const now = Date.now();
      const periodMillis =
        period === "7d"
          ? 7 * 86400000
          : period === "30d"
          ? 30 * 86400000
          : period === "90d"
          ? 90 * 86400000
          : Infinity;

      const interviewCandidateAppIds: string[] = [];

      for (const res of appResponses) {
        if (!res) continue;
        for (const app of res.data) {
          // If period filter is applied, check creation date
          if (period !== "all") {
            const created = new Date(app.createdAt).getTime();
            if (isNaN(created) || now - created > periodMillis) {
              continue;
            }
          }

          pipelineCounts.total++;
          if (app.status in pipelineCounts) {
            pipelineCounts[app.status as keyof PipelineSummary]++;
          }

          if (app.status === "INTERVIEW" || app.status === "OFFERED") {
            interviewCandidateAppIds.push(app.id);
          }
        }
      }

      // Fetch interviews for candidates in interview / offered status
      let intTotal = 0;
      let intScheduled = 0;
      let intCompleted = 0;
      let intCancelled = 0;

      if (interviewCandidateAppIds.length > 0) {
        const interviewResponses = await Promise.all(
          interviewCandidateAppIds.slice(0, 20).map((appId) =>
            companyWorkspaceApi.listApplicationInterviews(active.id, appId).catch(() => [] as CompanyInterviewDto[])
          )
        );

        for (const list of interviewResponses) {
          for (const item of list) {
            intTotal++;
            if (item.status === "SCHEDULED") intScheduled++;
            else if (item.status === "COMPLETED") intCompleted++;
            else if (item.status === "CANCELLED") intCancelled++;
          }
        }
      }

      setPipeline(pipelineCounts);
      setInterviews({
        total: intTotal,
        scheduled: intScheduled,
        completed: intCompleted,
        cancelled: intCancelled,
      });
    } catch (err) {
      setMetricsError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (!jobsLoading) {
      loadMetrics();
    }
  }, [jobsLoading, jobs, selectedJobId, period]);

  // Job counts calculation
  const jobCounts = useMemo(() => {
    const list = selectedJobId === "ALL" ? jobs : jobs.filter((j) => j.id === selectedJobId);
    let published = 0;
    let draft = 0;
    let paused = 0;
    let closed = 0;

    for (const j of list) {
      if (j.status === "PUBLISHED") published++;
      else if (j.status === "DRAFT") draft++;
      else if (j.status === "PAUSED") paused++;
      else if (j.status === "CLOSED") closed++;
    }

    return {
      total: list.length,
      published,
      draft,
      paused,
      closed,
    };
  }, [jobs, selectedJobId]);

  const selectedJobTitle = useMemo(() => {
    if (selectedJobId === "ALL") return "Tất cả tin tuyển dụng";
    const found = jobs.find((j) => j.id === selectedJobId);
    return found ? found.title : "Tin tuyển dụng đã chọn";
  }, [selectedJobId, jobs]);

  const handleRefresh = () => {
    loadJobs();
  };

  const handleExportCsv = () => {
    exportEmployerReportToCsv({
      companyName: active?.name || "Doanh nghiệp",
      period,
      selectedJobTitle,
      jobCounts,
      pipeline,
      interviews,
    });
  };

  const handleExportJson = () => {
    exportEmployerReportToJson({
      companyId: active?.id || "",
      companyName: active?.name || "Doanh nghiệp",
      period,
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
            {/* PERIOD SELECTOR */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--color-surface, #fff)", border: "1px solid var(--color-border, #cbd5e1)", borderRadius: 8, padding: "4px 8px" }}>
              <Calendar size={16} color="#64748b" />
              <select
                aria-label="Chọn chu kỳ báo cáo"
                value={period}
                onChange={(e) => setPeriod(e.target.value as ReportingPeriod)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">Toàn bộ thời gian (Tất cả)</option>
                <option value="7d">7 ngày gần nhất</option>
                <option value="30d">30 ngày gần nhất</option>
                <option value="90d">90 ngày gần nhất</option>
              </select>
            </div>

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
                <option value="ALL">Tất cả tin tuyển dụng ({jobs.length})</option>
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
              disabled={jobsLoading || metricsLoading}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Download size={15} />
              <span>Xuất CSV</span>
            </button>

            <button
              type="button"
              className={`${ui.btn} ${ui.btnOutline}`}
              onClick={handleExportJson}
              disabled={jobsLoading || metricsLoading}
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
          Phạm vi xem: <strong>{selectedJobTitle}</strong> &bull; Chu kỳ: <strong>{EMPLOYER_PERIOD_LABELS[period]}</strong>.
          Số liệu phản ánh dữ liệu thực tế từ hồ sơ ứng tuyển và lịch phỏng vấn của doanh nghiệp.
        </span>
        <Badge variant="info">Doanh nghiệp: {active?.name}</Badge>
      </div>

      {/* LOADING & ERROR STATES */}
      {jobsLoading ? (
        <LoadingBlock rows={5} label="Đang nạp dữ liệu tin tuyển dụng và luồng ứng viên..." />
      ) : jobsError ? (
        <ApiErrorState error={jobsError} onRetry={loadJobs} />
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
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Tin tuyển dụng trong phạm vi</span>
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
              <LoadingBlock rows={3} label="Đang tính toán luồng hồ sơ ứng viên..." />
            ) : metricsError ? (
              <ApiErrorState error={metricsError} onRetry={loadMetrics} />
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
                  {/* TOTAL */}
                  <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, padding: "16px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>TỔNG TIẾP NHẬN</span>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                      {pipeline.total}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Lượt nộp hồ sơ</span>
                  </div>

                  {/* SUBMITTED */}
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2563eb" }}>MỚI TIẾP NHẬN</span>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#2563eb", marginTop: 4 }}>
                      {pipeline.SUBMITTED}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Chờ mở hồ sơ</span>
                  </div>

                  {/* REVIEWING */}
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#d97706" }}>ĐANG XEM XÉT</span>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d97706", marginTop: 4 }}>
                      {pipeline.REVIEWING}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Đang đánh giá CV</span>
                  </div>

                  {/* SHORTLISTED */}
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#7c3aed" }}>ĐÃ CHỌN LỌC</span>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#7c3aed", marginTop: 4 }}>
                      {pipeline.SHORTLISTED}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Phù hợp tiêu chí</span>
                  </div>

                  {/* INTERVIEW */}
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0891b2" }}>PHỎNG VẤN</span>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0891b2", marginTop: 4 }}>
                      {pipeline.INTERVIEW}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Vòng phỏng vấn</span>
                  </div>

                  {/* OFFERED */}
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#16a34a" }}>ĐỀ NGHỊ VIỆC LÀM</span>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
                      {pipeline.OFFERED}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Đã gửi offer</span>
                  </div>

                  {/* REJECTED */}
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>TỪ CHỐI</span>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#64748b", marginTop: 4 }}>
                      {pipeline.REJECTED}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Không phù hợp</span>
                  </div>
                </div>

                {pipeline.total === 0 && (
                  <div style={{ textAlign: "center", padding: "32px 16px", background: "#fff", borderRadius: 10, border: "1px dashed #cbd5e1", marginTop: 16 }}>
                    <p style={{ color: "#64748b", margin: 0 }}>
                      Chưa có hồ sơ ứng tuyển nào cho phạm vi đã chọn. Khi ứng viên nộp CV, biểu đồ luồng luân chuyển sẽ tự động hiển thị tại đây.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* SECTION 3: INTERVIEW SCHEDULING & OUTCOMES */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
              3. Lịch phỏng vấn & Kết quả tổ chức (Interviews & Recruitment Outcomes)
            </h2>

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
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Hủy do trùng lịch hoặc ứng viên từ chối</span>
              </div>
            </div>
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
              <Badge variant="neutral">Không phát sinh chi phí</Badge>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
