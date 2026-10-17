import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, EmptyState, LoadingBlock, PageHeader, Pagination, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { adminApi, type AdminUserDto } from "@/services/api/adminApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";

const STATUS_FILTERS = ["", "ACTIVE", "SUSPENDED", "DISABLED"];

const AdminUsersPage = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = params.get("status") ?? "";
  const q = params.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(q);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const writes = isWorkspaceWritesEnabled();

  const users = useAsyncData(
    (signal) =>
      adminApi.listUsers(
        { page, pageSize: 20, status: status || undefined, q: q || undefined },
        signal,
      ),
    [page, status, q],
  );

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

  const handleStatusChange = async (user: AdminUserDto, nextStatus: "ACTIVE" | "SUSPENDED") => {
    setBusyId(user.id);
    setNotice(null);
    try {
      await adminApi.setUserStatus(user.id, nextStatus);
      setNotice({
        tone: "ok",
        text: `Đã cập nhật trạng thái người dùng ${user.email} thành ${nextStatus}.`,
      });
      users.reload();
    } catch (e) {
      setNotice({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDisable = async (user: AdminUserDto) => {
    if (!window.confirm(`Xác nhận vô hiệu hóa vĩnh viễn tài khoản ${user.email}?`)) return;
    setBusyId(user.id);
    setNotice(null);
    try {
      await adminApi.disableUser(user.id);
      setNotice({
        tone: "ok",
        text: `Đã vô hiệu hóa tài khoản ${user.email}.`,
      });
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
        title="Quản lý người dùng nền tảng"
        subtitle="Tra cứu tài khoản, theo dõi tình trạng kích hoạt và quản lý trạng thái tài khoản."
      />

      {notice && (
        <div
          className={`${ui.notice} ${notice.tone === "error" ? ui.noticeWarn : ""}`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20, alignItems: "flex-end" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, flex: 1, minWidth: 260 }}>
          <div className={ui.field} style={{ flex: 1, marginBottom: 0 }}>
            <label className={ui.label} htmlFor="user-search">
              Tìm theo Email
            </label>
            <input
              id="user-search"
              className={ui.input}
              placeholder="Nhập tối thiểu 2 ký tự..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} style={{ alignSelf: "flex-end" }}>
            Tìm kiếm
          </button>
        </form>

        <div className={ui.field} style={{ minWidth: 180, marginBottom: 0 }}>
          <label className={ui.label} htmlFor="status-filter">
            Trạng thái
          </label>
          <select
            id="status-filter"
            className={ui.select}
            value={status}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === "" ? "Tất cả trạng thái" : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {users.loading ? (
        <LoadingBlock rows={4} label="Đang tải danh sách người dùng" />
      ) : users.error ? (
        <ApiErrorState error={users.error} onRetry={users.reload} />
      ) : !users.data || users.data.data.length === 0 ? (
        <EmptyState
          title="Không tìm thấy người dùng"
          text={q || status ? "Không có tài khoản nào phù hợp với bộ lọc hiện tại." : "Hệ thống chưa có người dùng."}
        />
      ) : (
        <>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className={ui.srOnly}>Danh sách người dùng nền tảng</caption>
              <thead>
                <tr>
                  <th scope="col">Tài khoản (Email)</th>
                  <th scope="col">Xác thực Email</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.data.data.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.email}</strong>
                      <div className={ui.hint}>ID: {u.id}</div>
                    </td>
                    <td>
                      {u.emailVerifiedAt ? (
                        <Badge tone="success">Đã xác thực</Badge>
                      ) : (
                        <Badge tone="neutral">Chưa xác thực</Badge>
                      )}
                    </td>
                    <td>
                      <Badge
                        tone={
                          u.status === "ACTIVE"
                            ? "success"
                            : u.status === "DISABLED"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {u.status}
                      </Badge>
                    </td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString("vi-VN") : "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {u.status === "ACTIVE" && (
                          <button
                            type="button"
                            className={ui.btn}
                            disabled={!writes || busyId === u.id}
                            title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                            onClick={() => handleStatusChange(u, "SUSPENDED")}
                          >
                            Tạm đình chỉ
                          </button>
                        )}
                        {u.status === "SUSPENDED" && (
                          <button
                            type="button"
                            className={`${ui.btn} ${ui.btnPrimary}`}
                            disabled={!writes || busyId === u.id}
                            title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                            onClick={() => handleStatusChange(u, "ACTIVE")}
                          >
                            Kích hoạt lại
                          </button>
                        )}
                        {u.status !== "DISABLED" && (
                          <button
                            type="button"
                            className={ui.btn}
                            disabled={!writes || busyId === u.id}
                            title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                            onClick={() => handleDisable(u)}
                          >
                            Khóa vĩnh viễn
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={users.data.pagination.page}
            totalPages={users.data.pagination.totalPages}
            onChange={(p) => setFilter("page", String(p))}
          />
        </>
      )}
    </>
  );
};

export default AdminUsersPage;
