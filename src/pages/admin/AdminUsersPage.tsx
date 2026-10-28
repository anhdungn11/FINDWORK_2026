import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  X,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { Badge, EmptyState, LoadingBlock, PageHeader, Pagination, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { adminApi, type AdminUserDto } from "@/services/api/adminApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { useAuthStore } from "@/store/authStore";

const STATUS_FILTERS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang hoạt động (ACTIVE)" },
  { value: "SUSPENDED", label: "Tạm khóa (SUSPENDED)" },
  { value: "DISABLED", label: "Vô hiệu hóa (DISABLED)" },
];

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
    });
  } catch {
    return iso;
  }
}

const AdminUsersPage = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = params.get("status") ?? "";
  const q = params.get("q") ?? "";

  const currentUser = useAuthStore((s) => s.user);

  const [searchInput, setSearchInput] = useState(q);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const writes = isWorkspaceWritesEnabled();

  const users = useAsyncData(
    (signal) =>
      adminApi.listUsers(
        { page, pageSize: 20, status: status || undefined, q: q || undefined },
        signal,
      ),
    [page, status, q],
  );

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  // Modal Escape key support
  useEffect(() => {
    if (!selectedUser) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedUser(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedUser]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter("q", searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setParams(new URLSearchParams());
  };

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = async (targetUser: AdminUserDto, nextStatus: "ACTIVE" | "SUSPENDED") => {
    if (targetUser.id === currentUser?.id) {
      setNotice({ tone: "error", text: "Quản trị viên không thể tự thay đổi trạng thái của chính mình." });
      return;
    }
    setBusyId(targetUser.id);
    setNotice(null);
    try {
      const updated = await adminApi.setUserStatus(targetUser.id, nextStatus);
      setNotice({
        tone: "ok",
        text: `Đã cập nhật trạng thái người dùng “${targetUser.email}” thành ${nextStatus}.`,
      });
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(updated);
      }
      users.reload();
    } catch (e) {
      setNotice({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDisable = async (targetUser: AdminUserDto) => {
    if (targetUser.id === currentUser?.id) {
      setNotice({ tone: "error", text: "Quản trị viên không thể tự vô hiệu hóa tài khoản của chính mình." });
      return;
    }
    if (!window.confirm(`Xác nhận vô hiệu hóa vĩnh viễn tài khoản “${targetUser.email}”? Hành động này không thể hoàn tác.`)) {
      return;
    }
    setBusyId(targetUser.id);
    setNotice(null);
    try {
      await adminApi.disableUser(targetUser.id);
      setNotice({
        tone: "ok",
        text: `Đã vô hiệu hóa vĩnh viễn tài khoản “${targetUser.email}”.`,
      });
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser({ ...selectedUser, status: "DISABLED" });
      }
      users.reload();
    } catch (e) {
      setNotice({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Quản lý người dùng hệ thống"
        subtitle="Tra cứu tài khoản, theo dõi tình trạng xác thực email và quản lý trạng thái kích hoạt / khóa tài khoản."
        actions={
          <button
            type="button"
            className={`${ui.btn} ${ui.btnOutline}`}
            onClick={users.reload}
            disabled={users.loading}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <RefreshCw size={15} className={users.loading ? "spin" : ""} />
            <span>Làm mới</span>
          </button>
        }
      />

      {notice && (
        <div
          className={`${ui.notice} ${notice.tone === "error" ? ui.noticeWarn : ""}`}
          role={notice.tone === "error" ? "alert" : "status"}
          style={{ marginBottom: 20 }}
        >
          {notice.text}
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
          background: "#ffffff",
          padding: 16,
          borderRadius: 10,
          border: "1px solid var(--color-border, #e2e8f0)",
          alignItems: "center",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, flex: 1, minWidth: 260 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              color="#94a3b8"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              className={ui.input}
              placeholder="Tìm kiếm theo email người dùng..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`}>
            Tìm kiếm
          </button>
        </form>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Filter size={16} color="#64748b" />
          <select
            className={ui.select}
            value={status}
            onChange={(e) => setFilter("status", e.target.value)}
            style={{ minWidth: 190 }}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {(q || status) && (
            <button
              type="button"
              className={`${ui.btn} ${ui.btnOutline}`}
              onClick={handleClearFilters}
              title="Xóa bộ lọc"
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* DATA TABLE */}
      {users.loading ? (
        <LoadingBlock rows={5} label="Đang nạp danh sách tài khoản người dùng" />
      ) : users.error ? (
        <ApiErrorState error={users.error} onRetry={users.reload} />
      ) : !users.data || users.data.data.length === 0 ? (
        <EmptyState
          title="Không tìm thấy người dùng phù hợp"
          text={q || status ? "Không có tài khoản nào khớp với bộ lọc hiện tại. Thử xóa bộ lọc để xem toàn bộ danh sách." : "Hệ thống chưa có người dùng nào được tạo."}
          actionLabel={q || status ? "Xóa bộ lọc" : undefined}
          onAction={q || status ? handleClearFilters : undefined}
        />
      ) : (
        <>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className={ui.srOnly}>Danh sách người dùng hệ thống</caption>
              <thead>
                <tr>
                  <th scope="col">Tài khoản Email</th>
                  <th scope="col">Xác thực Email</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày đăng ký</th>
                  <th scope="col" style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.data.data.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const isBusy = busyId === u.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600, color: "#1e293b" }}>{u.email}</span>
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                            ID: {u.id.slice(0, 8)}…
                            <button
                              type="button"
                              onClick={() => handleCopy(u.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                              title="Sao chép ID"
                            >
                              {copiedId === u.id ? <Check size={12} color="#16a34a" /> : <Copy size={12} color="#94a3b8" />}
                            </button>
                          </span>
                        </div>
                      </td>
                      <td>
                        {u.emailVerifiedAt ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#16a34a", fontSize: "0.825rem", fontWeight: 600 }}>
                            <CheckCircle2 size={15} />
                            <span>Đã xác thực</span>
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#d97706", fontSize: "0.825rem" }}>
                            <AlertTriangle size={15} />
                            <span>Chưa xác thực</span>
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge
                          tone={
                            u.status === "ACTIVE"
                              ? "success"
                              : u.status === "SUSPENDED"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {u.status === "ACTIVE"
                            ? "Hoạt động"
                            : u.status === "SUSPENDED"
                            ? "Tạm khóa"
                            : "Vô hiệu hóa"}
                        </Badge>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.825rem", color: "#64748b" }}>
                          {formatDate(u.createdAt)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                          <button
                            type="button"
                            className={`${ui.btn} ${ui.btnOutline}`}
                            style={{ padding: "4px 8px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                            onClick={() => setSelectedUser(u)}
                            title="Xem chi tiết người dùng"
                          >
                            <Eye size={14} />
                            <span>Chi tiết</span>
                          </button>

                          {u.status !== "DISABLED" && writes && !isCurrent && (
                            <>
                              {u.status === "ACTIVE" ? (
                                <button
                                  type="button"
                                  className={`${ui.btn} ${ui.btnOutline}`}
                                  style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#d97706", borderColor: "#fde68a" }}
                                  disabled={isBusy}
                                  onClick={() => handleStatusChange(u, "SUSPENDED")}
                                  title="Tạm khóa tài khoản này"
                                >
                                  <Lock size={13} style={{ marginRight: 3 }} />
                                  <span>Khóa</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className={`${ui.btn} ${ui.btnOutline}`}
                                  style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#16a34a", borderColor: "#bbf7d0" }}
                                  disabled={isBusy}
                                  onClick={() => handleStatusChange(u, "ACTIVE")}
                                  title="Mở khóa tài khoản này"
                                >
                                  <Unlock size={13} style={{ marginRight: 3 }} />
                                  <span>Mở khóa</span>
                                </button>
                              )}

                              <button
                                type="button"
                                className={`${ui.btn} ${ui.btnDanger}`}
                                style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                                disabled={isBusy}
                                onClick={() => handleDisable(u)}
                                title="Vô hiệu hóa tài khoản vĩnh viễn"
                              >
                                Vô hiệu hóa
                              </button>
                            </>
                          )}

                          {isCurrent && (
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>
                              (Tài khoản của bạn)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20 }}>
            <Pagination
              page={users.data.pagination.page}
              totalPages={users.data.pagination.totalPages}
              onChange={(p: number) => setFilter("page", String(p))}
            />
          </div>
        </>
      )}

      {/* USER DETAIL MODAL */}
      {selectedUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-detail-title"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setSelectedUser(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              maxWidth: 540,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 id="user-detail-title" style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 700, color: "#1e293b" }}>
                  Chi tiết tài khoản người dùng
                </h3>
                <span style={{ fontSize: "0.825rem", color: "#64748b" }}>
                  Mã hệ thống: {selectedUser.id}
                </span>
              </div>
              <button
                type="button"
                className={ui.btn}
                style={{ padding: 6, background: "none", border: "none", cursor: "pointer" }}
                onClick={() => setSelectedUser(null)}
                aria-label="Đóng cửa sổ chi tiết"
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 2 }}>ĐỊA CHỈ EMAIL</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>{selectedUser.email}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>TRẠNG THÁI TÀI KHOẢN</div>
                  <Badge
                    tone={
                      selectedUser.status === "ACTIVE"
                        ? "success"
                        : selectedUser.status === "SUSPENDED"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {selectedUser.status}
                  </Badge>
                </div>

                <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>XÁC THỰC EMAIL</div>
                  {selectedUser.emailVerifiedAt ? (
                    <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 600 }}>
                      ✓ {formatDate(selectedUser.emailVerifiedAt)}
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.8rem", color: "#d97706" }}>Chưa xác thực</span>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 2 }}>NGÀY TẠO TÀI KHOẢN</div>
                  <div style={{ fontSize: "0.85rem", color: "#1e293b" }}>{formatDate(selectedUser.createdAt)}</div>
                </div>

                <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 2 }}>CẬP NHẬT GẦN NHẤT</div>
                  <div style={{ fontSize: "0.85rem", color: "#1e293b" }}>{formatDate(selectedUser.updatedAt)}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className={`${ui.btn} ${ui.btnOutline}`}
                onClick={() => setSelectedUser(null)}
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

export default AdminUsersPage;
