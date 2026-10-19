import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState, JobStatusBadge, LoadingBlock, PageHeader, Pagination, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { availableTransitions, canEditJob, companyWorkspaceApi, type JobTransition } from "@/services/api/companyWorkspaceApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { EMPLOYMENT_TYPE_LABEL, WORKPLACE_TYPE_LABEL, type JobDto } from "@/services/api/apiTypes";
import { WritesDisabledNotice } from "./EmployerDashboardPage";

const STATUSES = ["", "DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "EXPIRED", "ARCHIVED"];
const ACTION_LABEL: Record<JobTransition, string> = { publish: "Đăng tin", pause: "Tạm dừng", close: "Đóng tin" };

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
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const transition = async (job: JobDto, action: JobTransition) => {
    if (job.version === null) return;
    setBusyId(job.id);
    setMessage(null);
    try {
      await companyWorkspaceApi.transitionJob(active.id, job.id, job.version, action);
      setMessage({ tone: "ok", text: `Đã thực hiện: ${ACTION_LABEL[action]} — “${job.title}”.` });
      list.reload();
    } catch (e) {
      setMessage({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Tin tuyển dụng"
        subtitle="Quản lý vòng đời tin: nháp → đang tuyển → tạm dừng → đóng."
        actions={<Link className={`${ui.btn} ${ui.btnPrimary}`} to="/employer/jobs/new">Đăng tin mới</Link>}
      />
      <WritesDisabledNotice />
      <div className={ui.field} style={{ maxWidth: 240 }}>
        <label className={ui.label} htmlFor="status-filter">Trạng thái</label>
        <select id="status-filter" className={ui.select} value={status} onChange={(e) => setFilter("status", e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s === "" ? "Tất cả" : s}</option>)}
        </select>
      </div>
      {message && <div className={`${ui.notice} ${message.tone === "error" ? ui.noticeWarn : ""}`} role={message.tone === "error" ? "alert" : "status"}>{message.text}</div>}

      {list.loading ? <LoadingBlock rows={4} label="Đang tải tin tuyển dụng" /> : list.error ? <ApiErrorState error={list.error} onRetry={list.reload} /> : !list.data || list.data.data.length === 0 ? (
        <EmptyState title="Chưa có tin tuyển dụng" text={status ? "Không có tin nào ở trạng thái này." : "Doanh nghiệp chưa tạo tin nào."} actionLabel="Đăng tin mới" actionTo="/employer/jobs/new" />
      ) : (
        <>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className={ui.srOnly}>Danh sách tin tuyển dụng</caption>
              <thead><tr><th scope="col">Vị trí</th><th scope="col">Loại hình</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead>
              <tbody>
                {list.data.data.map((job) => (
                  <tr key={job.id}>
                    <td><strong>{job.title}</strong><div className={ui.hint}>{job.categoryName ?? "—"}</div></td>
                    <td>{job.employmentType ? EMPLOYMENT_TYPE_LABEL[job.employmentType] : "—"}<div className={ui.hint}>{job.workplaceType ? WORKPLACE_TYPE_LABEL[job.workplaceType] : ""}</div></td>
                    <td>{job.status ? <JobStatusBadge status={job.status} /> : "—"}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {canEditJob(job.status) && <Link className={ui.btn} to={`/employer/jobs/${job.id}/edit`}>Sửa</Link>}
                        <Link className={ui.btn} to={`/employer/applicants?jobId=${job.id}`}>Ứng viên</Link>
                        {availableTransitions(job.status).map((a) => (
                          <button key={a} type="button" className={ui.btn} disabled={!writes || busyId === job.id} aria-disabled={!writes}
                            title={writes ? undefined : "Thao tác ghi đang tắt"} onClick={() => transition(job, a)}>
                            {a === "publish" && job.status === "PAUSED" ? "Mở lại tin" : ACTION_LABEL[a]}
                          </button>
                        ))}
                        {job.status === "PUBLISHED" && <Link className={ui.link} to={`/jobs/${job.id}`}>Xem công khai</Link>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={list.data.pagination.page} totalPages={list.data.pagination.totalPages} onChange={(p) => setFilter("page", String(p))} />
        </>
      )}
    </>
  );
};

export default EmployerJobsPage;
