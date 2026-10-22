import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Users, ExternalLink, Filter } from "lucide-react";
import { EmptyState, JobStatusBadge, LoadingBlock, PageHeader, Pagination, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { availableTransitions, canEditJob, companyWorkspaceApi, type JobTransition } from "@/services/api/companyWorkspaceApi";
import { canManageJobs } from "@/features/company/companyWorkspacePermissions";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { EMPLOYMENT_TYPE_LABEL, WORKPLACE_TYPE_LABEL, type JobDto } from "@/services/api/apiTypes";
import { WritesDisabledNotice } from "./EmployerDashboardPage";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PUBLISHED", label: "Đang tuyển dụng" },
  { value: "DRAFT", label: "Bản nháp" },
  { value: "PAUSED", label: "Tạm dừng" },
  { value: "CLOSED", label: "Đã đóng tin" },
  { value: "EXPIRED", label: "Hết hạn" },
  { value: "ARCHIVED", label: "Lưu trữ" },
];

const ACTION_LABEL: Record<JobTransition, string> = {
  publish: "Đăng tin",
  pause: "Tạm dừng",
  close: "Đóng tin",
};

const EmployerJobsPage = () => {
  const { active } = useCompanyWorkspace();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const status = params.get("status") ?? "";
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const writes = isWorkspaceWritesEnabled();

  const list = useAsyncData(
    (s) => companyWorkspaceApi.listJobs(active.id, { page, pageSize: 20, status: status || undefined }, s),
    [active.id, page, status],
  );

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const transition = async (job: JobDto, action: JobTransition) => {
    if (job.version === null) return;
    setBusyId(job.id);
    setMessage(null);
    try {
      await companyWorkspaceApi.transitionJob(active.id, job.id, job.version, action);
      const actionName = action === "publish" && job.status === "PAUSED" ? "Mở lại tin" : ACTION_LABEL[action];
      setMessage({ tone: "ok", text: `Đã thực hiện: ${actionName} — “${job.title}”.` });
      list.reload();
    } catch (e) {
      setMessage({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setBusyId(null);
    }
  };

  const canManage = canManageJobs(active.memberRoleNames);

  return (
    <>
      <PageHeader
        title="Quản lý tin tuyển dụng"
        subtitle="Quản lý vòng đời tuyển dụng: bản nháp → đang tuyển dụng → tạm dừng → đóng tin."
        actions={
          canManage ? (
            <Link
              className={`${ui.btn} ${ui.btnPrimary}`}
              to="/employer/jobs/new"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={16} />
              <span>Đăng tin tuyển dụng mới</span>
            </Link>
          ) : undefined
        }
      />
      <WritesDisabledNotice />

      {/* FILTER BAR */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
          padding: "12px 16px",
          background: "var(--color-surface, #ffffff)",
          border: "1px solid var(--color-border, #e2e8f0)",
          borderRadius: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 260 }}>
          <Filter size={16} color="var(--color-text-secondary, #64748b)" />
          <label className={ui.label} htmlFor="status-filter" style={{ margin: 0, whiteSpace: "nowrap" }}>
            Lọc theo trạng thái:
          </label>
          <select
            id="status-filter"
            className={ui.select}
            style={{ width: "auto", minWidth: 160 }}
            value={status}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {list.data && (
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary, #64748b)", marginLeft: "auto" }}>
            Tổng cộng: <strong>{list.data.pagination.total}</strong> tin tuyển dụng
          </span>
        )}
      </div>

      {message && (
        <div
          className={`${ui.notice} ${message.tone === "error" ? ui.noticeWarn : ""}`}
          role={message.tone === "error" ? "alert" : "status"}
          style={{ marginBottom: 16 }}
        >
          {message.text}
        </div>
      )}

      {list.loading ? (
        <LoadingBlock rows={4} label="Đang tải danh sách tin tuyển dụng" />
      ) : list.error ? (
        <ApiErrorState error={list.error} onRetry={list.reload} />
      ) : !list.data || list.data.data.length === 0 ? (
        <EmptyState
          title="Chưa có tin tuyển dụng nào"
          text={status ? "Không tìm thấy tin nào phù hợp với bộ lọc trạng thái đã chọn." : "Doanh nghiệp của bạn chưa đăng tin tuyển dụng nào."}
          actionLabel="Tạo tin tuyển dụng đầu tiên"
          actionTo="/employer/jobs/new"
        />
      ) : (
        <>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className={ui.srOnly}>Danh sách tin tuyển dụng của doanh nghiệp</caption>
              <thead>
                <tr>
                  <th scope="col">Vị trí & Ngành nghề</th>
                  <th scope="col">Loại hình & Nơi làm việc</th>
                  <th scope="col">Hạn nộp hồ sơ</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác & Vòng đời</th>
                </tr>
              </thead>
              <tbody>
                {list.data.data.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{job.title}</div>
                      <div className={ui.hint}>{job.categoryName ?? "Chưa phân loại ngành nghề"}</div>
                    </td>
                    <td>
                      <div>{job.employmentType ? EMPLOYMENT_TYPE_LABEL[job.employmentType] || job.employmentType : "—"}</div>
                      <div className={ui.hint}>{job.workplaceType ? WORKPLACE_TYPE_LABEL[job.workplaceType] || job.workplaceType : ""}</div>
                    </td>
                    <td>
                      {job.applicationDeadline
                        ? new Date(job.applicationDeadline).toLocaleDateString("vi-VN")
                        : "Không thời hạn"}
                    </td>
                    <td>
                      {job.status ? <JobStatusBadge status={job.status} /> : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        {canManage && canEditJob(job.status) && (
                          <Link className={ui.btn} to={`/employer/jobs/${job.id}/edit`}>
                            Sửa tin
                          </Link>
                        )}
                        <Link
                          className={ui.btn}
                          to={`/employer/applicants?jobId=${job.id}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                          title="Xem danh sách ứng viên đã nộp hồ sơ vào tin này"
                        >
                          <Users size={13} />
                          <span>Ứng viên</span>
                        </Link>
                        {availableTransitions(job.status).map((a) => (
                          <button
                            key={a}
                            type="button"
                            className={ui.btn}
                            disabled={!writes || !canManage || busyId === job.id}
                            aria-disabled={!writes || !canManage}
                            title={
                              !canManage
                                ? "Tài khoản của bạn không có quyền thay đổi trạng thái tin tuyển dụng"
                                : !writes
                                ? "Thao tác ghi đang tắt"
                                : undefined
                            }
                            onClick={() => transition(job, a)}
                          >
                            {a === "publish" && job.status === "PAUSED" ? "Mở lại tin" : ACTION_LABEL[a]}
                          </button>
                        ))}
                        {job.status === "PUBLISHED" && (
                          <Link
                            className={ui.btn}
                            to={`/jobs/${job.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.85rem", padding: "5px 10px" }}
                            title="Kiểm tra tin tuyển dụng hiển thị công khai đối với ứng viên"
                          >
                            <ExternalLink size={13} />
                            <span>Xem hiển thị công khai</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={list.data.pagination.page}
            totalPages={list.data.pagination.totalPages}
            onChange={(p) => setFilter("page", String(p))}
          />
        </>
      )}
    </>
  );
};

export default EmployerJobsPage;
