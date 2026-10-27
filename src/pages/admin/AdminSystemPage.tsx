import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Terminal,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  X,
  Copy,
  Check,
  RefreshCw,
  Server,
  Layers,
  Database,
  Lock,
} from "lucide-react";
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, Pagination, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { adminApi, type AdminAuditDto } from "@/services/api/adminApi";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

const AdminSystemPage = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [selectedAudit, setSelectedAudit] = useState<AdminAuditDto | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState("");

  const audits = useAsyncData(
    (signal) => adminApi.listAudits({ page, pageSize: 20 }, signal),
    [page],
  );

  // Escape key support
  useEffect(() => {
    if (!selectedAudit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedAudit(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedAudit]);

  const setPage = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set("page", String(p));
    else next.delete("page");
    setParams(next);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const allLogs = audits.data?.data ?? [];
  const filteredLogs = filterAction.trim()
    ? allLogs.filter(
        (l) =>
          l.action.toLowerCase().includes(filterAction.toLowerCase()) ||
          l.targetType.toLowerCase().includes(filterAction.toLowerCase()) ||
          l.targetId.toLowerCase().includes(filterAction.toLowerCase()),
      )
    : allLogs;

  return (
    <>
      <PageHeader
        title="Trạng thái hệ thống & Nhật ký kiểm toán"
        subtitle="Thông tin thời gian chạy, phiên bản dịch vụ nền tảng và kiểm tra nhật ký kiểm toán bảo mật (Audit Logs)."
        actions={
          <button
            type="button"
            className={`${ui.btn} ${ui.btnOutline}`}
            onClick={audits.reload}
            disabled={audits.loading}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <RefreshCw size={15} className={audits.loading ? "spin" : ""} />
            <span>Làm mới nhật ký</span>
          </button>
        }
      />

      {/* SYSTEM RUNTIME CONFIGURATION */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 28 }}>
        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Server size={18} color="var(--color-primary, #4f6ef7)" />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>Ứng dụng Frontend</span>
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>FINDWORK Enterprise</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>
            Môi trường: <Badge tone="info">{import.meta.env?.MODE || "production"}</Badge>
          </div>
        </div>

        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Database size={18} color="#16a34a" />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>Backend Core REST API</span>
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>/api/v1 (NestJS + PostgreSQL)</div>
          <div style={{ fontSize: "0.8rem", color: "#16a34a", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a" }} />
            <span>Đang hoạt động ổn định</span>
          </div>
        </div>

        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Lock size={18} color={isWorkspaceWritesEnabled() ? "#16a34a" : "#d97706"} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>Cổng an toàn Live Writes</span>
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
            {isWorkspaceWritesEnabled() ? "ĐÃ BẬT GHI DỮ LIỆU" : "KHÓA AN TOÀN CHỈ ĐỌC"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 4 }}>
            VITE_ENABLE_WORKSPACE_WRITES = {String(import.meta.env?.VITE_ENABLE_WORKSPACE_WRITES)}
          </div>
        </div>
      </div>

      {/* AUDIT LOG SECTION */}
      <Card title="Nhật ký kiểm toán bảo mật (GET /admin/audit)">
        <p style={{ margin: "0 0 16px", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          Nhật ký được máy chủ ghi nhận bất biến mỗi khi có hành động quản trị (thay đổi trạng thái tài khoản, xét duyệt doanh nghiệp, cưỡng chế đóng tin).
        </p>

        {/* Client filter */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ position: "relative", maxWidth: 360, width: "100%" }}>
            <Search
              size={15}
              color="#94a3b8"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              className={ui.input}
              placeholder="Lọc nhật ký theo hành động hoặc đối tượng..."
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              style={{ paddingLeft: 32, fontSize: "0.85rem" }}
            />
          </div>
          {filterAction && (
            <button
              type="button"
              className={`${ui.btn} ${ui.btnOutline}`}
              onClick={() => setFilterAction("")}
              style={{ fontSize: "0.825rem" }}
            >
              Xóa lọc
            </button>
          )}
        </div>

        {audits.loading ? (
          <LoadingBlock rows={4} label="Đang nạp nhật ký kiểm toán hệ thống" />
        ) : audits.error ? (
          <ApiErrorState error={audits.error} onRetry={audits.reload} />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="Không có nhật ký kiểm toán nào"
            text={
              filterAction
                ? "Không tìm thấy sự kiện kiểm toán khớp với từ khóa lọc."
                : "Chưa có sự kiện kiểm toán quản trị nào được ghi nhận trên cơ sở dữ liệu."
            }
          />
        ) : (
          <>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <caption className={ui.srOnly}>Nhật ký kiểm toán hệ thống</caption>
                <thead>
                  <tr>
                    <th scope="col">Hành động kiểm toán</th>
                    <th scope="col">Loại đối tượng</th>
                    <th scope="col">Mã đối tượng</th>
                    <th scope="col">Người thực hiện</th>
                    <th scope="col">Thời điểm</th>
                    <th scope="col" style={{ textAlign: "right" }}>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <strong style={{ color: "#1e293b", fontSize: "0.875rem" }}>
                          {log.action}
                        </strong>
                      </td>
                      <td>
                        <Badge tone="info">{log.targetType}</Badge>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {log.targetId.slice(0, 8)}…
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {log.actorUserId ? `${log.actorUserId.slice(0, 8)}…` : "Hệ thống"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {formatDate(log.createdAt)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className={`${ui.btn} ${ui.btnOutline}`}
                          style={{ padding: "3px 8px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                          onClick={() => setSelectedAudit(log)}
                        >
                          <Eye size={13} />
                          <span>Xem</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 20 }}>
              <Pagination
                page={audits.data?.pagination.page || 1}
                totalPages={audits.data?.pagination.totalPages || 1}
                total={audits.data?.pagination.total || 0}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      {/* AUDIT DETAIL MODAL */}
      {selectedAudit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setSelectedAudit(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              maxWidth: 580,
              width: "100%",
              padding: 24,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 id="audit-modal-title" style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 700, color: "#1e293b" }}>
                  Chi tiết bản ghi kiểm toán
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Mã bản ghi: {selectedAudit.id}
                </span>
              </div>
              <button
                type="button"
                className={ui.btn}
                style={{ padding: 6, background: "none", border: "none", cursor: "pointer" }}
                onClick={() => setSelectedAudit(null)}
                aria-label="Đóng cửa sổ"
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 2 }}>HÀNH ĐỘNG KIỂM TOÁN</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>{selectedAudit.action}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>LOẠI ĐỐI TƯỢNG</div>
                  <Badge tone="info">{selectedAudit.targetType}</Badge>
                </div>
                <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>THỜI ĐIỂM GHI NHẬN</div>
                  <div style={{ fontSize: "0.85rem", color: "#1e293b" }}>{formatDate(selectedAudit.createdAt)}</div>
                </div>
              </div>

              <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 2 }}>MÃ ĐỐI TƯỢNG (TARGET ID)</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <code style={{ fontSize: "0.85rem", color: "#1e293b" }}>{selectedAudit.targetId}</code>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedAudit.targetId)}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "#4f6ef7" }}
                  >
                    {copiedId === selectedAudit.targetId ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                    <span>{copiedId === selectedAudit.targetId ? "Đã chép" : "Sao chép"}</span>
                  </button>
                </div>
              </div>

              <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 2 }}>NGƯỜI THỰC HIỆN (ACTOR USER ID)</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <code style={{ fontSize: "0.85rem", color: "#1e293b" }}>{selectedAudit.actorUserId || "Hệ thống tự động"}</code>
                  {selectedAudit.actorUserId && (
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedAudit.actorUserId!)}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "#4f6ef7" }}
                    >
                      {copiedId === selectedAudit.actorUserId ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                      <span>{copiedId === selectedAudit.actorUserId ? "Đã chép" : "Sao chép"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className={`${ui.btn} ${ui.btnOutline}`}
                onClick={() => setSelectedAudit(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSystemPage;
