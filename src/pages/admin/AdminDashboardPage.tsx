import { Badge, Card, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAuthStore } from "@/store/authStore";
import { useAsyncData } from "@/hooks/useAsyncData";
import { adminApi } from "@/services/api/adminApi";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";

const WritesNotice = () =>
  isWorkspaceWritesEnabled() ? null : (
    <div className={`${ui.notice} ${ui.noticeWarn}`} role="note">
      Chế độ chỉ xem: cổng ghi dữ liệu quản trị (khóa tài khoản, duyệt công ty, đóng tin) đang được khóa an toàn.
    </div>
  );

const AdminDashboardPage = () => {
  const user = useAuthStore((s) => s.user);
  const stats = useAsyncData((signal) => adminApi.getDashboard(signal), []);

  return (
    <>
      <PageHeader
        title="Bảng điều khiển quản trị nền tảng"
        subtitle="Quản lý giám sát hệ thống, tài khoản người dùng, hồ sơ doanh nghiệp và kiểm duyệt tin đăng."
      />
      <WritesNotice />

      <div className={ui.grid} style={{ marginBottom: 20 }}>
        <Card title="Phiên quản trị hiện tại">
          <p style={{ margin: "0 0 8px" }}>
            Email: <strong>{user?.email || "—"}</strong>
          </p>
          <p style={{ margin: "0 0 12px" }}>
            Vai trò: <Badge tone="info">{user?.role || "ADMIN"}</Badge>
          </p>
          <span className={ui.hint}>
            Khu vực này được bảo vệ bởi AdminRoute và xác thực vai trò hệ thống.
          </span>
        </Card>

        <Card title="Trạng thái dịch vụ nền tảng">
          <p style={{ margin: "0 0 8px" }}>
            Trạng thái Backend: <Badge tone="success">Đang hoạt động</Badge>
          </p>
          <span className={ui.hint}>
            Hệ thống NestJS + PostgreSQL đang phục vụ các API cơ sở.
          </span>
        </Card>
      </div>

      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "24px 0 12px" }}>
        Số liệu thực tế nền tảng (GET /admin/dashboard)
      </h2>

      {stats.loading ? (
        <LoadingBlock rows={3} label="Đang nạp số liệu thống kê quản trị" />
      ) : stats.error ? (
        <ApiErrorState error={stats.error} onRetry={stats.reload} />
      ) : stats.data ? (
        <div className={ui.grid}>
          <Card title="Người dùng (Users)">
            <p style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 8px", color: "var(--color-primary, #0ea5e9)" }}>
              {stats.data.users}
            </p>
            <p className={ui.hint} style={{ margin: 0 }}>
              Trong đó <strong>{stats.data.activeUsers}</strong> người dùng đang hoạt động (ACTIVE).
            </p>
          </Card>

          <Card title="Doanh nghiệp (Companies)">
            <p style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 8px", color: "var(--color-primary, #0ea5e9)" }}>
              {stats.data.companies}
            </p>
            <p className={ui.hint} style={{ margin: 0 }}>
              <strong>{stats.data.activeCompanies}</strong> đang hoạt động · <strong>{stats.data.pendingCompanies}</strong> chờ xác minh.
            </p>
          </Card>

          <Card title="Tin tuyển dụng (Jobs)">
            <p style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 8px", color: "var(--color-primary, #0ea5e9)" }}>
              {stats.data.jobs}
            </p>
            <p className={ui.hint} style={{ margin: 0 }}>
              Trong đó <strong>{stats.data.publishedJobs}</strong> tin đang công khai tuyển dụng.
            </p>
          </Card>

          <Card title="Đơn ứng tuyển (Applications)">
            <p style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 8px", color: "var(--color-primary, #0ea5e9)" }}>
              {stats.data.applications}
            </p>
            <p className={ui.hint} style={{ margin: 0 }}>
              Tổng số hồ sơ ứng tuyển ứng viên đã gửi vào hệ thống.
            </p>
          </Card>
        </div>
      ) : null}
    </>
  );
};

export default AdminDashboardPage;
