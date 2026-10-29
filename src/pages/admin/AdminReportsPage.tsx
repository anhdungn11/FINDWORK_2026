import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  Briefcase,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Download,
  CreditCard,
  Handshake,
  Calendar,
} from "lucide-react";
import { Badge, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { adminApi } from "@/services/api/adminApi";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { toApiFailure, type ApiFailure } from "@/services/api/apiFailure";
import {
  type AdminReportSummaryDto,
  type ReportPeriodKey,
  REPORT_PERIOD_LABELS,
  buildAdminReportCsv,
  buildAdminReportJson,
} from "@/features/reports/reportFormatters";

export function exportAdminReportToCsv(data: AdminReportSummaryDto): void {
  const csvContent = buildAdminReportCsv(data);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FINDWORK_Admin_Report_${data.period.key}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAdminReportToJson(data: AdminReportSummaryDto): void {
  const payload = buildAdminReportJson(data);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FINDWORK_Admin_Report_${data.period.key}_${new Date().toISOString().slice(0, 10)}.json`;
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
          Hệ thống đang hoạt động ở chế độ giám sát và trích xuất báo cáo an toàn. Các cổng ghi dữ liệu quản trị được bảo vệ.
        </span>
      </div>
    </div>
  );

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<ReportPeriodKey>("30d");
  const [report, setReport] = useState<AdminReportSummaryDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiFailure | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const requestRevision = useRef(0);

  const loadData = useCallback((periodToFetch: ReportPeriodKey) => {
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    const revision = ++requestRevision.current;

    setLoading(true);
    setError(null);

    adminApi
      .getReportsSummary({ period: periodToFetch }, controller.signal)
      .then((data) => {
        if (revision === requestRevision.current) {
          setReport(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || revision !== requestRevision.current) {
          return;
        }
        setError(toApiFailure(err));
      })
      .finally(() => {
        if (revision === requestRevision.current) {
          setLoading(false);
        }
      });

    return controller;
  }, []);

  useEffect(() => {
    const controller = loadData(period);
    return () => {
      controller.abort();
    };
  }, [period, loadData]);

  const periodLabel = REPORT_PERIOD_LABELS[period] ?? period;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", paddingBottom: 48 }}>
      <PageHeader
        title="Báo cáo tiến độ & Vận hành sàn"
        subtitle="Giám sát hiện trạng tổng thể nền tảng FINDWORK, thống kê khối lượng vận hành và theo dõi hàng đợi xử lý."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`${ui.btn} ${ui.btnOutline}`}
              onClick={() => loadData(period)}
              disabled={loading}
              title="Tải lại số liệu từ máy chủ"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
              <span>Làm mới</span>
            </button>

            {report && (
              <>
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnOutline}`}
                  onClick={() => exportAdminReportToCsv(report)}
                  disabled={loading}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Download size={15} />
                  <span>Xuất CSV</span>
                </button>

                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnOutline}`}
                  onClick={() => exportAdminReportToJson(report)}
                  disabled={loading}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Download size={15} />
                  <span>Xuất JSON</span>
                </button>
              </>
            )}
          </div>
        }
      />

      <WritesNotice />

      {/* PERIOD SELECTION TOOLBAR */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569", fontWeight: 600, fontSize: "0.875rem" }}>
            <Calendar size={18} color="#2563eb" />
            <label htmlFor="admin-period-filter">Chu kỳ báo cáo:</label>
          </div>
          <select
            id="admin-period-filter"
            aria-label="Chu kỳ báo cáo"
            className={ui.select}
            value={period}
            onChange={(e) => setPeriod(e.target.value as ReportPeriodKey)}
            style={{ width: "auto", minWidth: 230, fontWeight: 500 }}
          >
            <option value="30d">30 ngày gần nhất (Mặc định)</option>
            <option value="7d">7 ngày gần nhất</option>
            <option value="90d">90 ngày gần nhất</option>
            <option value="all">Toàn bộ thời gian (Tất cả)</option>
          </select>
          {report?.period && (
            <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
              Khoảng thời gian:{" "}
              <strong style={{ color: "#334155" }}>
                {report.period.startDate ? new Date(report.period.startDate).toLocaleDateString("vi-VN") : "Khởi tạo hệ thống"} —{" "}
                {new Date(report.period.endDate).toLocaleDateString("vi-VN")}
              </strong>
            </span>
          )}
        </div>

        <Badge tone="success">Số liệu tổng hợp cơ sở dữ liệu thời gian thực</Badge>
      </div>

      {/* METRICS CONTENT */}
      {loading ? (
        <LoadingBlock rows={5} label="Đang nạp dữ liệu báo cáo vận hành quản trị từ máy chủ..." />
      ) : error ? (
        <ApiErrorState error={error} onRetry={() => loadData(period)} />
      ) : !report ? (
        <div style={{ textAlign: "center", padding: "48px 16px", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <p style={{ color: "#64748b" }}>Không có dữ liệu báo cáo từ máy chủ.</p>
        </div>
      ) : (
        <>
          {/* SECTION 1: CURRENT-STATE PLATFORM COUNTS (DATABASE SNAPSHOT) */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                1. Hiện trạng tích lũy toàn sàn (Platform Snapshot - Current DB State)
              </h2>
              <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: "4px 0 0" }}>
                Số liệu đếm tức thời trên toàn bộ cơ sở dữ liệu (Database Snapshot). Phản ánh trạng thái tại thời điểm hiện tại, không phụ thuộc vào chu kỳ lọc.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {/* USERS CARD */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#64748b" }}>TÀI KHOẢN NGƯỜI DÙNG</span>
                  <div style={{ background: "#e0e7ff", padding: 8, borderRadius: 8, color: "#4f46e5" }}>
                    <Users size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, marginBottom: 8 }}>
                  {report.snapshot.users.total.toLocaleString("vi-VN")}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: 16 }}>
                  <div>Hoạt động: <strong style={{ color: "#16a34a" }}>{report.snapshot.users.active.toLocaleString("vi-VN")}</strong></div>
                  <div>Tạm khóa (SUSPENDED): <strong style={{ color: "#d97706" }}>{report.snapshot.users.suspended.toLocaleString("vi-VN")}</strong></div>
                  <div>Vô hiệu hóa (DISABLED): <strong style={{ color: "#dc2626" }}>{report.snapshot.users.disabled.toLocaleString("vi-VN")}</strong></div>
                </div>
                <div style={{ marginTop: "auto", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                  <Link
                    to="/admin/users"
                    style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#4f46e5", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    <span>Quản lý người dùng</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* COMPANIES CARD */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#64748b" }}>DOANH NGHIỆP TUYỂN DỤNG</span>
                  <div style={{ background: "#dbeafe", padding: 8, borderRadius: 8, color: "#2563eb" }}>
                    <Building2 size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, marginBottom: 8 }}>
                  {report.snapshot.companies.total.toLocaleString("vi-VN")}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: 16 }}>
                  <div>Đang hoạt động: <strong style={{ color: "#16a34a" }}>{report.snapshot.companies.active.toLocaleString("vi-VN")}</strong></div>
                  <div>Đã xác minh (VERIFIED): <strong style={{ color: "#2563eb" }}>{report.snapshot.companies.verified.toLocaleString("vi-VN")}</strong></div>
                  <div>Chờ xác minh (PENDING): <strong style={{ color: "#ea580c" }}>{report.snapshot.companies.pendingVerification.toLocaleString("vi-VN")}</strong></div>
                  <div>Từ chối xác minh (REJECTED): <strong style={{ color: "#dc2626" }}>{report.snapshot.companies.rejectedVerification.toLocaleString("vi-VN")}</strong></div>
                  <div>Chưa gửi hồ sơ (UNVERIFIED): <strong style={{ color: "#64748b" }}>{report.snapshot.companies.unverified.toLocaleString("vi-VN")}</strong></div>
                  <div>Tạm dừng / Lưu trữ: <strong style={{ color: "#64748b" }}>{(report.snapshot.companies.suspended + report.snapshot.companies.archived).toLocaleString("vi-VN")}</strong></div>
                </div>
                <div style={{ marginTop: "auto", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                  <Link
                    to="/admin/companies"
                    style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#2563eb", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    <span>Danh sách doanh nghiệp</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* JOBS CARD */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#64748b" }}>TIN TUYỂN DỤNG TRÊN SÀN</span>
                  <div style={{ background: "#fef3c7", padding: 8, borderRadius: 8, color: "#d97706" }}>
                    <Briefcase size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, marginBottom: 8 }}>
                  {report.snapshot.jobs.total.toLocaleString("vi-VN")}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: 16 }}>
                  <div>Đang công khai: <strong style={{ color: "#16a34a" }}>{report.snapshot.jobs.published.toLocaleString("vi-VN")}</strong></div>
                  <div>Bản nháp (DRAFT): <strong style={{ color: "#64748b" }}>{report.snapshot.jobs.draft.toLocaleString("vi-VN")}</strong></div>
                  <div>Tạm dừng (PAUSED): <strong style={{ color: "#d97706" }}>{report.snapshot.jobs.paused.toLocaleString("vi-VN")}</strong></div>
                  <div>Đã đóng (CLOSED): <strong style={{ color: "#475569" }}>{report.snapshot.jobs.closed.toLocaleString("vi-VN")}</strong></div>
                  <div>Hết hạn (EXPIRED): <strong style={{ color: "#dc2626" }}>{report.snapshot.jobs.expired.toLocaleString("vi-VN")}</strong></div>
                  <div>Lưu trữ (ARCHIVED): <strong style={{ color: "#94a3b8" }}>{report.snapshot.jobs.archived.toLocaleString("vi-VN")}</strong></div>
                </div>
                <div style={{ marginTop: "auto", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                  <Link
                    to="/admin/jobs"
                    style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#d97706", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    <span>Kiểm duyệt tin tuyển dụng</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* APPLICATIONS CARD */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#64748b" }}>HỒ SƠ ỨNG TUYỂN TOÀN SÀN</span>
                  <div style={{ background: "#dcfce7", padding: 8, borderRadius: 8, color: "#16a34a" }}>
                    <FileText size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, marginBottom: 8 }}>
                  {report.snapshot.applications.total.toLocaleString("vi-VN")}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: 16 }}>
                  Tổng số lượt nộp hồ sơ của ứng viên vào các tin tuyển dụng trên hệ thống FINDWORK tích lũy từ trước tới nay.
                </div>
                <div style={{ marginTop: "auto", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                  <Link
                    to="/admin/jobs"
                    style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#16a34a", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    <span>Xem tin có hồ sơ</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: PERIOD EVENTS (EVENT-BASED METRICS) */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  2. Biến động trong chu kỳ (Period Events: {periodLabel})
                </h2>
                <Badge tone="info">Sự kiện phát sinh</Badge>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: "4px 0 0" }}>
                Các sự kiện phát sinh trong khoảng thời gian đã chọn dựa trên nhật ký hệ thống và thời điểm ghi nhận thực tế (Event-based).
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                  Người dùng mới đăng ký
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                  {report.periodEvents.newUsersRegistered.toLocaleString("vi-VN")}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
                  Doanh nghiệp mới đăng ký
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
                  {report.periodEvents.newCompaniesRegistered.toLocaleString("vi-VN")}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#16a34a", textTransform: "uppercase" }}>
                  Doanh nghiệp được duyệt
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#16a34a", marginTop: 4 }}>
                  {report.periodEvents.companiesVerified.toLocaleString("vi-VN")}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#dc2626", textTransform: "uppercase" }}>
                  Doanh nghiệp bị từ chối
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#dc2626", marginTop: 4 }}>
                  {report.periodEvents.companiesRejected.toLocaleString("vi-VN")}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2563eb", textTransform: "uppercase" }}>
                  Tin đăng mới / công khai
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2563eb", marginTop: 4 }}>
                  {report.periodEvents.jobsPosted.toLocaleString("vi-VN")}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#4f46e5", textTransform: "uppercase" }}>
                  Hồ sơ ứng tuyển mới nộp
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#4f46e5", marginTop: 4 }}>
                  {report.periodEvents.applicationsSubmitted.toLocaleString("vi-VN")}
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#d97706", textTransform: "uppercase" }}>
                  Tin bị Admin gỡ bỏ / đóng
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#d97706", marginTop: 4 }}>
                  {report.periodEvents.jobsClosedByAdmin.toLocaleString("vi-VN")}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: OPERATIONAL BACKLOG WORK */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
              3. Hàng đợi vận hành cần xử lý (Pending Operational Work)
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {/* PENDING VERIFICATION COMPANIES */}
              <div
                style={{
                  background: "#fff",
                  border: report.operationalBacklog.pendingVerificationQueue > 0 ? "1px solid #fed7aa" : "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldCheck size={20} color={report.operationalBacklog.pendingVerificationQueue > 0 ? "#ea580c" : "#16a34a"} />
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>Doanh nghiệp chờ xét duyệt pháp lý</span>
                  </div>
                  <Badge tone={report.operationalBacklog.pendingVerificationQueue > 0 ? "warning" : "success"}>
                    {report.operationalBacklog.pendingVerificationQueue} đơn vị
                  </Badge>
                </div>
                <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "8px 0 16px" }}>
                  {report.operationalBacklog.pendingVerificationQueue > 0
                    ? `Hiện có ${report.operationalBacklog.pendingVerificationQueue} doanh nghiệp đang hoạt động đã gửi hồ sơ pháp lý chờ ban quản trị xét duyệt.`
                    : "Hàng đợi xác minh pháp lý doanh nghiệp hiện tại đã sạch. Không có hồ sơ tồn đọng."}
                </p>
                <Link
                  to="/admin/companies?verificationStatus=PENDING"
                  className={`${ui.btn} ${ui.btnOutline}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.875rem" }}
                >
                  <span>Chuyển tới hàng đợi xét duyệt</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {/* SUSPENDED OR INACTIVE USERS */}
              <div
                style={{
                  background: "#fff",
                  border: report.operationalBacklog.suspendedUsersQueue > 0 ? "1px solid #fed7aa" : "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Users size={20} color={report.operationalBacklog.suspendedUsersQueue > 0 ? "#d97706" : "#16a34a"} />
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>Tài khoản người dùng cần rà soát</span>
                  </div>
                  <Badge tone={report.operationalBacklog.suspendedUsersQueue > 0 ? "warning" : "neutral"}>
                    {report.operationalBacklog.suspendedUsersQueue} tài khoản
                  </Badge>
                </div>
                <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "8px 0 16px" }}>
                  {report.operationalBacklog.suspendedUsersQueue > 0
                    ? `Có ${report.operationalBacklog.suspendedUsersQueue} tài khoản ở trạng thái tạm khóa (SUSPENDED) cần rà soát xử lý vi phạm quy chế.`
                    : "Không có tài khoản người dùng nào đang bị tạm khóa."}
                </p>
                <Link
                  to="/admin/users?status=SUSPENDED"
                  className={`${ui.btn} ${ui.btnOutline}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.875rem" }}
                >
                  <span>Xem danh sách tài khoản bị khóa</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {/* SUSPENDED COMPANIES */}
              <div
                style={{
                  background: "#fff",
                  border: report.operationalBacklog.suspendedCompaniesQueue > 0 ? "1px solid #fed7aa" : "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Building2 size={20} color={report.operationalBacklog.suspendedCompaniesQueue > 0 ? "#d97706" : "#16a34a"} />
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>Doanh nghiệp tạm dừng cần rà soát</span>
                  </div>
                  <Badge tone={report.operationalBacklog.suspendedCompaniesQueue > 0 ? "warning" : "neutral"}>
                    {report.operationalBacklog.suspendedCompaniesQueue} đơn vị
                  </Badge>
                </div>
                <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "8px 0 16px" }}>
                  {report.operationalBacklog.suspendedCompaniesQueue > 0
                    ? `Có ${report.operationalBacklog.suspendedCompaniesQueue} doanh nghiệp ở trạng thái tạm dừng (SUSPENDED) cần ban quản trị rà soát.`
                    : "Không có doanh nghiệp nào đang bị tạm dừng hoạt động."}
                </p>
                <Link
                  to="/admin/companies?status=SUSPENDED"
                  className={`${ui.btn} ${ui.btnOutline}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.875rem" }}
                >
                  <span>Xem danh sách doanh nghiệp tạm dừng</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* SECTION 4: UNFINISHED COMMERCIAL MODULES (EXPLICIT TRACKING) */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
              4. Phân hệ kinh doanh thương mại (Commercial Status Tracking)
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {/* REVENUE & BILLING */}
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
                    <div style={{ background: "#e2e8f0", padding: 8, borderRadius: 8, color: "#64748b" }}>
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#334155", margin: 0 }}>
                        Doanh thu & Giao dịch thanh toán
                      </h3>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Chưa triển khai ghi nhận doanh thu</span>
                    </div>
                  </div>
                  <Badge tone="neutral">UNAVAILABLE</Badge>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "#64748b", lineHeight: 1.5, margin: "10px 0 0" }}>
                  {report.commercialStatus.revenueAndBilling.note}
                </p>
              </div>

              {/* PARTNERSHIPS */}
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
                    <div style={{ background: "#e2e8f0", padding: 8, borderRadius: 8, color: "#64748b" }}>
                      <Handshake size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#334155", margin: 0 }}>
                        Hợp tác đối tác doanh nghiệp
                      </h3>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Chương trình mở rộng</span>
                    </div>
                  </div>
                  <Badge tone="neutral">UNAVAILABLE</Badge>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "#64748b", lineHeight: 1.5, margin: "10px 0 0" }}>
                  {report.commercialStatus.enterprisePartnerships.note}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
