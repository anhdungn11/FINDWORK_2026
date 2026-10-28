import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  Briefcase,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  Ban,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { Badge, Card, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAuthStore } from "@/store/authStore";
import { useAsyncData } from "@/hooks/useAsyncData";
import { adminApi } from "@/services/api/adminApi";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";

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
        <strong style={{ color: "#92400e" }}>Chế độ an toàn chỉ đọc (Safe Read-Only Mode):</strong>{" "}
        <span style={{ color: "#78350f" }}>
          Cổng ghi dữ liệu quản trị (khóa tài khoản, phê duyệt doanh nghiệp, gỡ bỏ tin) đang được khóa an toàn để bảo vệ tính toàn vẹn hệ thống kiểm thử.
        </span>
      </div>
    </div>
  );

const AdminDashboardPage = () => {
  const user = useAuthStore((s) => s.user);
  const stats = useAsyncData((signal) => adminApi.getDashboard(signal), []);

  const d = stats.data;
  const inactiveUsers = d ? Math.max(0, d.users - d.activeUsers) : 0;
  const nonPublishedJobs = d ? Math.max(0, d.jobs - d.publishedJobs) : 0;

  return (
    <>
      <PageHeader
        title="Bảng điều khiển quản trị nền tảng"
        subtitle="Giám sát vận hành toàn hệ thống FINDWORK, phân quyền doanh nghiệp và kiểm duyệt nội dung sàn việc làm."
        actions={
          <button
            type="button"
            className={`${ui.btn} ${ui.btnOutline}`}
            onClick={stats.reload}
            disabled={stats.loading}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <RefreshCw size={15} className={stats.loading ? "spin" : ""} />
            <span>Làm mới dữ liệu</span>
          </button>
        }
      />

      <WritesNotice />

      {/* KPI METRICS OVERVIEW */}
      {stats.loading ? (
        <LoadingBlock rows={4} label="Đang nạp dữ liệu thống kê quản trị từ máy chủ" />
      ) : stats.error ? (
        <ApiErrorState error={stats.error} onRetry={stats.reload} />
      ) : d ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 16,
              marginBottom: 28,
            }}
          >
            {/* USERS KPI */}
            <div
              style={{
                background: "var(--color-surface, #fff)",
                border: "1px solid var(--color-border, #e2e8f0)",
                borderRadius: 12,
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-secondary, #64748b)" }}>
                  NGƯỜI DÙNG TOÀN SÀN
                </span>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "#e0f2fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users size={18} color="#0284c7" />
                </span>
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, marginBottom: 8 }}>
                {d.users}
              </div>
              <div style={{ fontSize: "0.825rem", color: "var(--color-text-secondary, #64748b)", marginTop: "auto" }}>
                <strong style={{ color: "#16a34a" }}>{d.activeUsers}</strong> đang hoạt động ·{" "}
                <span style={{ color: "#d97706" }}>{inactiveUsers} tạm dừng/khóa</span>
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--color-border-soft, #f1f5f9)" }}>
                <Link
                  to="/admin/users"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    color: "var(--color-primary, #4f6ef7)",
                    textDecoration: "none",
                  }}
                >
                  <span>Quản lý danh sách người dùng</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* COMPANIES KPI */}
            <div
              style={{
                background: "var(--color-surface, #fff)",
                border: d.pendingCompanies > 0 ? "1px solid #f59e0b" : "1px solid var(--color-border, #e2e8f0)",
                borderRadius: 12,
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-secondary, #64748b)" }}>
                  DOANH NGHIỆP ĐĂNG KÝ
                </span>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "#fef3c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Building2 size={18} color="#d97706" />
                </span>
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, marginBottom: 8 }}>
                {d.companies}
              </div>
              <div style={{ fontSize: "0.825rem", color: "var(--color-text-secondary, #64748b)", marginTop: "auto" }}>
                <span><strong>{d.activeCompanies}</strong> hoạt động · </span>
                {d.pendingCompanies > 0 ? (
                  <strong style={{ color: "#b45309", background: "#fef3c7", padding: "1px 6px", borderRadius: 4 }}>
                    {d.pendingCompanies} chờ xét duyệt!
                  </strong>
                ) : (
                  <span style={{ color: "#16a34a" }}>0 chờ duyệt</span>
                )}
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--color-border-soft, #f1f5f9)" }}>
                <Link
                  to="/admin/companies"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    color: "var(--color-primary, #4f6ef7)",
                    textDecoration: "none",
                  }}
                >
                  <span>Xét duyệt doanh nghiệp</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* JOBS KPI */}
            <div
              style={{
                background: "var(--color-surface, #fff)",
                border: "1px solid var(--color-border, #e2e8f0)",
                borderRadius: 12,
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-secondary, #64748b)" }}>
                  TIN TUYỂN DỤNG TOÀN SÀN
                </span>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "#ede9fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Briefcase size={18} color="#7c3aed" />
                </span>
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, marginBottom: 8 }}>
                {d.jobs}
              </div>
              <div style={{ fontSize: "0.825rem", color: "var(--color-text-secondary, #64748b)", marginTop: "auto" }}>
                <strong style={{ color: "#16a34a" }}>{d.publishedJobs}</strong> đang công khai ·{" "}
                <span style={{ color: "#64748b" }}>{nonPublishedJobs} nháp/tạm dừng/đóng</span>
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--color-border-soft, #f1f5f9)" }}>
                <Link
                  to="/admin/jobs"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    color: "var(--color-primary, #4f6ef7)",
                    textDecoration: "none",
                  }}
                >
                  <span>Kiểm duyệt tin đăng</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* APPLICATIONS KPI */}
            <div
              style={{
                background: "var(--color-surface, #fff)",
                border: "1px solid var(--color-border, #e2e8f0)",
                borderRadius: 12,
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-secondary, #64748b)" }}>
                  HỒ SƠ ỨNG TUYỂN (APPLICATIONS)
                </span>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "#dcfce7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileCheck2 size={18} color="#16a34a" />
                </span>
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, marginBottom: 8 }}>
                {d.applications}
              </div>
              <div style={{ fontSize: "0.825rem", color: "var(--color-text-secondary, #64748b)", marginTop: "auto" }}>
                <span>Tổng hồ sơ ứng viên đã nộp vào các vị trí việc làm trên hệ thống.</span>
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--color-border-soft, #f1f5f9)" }}>
                <span style={{ fontSize: "0.825rem", color: "#64748b" }}>
                  Theo dõi qua module tuyển dụng doanh nghiệp
                </span>
              </div>
            </div>
          </div>

          {/* OPERATIONAL MODERATION QUEUES */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1e293b", margin: "0 0 14px" }}>
              Hàng đợi vận hành & Hành động cấp thiết
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {/* Queue 1: Pending Company Verifications */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--color-border, #e2e8f0)",
                  borderRadius: 12,
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <Clock size={20} color="#d97706" />
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
                    Xác minh pháp lý doanh nghiệp
                  </h3>
                  {d.pendingCompanies > 0 && (
                    <span
                      style={{
                        marginLeft: "auto",
                        background: "#fef3c7",
                        color: "#b45309",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: 12,
                      }}
                    >
                      {d.pendingCompanies} hồ sơ chờ
                    </span>
                  )}
                </div>
                <p style={{ margin: "0 0 14px", fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
                  Kiểm tra đối chiếu Mã số thuế, Giấy phép ĐKKD và thông tin người đại diện theo pháp luật của các công ty mới đăng ký.
                </p>
                <Link
                  to="/admin/companies?verificationStatus=PENDING"
                  className={`${ui.btn} ${ui.btnPrimary}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}
                >
                  <span>Mở hàng đợi xét duyệt ({d.pendingCompanies})</span>
                  <ArrowRight size={15} />
                </Link>
              </div>

              {/* Queue 2: Job Moderation */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--color-border, #e2e8f0)",
                  borderRadius: 12,
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <ShieldCheck size={20} color="#0284c7" />
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
                    Kiểm duyệt tin đăng công khai
                  </h3>
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "#e0f2fe",
                      color: "#0369a1",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      borderRadius: 12,
                    }}
                  >
                    {d.publishedJobs} tin active
                  </span>
                </div>
                <p style={{ margin: "0 0 14px", fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
                  Rà soát nội dung tuyển dụng, chế độ đãi ngộ và ngăn chặn các hành vi thu phí ứng viên hoặc đăng tin vi phạm pháp luật.
                </p>
                <Link
                  to="/admin/jobs?status=PUBLISHED"
                  className={`${ui.btn} ${ui.btnOutline}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}
                >
                  <span>Rà soát tin đang tuyển</span>
                  <ArrowRight size={15} />
                </Link>
              </div>

              {/* Queue 3: User Security Oversight */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--color-border, #e2e8f0)",
                  borderRadius: 12,
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <Ban size={20} color="#dc2626" />
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
                    Tài khoản tạm dừng & kỷ luật
                  </h3>
                  {inactiveUsers > 0 && (
                    <span
                      style={{
                        marginLeft: "auto",
                        background: "#fee2e2",
                        color: "#b91c1c",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: 12,
                      }}
                    >
                      {inactiveUsers} tài khoản
                    </span>
                  )}
                </div>
                <p style={{ margin: "0 0 14px", fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
                  Theo dõi danh sách người dùng bị khóa hoặc vô hiệu hóa do vi phạm chính sách hoặc yêu cầu an toàn thông tin.
                </p>
                <Link
                  to="/admin/users?status=SUSPENDED"
                  className={`${ui.btn} ${ui.btnOutline}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}
                >
                  <span>Xem tài khoản bị khóa</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>

          {/* VERIFICATION PIPELINE LIFECYCLE */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid var(--color-border, #e2e8f0)",
              borderRadius: 12,
              padding: "24px",
              marginBottom: 32,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Layers size={22} color="var(--color-primary, #4f6ef7)" />
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
                Quy trình Thẩm định & Phân quyền Doanh nghiệp (Verification Lifecycle)
              </h2>
            </div>

            <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "0 0 20px", maxWidth: 880 }}>
              Hệ thống Findwork áp dụng chính sách bảo vệ kép: Doanh nghiệp mới tạo chỉ được thao tác bản nháp. Để đăng tin tuyển dụng và tiếp cận ứng viên thật, doanh nghiệp bắt buộc phải hoàn thành quy trình xác thực pháp lý và được Super Admin phê duyệt.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <div style={{ padding: 14, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: 4 }}>BƯỚC 1</div>
                <div style={{ fontSize: "0.925rem", fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>Đăng ký doanh nghiệp</div>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                  Trạng thái: <Badge tone="neutral">UNVERIFIED</Badge>. Chỉ được tạo bản nháp tin tuyển dụng nội bộ.
                </p>
              </div>

              <div style={{ padding: 14, background: "#fef3c7", borderRadius: 8, border: "1px solid #fde68a" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#92400e", marginBottom: 4 }}>BƯỚC 2</div>
                <div style={{ fontSize: "0.925rem", fontWeight: 700, color: "#78350f", marginBottom: 4 }}>Nộp hồ sơ pháp lý</div>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#92400e" }}>
                  Tải lên Giấy chứng nhận ĐKKD, Mã số thuế 10-13 chữ số, thông tin người đại diện.
                </p>
              </div>

              <div style={{ padding: 14, background: "#e0f2fe", borderRadius: 8, border: "1px solid #bae6fd" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0369a1", marginBottom: 4 }}>BƯỚC 3</div>
                <div style={{ fontSize: "0.925rem", fontWeight: 700, color: "#075985", marginBottom: 4 }}>Admin thẩm định hồ sơ</div>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#0369a1" }}>
                  Kiểm tra file chứng từ qua cổng an toàn. Xem xét điều kiện cấp quyền tuyển dụng.
                </p>
              </div>

              <div style={{ padding: 14, background: "#dcfce7", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#15803d", marginBottom: 4 }}>BƯỚC 4</div>
                <div style={{ fontSize: "0.925rem", fontWeight: 700, color: "#166534", marginBottom: 4 }}>Phê duyệt & Cấp quyền</div>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#15803d" }}>
                  Cấp nhãn <Badge tone="success">VERIFIED</Badge>, mở quyền công khai tin và quản lý ứng viên.
                </p>
              </div>
            </div>
          </div>

          {/* TRANSPARENT PLATFORM STATUS & BOUNDARIES */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {/* Real Platform Config */}
            <Card title="Cấu hình & Tình trạng hạ tầng máy chủ">
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Phiên đăng nhập quản trị:</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{user?.email || "admin@findwork.vn"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Vai trò hệ thống:</span>
                  <Badge tone="info">{user?.role || "ADMIN"}</Badge>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Backend Core API:</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#16a34a" }}>NestJS + PostgreSQL (Sẵn sàng)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Cổng Live Writes:</span>
                  <Badge tone={isWorkspaceWritesEnabled() ? "success" : "warning"}>
                    {isWorkspaceWritesEnabled() ? "Đã bật ghi" : "Khóa an toàn chỉ đọc"}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Explicit Unavailable Metrics & Codex Backend Contract Backlog */}
            <Card title="Chỉ số chưa hỗ trợ & Hợp đồng Backend cần bổ sung">
              <div style={{ display: "grid", gap: 10, fontSize: "0.825rem", color: "#64748b" }}>
                <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 6, border: "1px solid #f1f5f9" }}>
                  <strong style={{ color: "#334155" }}>1. Doanh thu nền tảng (Platform Revenue):</strong>{" "}
                  <span>Chưa có backend endpoint tính toán doanh thu hoặc tích hợp cổng thanh toán trực tuyến. Không giả lập số liệu tài chính.</span>
                </div>
                <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 6, border: "1px solid #f1f5f9" }}>
                  <strong style={{ color: "#334155" }}>2. Quan hệ hợp tác & Đối tác (Partnerships):</strong>{" "}
                  <span>Chưa có mô hình đối tác. Toàn bộ {d.companies} doanh nghiệp là tài khoản đăng ký trên sàn, không dán nhãn đối tác khi chưa có thỏa thuận chính thức.</span>
                </div>
                <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 6, border: "1px solid #f1f5f9" }}>
                  <strong style={{ color: "#334155" }}>3. Thông báo thời gian thực & Số đếm chưa đọc (Real-time Notifications):</strong>{" "}
                  <span>Chưa có API quản lý thông báo tập trung hoặc WebSocket stream từ Backend Codex. Không giả lập sự kiện hoặc số đếm chưa đọc giả mạo.</span>
                </div>
                <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 6, border: "1px solid #f1f5f9" }}>
                  <strong style={{ color: "#334155" }}>4. Báo cáo chuỗi thời gian (Time-series Growth Analytics):</strong>{" "}
                  <span>Cần backend endpoint tổng hợp số liệu lịch sử người dùng và tin đăng theo chu kỳ thời gian.</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </>
  );
};

export default AdminDashboardPage;
