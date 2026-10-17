import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, EmptyState, LoadingBlock, PageHeader, Pagination, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { adminApi, type AdminCompanyDto } from "@/services/api/adminApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";

const STATUS_FILTERS = ["", "ACTIVE", "SUSPENDED", "ARCHIVED"];

const AdminCompaniesPage = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = params.get("status") ?? "";

  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const writes = isWorkspaceWritesEnabled();

  const companies = useAsyncData(
    (signal) =>
      adminApi.listCompanies(
        { page, pageSize: 20, status: status || undefined },
        signal,
      ),
    [page, status],
  );

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const handleVerification = async (company: AdminCompanyDto, vStatus: "VERIFIED" | "REJECTED") => {
    setBusyId(company.id);
    setNotice(null);
    try {
      await adminApi.verifyCompany(company.id, vStatus);
      setNotice({
        tone: "ok",
        text: `Đã ${vStatus === "VERIFIED" ? "xác minh" : "từ chối xác minh"} doanh nghiệp “${company.name}”.`,
      });
      companies.reload();
    } catch (e) {
      setNotice({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusChange = async (company: AdminCompanyDto, nextStatus: "ACTIVE" | "SUSPENDED") => {
    setBusyId(company.id);
    setNotice(null);
    try {
      await adminApi.setCompanyStatus(company.id, nextStatus);
      setNotice({
        tone: "ok",
        text: `Đã cập nhật trạng thái doanh nghiệp “${company.name}” thành ${nextStatus}.`,
      });
      companies.reload();
    } catch (e) {
      setNotice({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Quản lý doanh nghiệp & Xét duyệt hồ sơ"
        subtitle="Kiểm tra thông tin pháp lý doanh nghiệp, cấp quyết định xác minh và quản lý trạng thái hoạt động."
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
      <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-end" }}>
        <div className={ui.field} style={{ minWidth: 200, marginBottom: 0 }}>
          <label className={ui.label} htmlFor="status-filter">
            Trạng thái hoạt động
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

      {companies.loading ? (
        <LoadingBlock rows={4} label="Đang tải danh sách doanh nghiệp" />
      ) : companies.error ? (
        <ApiErrorState error={companies.error} onRetry={companies.reload} />
      ) : !companies.data || companies.data.data.length === 0 ? (
        <EmptyState
          title="Không tìm thấy doanh nghiệp"
          text={status ? "Không có doanh nghiệp nào phù hợp với bộ lọc trạng thái." : "Hệ thống chưa có doanh nghiệp nào đăng ký."}
        />
      ) : (
        <>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className={ui.srOnly}>Danh sách doanh nghiệp trên hệ thống</caption>
              <thead>
                <tr>
                  <th scope="col">Doanh nghiệp</th>
                  <th scope="col">Xác minh</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {companies.data.data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div className={ui.hint}>{c.slug ? `slug: ${c.slug}` : `ID: ${c.id.slice(0, 8)}…`}</div>
                    </td>
                    <td>
                      <Badge
                        tone={
                          c.verificationStatus === "VERIFIED"
                            ? "success"
                            : c.verificationStatus === "REJECTED"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {c.verificationStatus === "VERIFIED"
                          ? "Đã xác minh"
                          : c.verificationStatus === "REJECTED"
                          ? "Bị từ chối"
                          : "Chờ xác minh"}
                      </Badge>
                      {c.verifiedAt && (
                        <div className={ui.hint}>
                          {new Date(c.verifiedAt).toLocaleDateString("vi-VN")}
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge
                        tone={
                          c.status === "ACTIVE"
                            ? "success"
                            : c.status === "SUSPENDED"
                            ? "warning"
                            : "neutral"
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString("vi-VN") : "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {c.status === "ACTIVE" && c.verificationStatus !== "VERIFIED" && (
                          <button
                            type="button"
                            className={`${ui.btn} ${ui.btnPrimary}`}
                            disabled={!writes || busyId === c.id}
                            title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                            onClick={() => handleVerification(c, "VERIFIED")}
                          >
                            Xác minh
                          </button>
                        )}
                        {c.status === "ACTIVE" && c.verificationStatus !== "REJECTED" && (
                          <button
                            type="button"
                            className={ui.btn}
                            disabled={!writes || busyId === c.id}
                            title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                            onClick={() => handleVerification(c, "REJECTED")}
                          >
                            Từ chối
                          </button>
                        )}
                        {c.status === "ACTIVE" && (
                          <button
                            type="button"
                            className={ui.btn}
                            disabled={!writes || busyId === c.id}
                            title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                            onClick={() => handleStatusChange(c, "SUSPENDED")}
                          >
                            Đình chỉ
                          </button>
                        )}
                        {c.status === "SUSPENDED" && (
                          <button
                            type="button"
                            className={`${ui.btn} ${ui.btnPrimary}`}
                            disabled={!writes || busyId === c.id}
                            title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                            onClick={() => handleStatusChange(c, "ACTIVE")}
                          >
                            Kích hoạt lại
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
            page={companies.data.pagination.page}
            totalPages={companies.data.pagination.totalPages}
            onChange={(p) => setFilter("page", String(p))}
          />
        </>
      )}
    </>
  );
};

export default AdminCompaniesPage;
