import { Badge, Card, PageHeader, ui } from "@/components/ui";

const AdminSystemPage = () => {
  return (
    <>
      <PageHeader
        title="Trạng thái hệ thống & Nhật ký hoạt động"
        subtitle="Thông tin cấu hình thời gian chạy, phiên bản và tình trạng các dịch vụ liên kết."
      />

      <div style={{ display: "grid", gap: 16 }}>
        <Card title="Cấu hình môi trường">
          <div className={ui.formGrid}>
            <div className={ui.field}>
              <span className={ui.label}>Ứng dụng</span>
              <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center" }}>
                FINDWORK Platform Frontend
              </span>
            </div>
            <div className={ui.field}>
              <span className={ui.label}>Chế độ môi trường</span>
              <div style={{ paddingTop: 6 }}>
                <Badge tone="info">{import.meta.env?.MODE || "development"}</Badge>
              </div>
            </div>
            <div className={ui.field}>
              <span className={ui.label}>API Base URL</span>
              <span className={ui.input} style={{ background: "var(--color-surface-soft)", display: "flex", alignItems: "center" }}>
                /api/v1 (Vite Proxy → NestJS Backend)
              </span>
            </div>
            <div className={ui.field}>
              <span className={ui.label}>Cổng ghi dữ liệu (Live Writes)</span>
              <div style={{ paddingTop: 6 }}>
                <Badge tone={import.meta.env?.VITE_ENABLE_WORKSPACE_WRITES === "true" ? "success" : "warning"}>
                  {import.meta.env?.VITE_ENABLE_WORKSPACE_WRITES === "true" ? "Đã bật" : "Đang khóa an toàn"}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Nhật ký kiểm toán (Audit Logs)">
          <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Hệ thống cơ sở dữ liệu đã chuẩn bị bảng lưu trữ <code>AuditLog</code>. API truy vấn danh sách log cho quản trị viên chưa được kết nối trong bản phát hành này.
          </p>
        </Card>
      </div>
    </>
  );
};

export default AdminSystemPage;
