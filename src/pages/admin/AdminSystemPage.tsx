import { useSearchParams } from "react-router-dom";
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, Pagination, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { adminApi } from "@/services/api/adminApi";

const AdminSystemPage = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);

  const audits = useAsyncData(
    (signal) => adminApi.listAudits({ page, pageSize: 20 }, signal),
    [page],
  );

  const setPage = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set("page", String(p));
    else next.delete("page");
    setParams(next);
  };

  return (
    <>
      <PageHeader
        title="Trạng thái hệ thống & Nhật ký hoạt động"
        subtitle="Thông tin cấu hình thời gian chạy, phiên bản và tình trạng các dịch vụ liên kết."
      />

      <div style={{ display: "grid", gap: 20 }}>
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

        <Card title="Nhật ký kiểm toán thực tế (GET /admin/audit)">
          <p style={{ margin: "0 0 12px", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            Dữ liệu kiểm toán bảo mật do máy chủ ghi nhận từ các hành động quản trị và thay đổi trạng thái (trường payload nhạy cảm được bảo vệ loại trừ).
          </p>

          {audits.loading ? (
            <LoadingBlock rows={3} label="Đang nạp nhật ký kiểm toán" />
          ) : audits.error ? (
            <ApiErrorState error={audits.error} onRetry={audits.reload} />
          ) : !audits.data || audits.data.data.length === 0 ? (
            <EmptyState
              title="Chưa có nhật ký kiểm toán"
              text="Chưa có sự kiện kiểm toán quản trị nào được ghi nhận trên cơ sở dữ liệu."
            />
          ) : (
            <>
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <caption className={ui.srOnly}>Nhật ký kiểm toán hệ thống</caption>
                  <thead>
                    <tr>
                      <th scope="col">Hành động</th>
                      <th scope="col">Đối tượng</th>
                      <th scope="col">Mã đối tượng</th>
                      <th scope="col">Người thực hiện</th>
                      <th scope="col">Thời điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.data.data.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <strong>{log.action}</strong>
                        </td>
                        <td>
                          <Badge tone="info">{log.targetType}</Badge>
                        </td>
                        <td>
                          <span className={ui.hint}>{log.targetId.slice(0, 8)}…</span>
                        </td>
                        <td>
                          <span className={ui.hint}>
                            {log.actorUserId ? `${log.actorUserId.slice(0, 8)}…` : "Hệ thống"}
                          </span>
                        </td>
                        <td>{log.createdAt ? new Date(log.createdAt).toLocaleString("vi-VN") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={audits.data.pagination.page}
                totalPages={audits.data.pagination.totalPages}
                onChange={setPage}
              />
            </>
          )}
        </Card>
      </div>
    </>
  );
};

export default AdminSystemPage;
