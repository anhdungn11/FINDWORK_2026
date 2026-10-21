import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState, JobStatusBadge, LoadingBlock, PageHeader, Pagination, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { adminApi, type AdminJobDto } from "@/services/api/adminApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";

const STATUS_FILTERS = ["", "DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "EXPIRED", "ARCHIVED"];

const AdminJobsPage = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = params.get("status") ?? "";

  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const writes = isWorkspaceWritesEnabled();

  const jobs = useAsyncData(
    (signal) =>
      adminApi.listJobs(
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

  const handleClose = async (job: AdminJobDto) => {
    if (!window.confirm(`Xác nhận gỡ bỏ/đóng tin tuyển dụng “${job.title}”?`)) return;
    setBusyId(job.id);
    setNotice(null);
    try {
      await adminApi.closeJob(job.id);
      setNotice({
        tone: "ok",
        text: `Đã đóng/kiểm duyệt gỡ bỏ tin tuyển dụng “${job.title}”.`,
      });
      jobs.reload();
    } catch (e) {
      setNotice({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Kiểm duyệt tin tuyển dụng toàn hệ thống"
        subtitle="Rà soát nội dung tin đăng trên toàn sàn, theo dõi trạng thái và cưỡng chế đóng tin vi phạm."
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
            Trạng thái tin
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

      {jobs.loading ? (
        <LoadingBlock rows={4} label="Đang tải danh sách tin tuyển dụng toàn sàn" />
      ) : jobs.error ? (
        <ApiErrorState error={jobs.error} onRetry={jobs.reload} />
      ) : !jobs.data || jobs.data.data.length === 0 ? (
        <EmptyState
          title="Không tìm thấy tin tuyển dụng"
          text={status ? "Không có tin đăng nào phù hợp với bộ lọc trạng thái." : "Hệ thống chưa có tin tuyển dụng nào được tạo."}
        />
      ) : (
        <>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className={ui.srOnly}>Danh sách tin tuyển dụng toàn hệ thống</caption>
              <thead>
                <tr>
                  <th scope="col">Vị trí tuyển dụng</th>
                  <th scope="col">Mã công ty</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thời hạn</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {jobs.data.data.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <strong>{job.title}</strong>
                      <div className={ui.hint}>ID: {job.id.slice(0, 8)}…</div>
                    </td>
                    <td>
                      <span className={ui.hint}>{job.companyId.slice(0, 8)}…</span>
                    </td>
                    <td>
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td>
                      {job.applicationDeadline
                        ? new Date(job.applicationDeadline).toLocaleDateString("vi-VN")
                        : "Không thời hạn"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        {job.status === "PUBLISHED" && (
                          <Link className={ui.link} to={`/jobs/${job.id}`}>
                            Xem công khai
                          </Link>
                        )}
                        {(job.status === "PUBLISHED" || job.status === "PAUSED") && (
                          <button
                            type="button"
                            className={ui.btn}
                            disabled={!writes || busyId === job.id}
                            title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
                            onClick={() => handleClose(job)}
                          >
                            Đóng / Gỡ tin
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
            page={jobs.data.pagination.page}
            totalPages={jobs.data.pagination.totalPages}
            onChange={(p) => setFilter("page", String(p))}
          />
        </>
      )}
    </>
  );
};

export default AdminJobsPage;
