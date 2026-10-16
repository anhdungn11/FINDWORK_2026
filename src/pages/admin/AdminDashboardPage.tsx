import { Badge, Card, PageHeader, UnavailableState, ui } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";

const AdminDashboardPage = () => {
  const user = useAuthStore((s) => s.user);

  return (
    <>
      <PageHeader
        title="Bảng điều khiển quản trị nền tảng"
        subtitle="Quản lý giám sát hệ thống, tài khoản người dùng, hồ sơ doanh nghiệp và kiểm duyệt tin đăng."
      />

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

      <UnavailableState
        title="Số liệu thống kê toàn sàn đang chờ API tổng hợp"
        text="Theo hợp đồng Backend MVP hiện tại, máy chủ chưa triển khai các endpoint thống kê quản trị (Admin Metrics / Platform Aggregates). Hệ thống từ chối hiển thị số liệu giả mạo nhằm tuân thủ nguyên tắc trung thực dữ liệu."
      />
    </>
  );
};

export default AdminDashboardPage;
