import { useState } from "react";
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
  Clock,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  CreditCard,
  Handshake,
} from "lucide-react";
import { Badge, Card, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { adminApi, type AdminDashboardCounts } from "@/services/api/adminApi";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import {
  type AdminReportingPeriod,
  ADMIN_PERIOD_LABELS,
  buildAdminReportCsv,
  buildAdminReportJson,
} from "@/features/reports/reportFormatters";

export type ReportingPeriod = AdminReportingPeriod;

export function exportAdminReportToCsv(data: AdminDashboardCounts, period: ReportingPeriod): void {
  const csvContent = buildAdminReportCsv(data, period);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FINDWORK_Admin_Report_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAdminReportToJson(data: AdminDashboardCounts, period: ReportingPeriod): void {
  const payload = buildAdminReportJson(data, period);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FINDWORK_Admin_Report_${period}_${new Date().toISOString().slice(0, 10)}.json`;
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
  const [period, setPeriod] = useState<ReportingPeriod>("30d");
  const stats = useAsyncData((signal) => adminApi.getDashboard(signal), []);

  const d = stats.data;
  const inactiveUsers = d ? Math.max(0, d.users - d.activeUsers) : 0;
  const inactiveCompanies = d ? Math.max(0, data => 0, d.companies - d.activeCompanies) : 0;
  const nonPublishedJobs = d ? Math.max(0, d.jobs - d.publishedJobs) : 0;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", paddingBottom: 48 }}>
      <PageHeader
        title="Báo cáo tiến độ & Vận hành sàn"
        subtitle="Giám sát hiện trạng tổng thể nền tảng FINDWORK, thống kê khối lượng vận hành và theo dõi hàng đợi xử lý."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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

            <button
              type="button"
              className={`${ui.btn} ${ui.btnOutline}`}
              onClick={stats.reload}
              disabled={stats.loading}
              title="Tải lại số liệu từ máy chủ"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <RefreshCw size={15} className={stats.loading ? "spin" : ""} />
              <span>Làm mới</span>
            </button>

            {d && (
              <>
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnOutline}`}
                  onClick={() => exportAdminReportToCsv(d, period)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Download size={15} />
                  <span>Xuất CSV</span>
                </button>

                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnOutline}`}
                  onClick={() => exportAdminReportToJson(d, period)}
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

      {/* PERIOD CLARIFICATION BANNER */}
      <div
        style={{
          background: "var(--color-surface, #fff)",
          border: "1px solid var(--color-border, #e2e8f0)",
          borderRadius: 10,
          padding: "14px 18px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <span style={{ fontSize: "0.875rem", color: "#475569" }}>
            Chu kỳ được chọn: <strong style={{ color: "#0f172a" }}>{ADMIN_PERIOD_LABELS[period]}</strong>.
            Các khối thống kê dưới đây phân tách rõ ràng giữa <strong>Số liệu hiện trạng tích lũy (Current-State Snapshot)</strong> và <strong>Hàng đợi vận hành quản trị</strong>.
          </span>
          {period !== "all" && (
            <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: 4 }}>
              * Ghi chú: Chỉ số phân tích biến động theo ngày (delta events) đang trong lộ trình tích hợp backend theo hợp đồng REPORTING_API_CONTRACT.md.
            </div>
          )}
        </div>
        <Badge variant="info">Dữ liệu thực từ máy chủ</Badge>
      </div>

      {/* METRICS CONTENT */}
      {stats.loading ? (
        <LoadingBlock rows={5} label="Đang nạp dữ liệu báo cáo vận hành quản trị từ máy chủ..." />
      ) : stats.error ? (
        <ApiErrorState error={stats.error} onRetry={stats.reload} />
      ) : !d ? (
        <div style={{ textAlign: "center", padding: "48px 16px", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <p style={{ color: "#64748b" }}>Không có dữ liệu báo cáo từ máy chủ.</p>
        </div>
      ) : (
        <>
          {/* SECTION 1: CURRENT-STATE PLATFORM COUNTS */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
              1. Hiện trạng tích lũy toàn sàn (Platform Current-State Snapshot)
            </h2>
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
                  {d.users.toLocaleString("vi-VN")}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: 16 }}>
                  <div>Hoạt động: <strong style={{ color: "#16a34a" }}>{d.activeUsers.toLocaleString("vi-VN")}</strong></div>
                  <div>Tạm khóa / chờ: <strong style={{ color: "#d97706" }}>{inactiveUsers.toLocaleString("vi-VN")}</strong></div>
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
                  {d.companies.toLocaleString("vi-VN")}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: 16 }}>
                  <div>Đang hoạt động: <strong style={{ color: "#16a34a" }}>{d.activeCompanies.toLocaleString("vi-VN")}</strong></div>
                  <div>Chờ xác minh pháp lý: <strong style={{ color: "#ea580c" }}>{d.pendingCompanies.toLocaleString("vi-VN")}</strong></div>
                  <div>Tạm dừng / lưu trữ: <strong style={{ color: "#64748b" }}>{inactiveCompanies.toLocaleString("vi-VN")}</strong></div>
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
                  {d.jobs.toLocaleString("vi-VN")}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: 16 }}>
                  <div>Đang công khai: <strong style={{ color: "#16a34a" }}>{d.publishedJobs.toLocaleString("vi-VN")}</strong></div>
                  <div>Nháp / Tạm ẩn / Đóng: <strong style={{ color: "#64748b" }}>{nonPublishedJobs.toLocaleString("vi-VN")}</strong></div>
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
                  {d.applications.toLocaleString("vi-VN")}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", marginBottom: 16 }}>
                  Tổng số lượt nộp hồ sơ của ứng viên vào các tin tuyển dụng trên hệ thống FINDWORK.
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

          {/* SECTION 2: OPERATIONAL BACKLOG WORK */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
              2. Hàng đợi vận hành cần xử lý (Pending Operational Work)
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {/* PENDING VERIFICATION COMPANIES */}
              <div
                style={{
                  background: "#fff",
                  border: d.pendingCompanies > 0 ? "1px solid #fed7aa" : "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldCheck size={20} color={d.pendingCompanies > 0 ? "#ea580c" : "#16a34a"} />
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>Doanh nghiệp chờ xét duyệt pháp lý</span>
                  </div>
                  <Badge variant={d.pendingCompanies > 0 ? "warning" : "success"}>
                    {d.pendingCompanies} đơn vị
                  </Badge>
                </div>
                <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "8px 0 16px" }}>
                  {d.pendingCompanies > 0
                    ? `Hiện có ${d.pendingCompanies} doanh nghiệp đã gửi hồ sơ pháp lý chờ ban quản trị kiểm duyệt giấy phép kinh doanh.`
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
                  border: inactiveUsers > 0 ? "1px solid #fed7aa" : "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Users size={20} color={inactiveUsers > 0 ? "#d97706" : "#16a34a"} />
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>Tài khoản người dùng cần rà soát</span>
                  </div>
                  <Badge variant={inactiveUsers > 0 ? "warning" : "neutral"}>
                    {inactiveUsers} tài khoản
                  </Badge>
                </div>
                <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "8px 0 16px" }}>
                  {inactiveUsers > 0
                    ? `Có ${inactiveUsers} tài khoản ở trạng thái tạm khóa (SUSPENDED) hoặc vô hiệu hóa cần rà soát xử lý vi phạm quy chế.`
                    : "Tất cả tài khoản người dùng trên hệ thống đều đang hoạt động bình thường."}
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
            </div>
          </div>

          {/* SECTION 3: UNFINISHED COMMERCIAL MODULES (EXPLICIT TRACKING) */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
              3. Theo dõi phân hệ kinh doanh thương mại (Commercial Feature Tracking)
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
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ background: "#e2e8f0", padding: 8, borderRadius: 8, color: "#64748b" }}>
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#334155", margin: 0 }}>
                      Doanh thu & Giao dịch thanh toán
                    </h3>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Chưa triển khai gói thu phí</span>
                  </div>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "#64748b", lineHeight: 1.5, margin: "10px 0 0" }}>
                  Chưa triển khai gói dịch vụ thu phí hoặc cổng thanh toán trên phiên bản hiện tại (Theo lộ trình thương mại hóa sàn FINDWORK). Toàn bộ các dịch vụ tuyển dụng và ứng tuyển đang được cung cấp miễn phí.
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
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ background: "#e2e8f0", padding: 8, borderRadius: 8, color: "#64748b" }}>
                    <Handshake size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#334155", margin: 0 }}>
                      Hợp tác đối tác doanh nghiệp
                    </h3>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Kế hoạch mở rộng</span>
                  </div>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "#64748b", lineHeight: 1.5, margin: "10px 0 0" }}>
                  Chương trình đối tác liên kết doanh nghiệp và cổng kết nối API đối tác ngoài đang trong kế hoạch mở rộng giai đoạn tiếp theo của nền tảng.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
