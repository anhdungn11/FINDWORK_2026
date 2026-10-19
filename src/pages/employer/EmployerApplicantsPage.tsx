import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Badge,
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Pagination,
  ui,
} from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import {
  availableReviewTransitions,
  companyWorkspaceApi,
} from "@/services/api/companyWorkspaceApi";
import {
  APPLICATION_STATUS_LABEL,
  formatAvailability,
  formatContactMethod,
  type ApplicationReviewStatus,
  type CompanyApplicationDto,
} from "@/services/api/apiTypes";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { WritesDisabledNotice } from "./EmployerDashboardPage";

const STATUS_FILTERS = [
  "",
  "SUBMITTED",
  "REVIEWING",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFERED",
  "REJECTED",
];

const TRANSITION_LABEL: Record<ApplicationReviewStatus, string> = {
  REVIEWING: "Xem xét",
  SHORTLISTED: "Sơ tuyển",
  INTERVIEW: "Phỏng vấn",
  OFFERED: "Gửi Offer",
  REJECTED: "Từ chối",
};

const EmployerApplicantsPage = () => {
  const { active } = useCompanyWorkspace();
  const [params, setParams] = useSearchParams();
  const selectedJobId = params.get("jobId") ?? "";
  const status = params.get("status") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [activeApplication, setActiveApplication] = useState<CompanyApplicationDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const writes = isWorkspaceWritesEnabled();

  // Load company's jobs for selecting job scope
  const jobs = useAsyncData(
    (s) => companyWorkspaceApi.listJobs(active.id, { pageSize: 100 }, s),
    [active.id],
  );

  // Set default job if none selected and jobs are loaded
  const currentJobId = selectedJobId || (jobs.data?.data[0]?.id ?? "");

  // Load applications for current job
  const applications = useAsyncData(
    (s) => {
      if (!currentJobId) return Promise.resolve({ data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } });
      return companyWorkspaceApi.listJobApplications(
        active.id,
        currentJobId,
        { page, pageSize: 20, status: status || undefined },
        s,
      );
    },
    [active.id, currentJobId, page, status],
  );

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const openDetail = async (app: CompanyApplicationDto) => {
    setDetailLoading(true);
    try {
      const full = await companyWorkspaceApi.getApplication(active.id, currentJobId, app.id);
      setActiveApplication(full);
    } catch {
      setActiveApplication(app);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReview = async (app: CompanyApplicationDto, nextStatus: ApplicationReviewStatus) => {
    setBusyId(app.id);
    setNotice(null);
    try {
      const updated = await companyWorkspaceApi.reviewApplication(
        active.id,
        currentJobId,
        app.id,
        app.version,
        nextStatus,
      );
      setNotice({
        tone: "ok",
        text: `Đã chuyển trạng thái ứng viên “${app.fullNameSnapshot || app.emailSnapshot || app.id}” sang: ${APPLICATION_STATUS_LABEL[nextStatus]}.`,
      });
      if (activeApplication?.id === app.id) {
        setActiveApplication(updated);
      }
      applications.reload();
    } catch (e) {
      setNotice({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Quản lý hồ sơ ứng viên"
        subtitle="Theo dõi và đánh giá ứng viên theo từng tin tuyển dụng theo quy trình chuẩn."
      />
      <WritesDisabledNotice />

      {notice && (
        <div
          className={`${ui.notice} ${notice.tone === "error" ? ui.noticeWarn : ""}`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      )}

      {/* Filter panel */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div className={ui.field} style={{ minWidth: 260, maxWidth: 380, flex: 1 }}>
          <label className={ui.label} htmlFor="job-select">
            Tin tuyển dụng
          </label>
          {jobs.loading ? (
            <LoadingBlock rows={1} />
          ) : !jobs.data || jobs.data.data.length === 0 ? (
            <p className={ui.hint}>Doanh nghiệp chưa có tin tuyển dụng nào.</p>
          ) : (
            <select
              id="job-select"
              className={ui.select}
              value={currentJobId}
              onChange={(e) => setFilter("jobId", e.target.value)}
            >
              {jobs.data.data.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.status})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className={ui.field} style={{ minWidth: 200, maxWidth: 260 }}>
          <label className={ui.label} htmlFor="status-filter">
            Trạng thái xét duyệt
          </label>
          <select
            id="status-filter"
            className={ui.select}
            value={status}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === "" ? "Tất cả trạng thái" : APPLICATION_STATUS_LABEL[s as keyof typeof APPLICATION_STATUS_LABEL] || s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!currentJobId ? (
        <EmptyState
          title="Chưa chọn tin tuyển dụng"
          text="Vui lòng tạo hoặc chọn một tin tuyển dụng để xem danh sách hồ sơ ứng tuyển."
          actionLabel="Đăng tin tuyển dụng"
          actionTo="/employer/jobs/new"
        />
      ) : applications.loading ? (
        <LoadingBlock rows={4} label="Đang tải danh sách ứng viên" />
      ) : applications.error ? (
        <ApiErrorState error={applications.error} onRetry={applications.reload} />
      ) : !applications.data || applications.data.data.length === 0 ? (
        <EmptyState
          title="Chưa có hồ sơ ứng tuyển"
          text={status ? "Không tìm thấy hồ sơ nào phù hợp với bộ lọc trạng thái." : "Hiện chưa có ứng viên nào nộp hồ sơ vào vị trí này."}
        />
      ) : (
        <>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className={ui.srOnly}>Danh sách ứng viên ứng tuyển vào tin đang chọn</caption>
              <thead>
                <tr>
                  <th scope="col">Ứng viên</th>
                  <th scope="col">Liên hệ</th>
                  <th scope="col">Ngày nộp</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {applications.data.data.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <strong>{app.fullNameSnapshot || "Chưa cập nhật tên"}</strong>
                      <div className={ui.hint}>ID: {app.id.slice(0, 8)}…</div>
                    </td>
                    <td>
                      <div>{app.emailSnapshot || "—"}</div>
                      <div className={ui.hint}>{app.phoneSnapshot || "—"}</div>
                    </td>
                    <td>{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("vi-VN") : "—"}</td>
                    <td>
                      <Badge
                        tone={
                          app.status === "OFFERED"
                            ? "success"
                            : app.status === "REJECTED"
                            ? "danger"
                            : app.status === "INTERVIEW"
                            ? "warning"
                            : "info"
                        }
                      >
                        {APPLICATION_STATUS_LABEL[app.status] || app.status}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className={ui.btn}
                          onClick={() => openDetail(app)}
                        >
                          Chi tiết
                        </button>
                        {availableReviewTransitions(app.status).map((nextSt) => (
                          <button
                            key={nextSt}
                            type="button"
                            className={ui.btn}
                            disabled={!writes || busyId === app.id}
                            aria-disabled={!writes}
                            title={writes ? undefined : "Thao tác ghi đang bị khóa"}
                            onClick={() => handleReview(app, nextSt)}
                          >
                            {TRANSITION_LABEL[nextSt]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={applications.data.pagination.page}
            totalPages={applications.data.pagination.totalPages}
            onChange={(p) => setFilter("page", String(p))}
          />
        </>
      )}

      {/* Applicant Detail Drawer/Modal */}
      {activeApplication && (
        <div
          role="dialog"
          aria-labelledby="applicant-modal-title"
          aria-modal="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setActiveApplication(null)}
        >
          <div
            style={{
              background: "var(--color-surface, #fff)",
              borderRadius: "var(--radius-lg, 12px)",
              maxWidth: 680,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h2 id="applicant-modal-title" style={{ margin: "0 0 4px" }}>
                  {activeApplication.fullNameSnapshot || "Hồ sơ ứng viên"}
                </h2>
                <span className={ui.hint}>
                  Nộp ngày {activeApplication.submittedAt ? new Date(activeApplication.submittedAt).toLocaleDateString("vi-VN") : "—"}
                </span>
              </div>
              <button
                type="button"
                className={ui.btn}
                onClick={() => setActiveApplication(null)}
              >
                Đóng
              </button>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <Card title="Thông tin liên hệ & Làm việc">
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Email:</strong> {activeApplication.emailSnapshot || "—"}
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Số điện thoại:</strong> {activeApplication.phoneSnapshot || "—"}
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Địa điểm hiện tại:</strong> {activeApplication.currentLocationSnapshot || "—"}
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Thời gian bắt đầu:</strong> {formatAvailability(activeApplication.availability)}
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Phương thức liên hệ ưu tiên:</strong> {formatContactMethod(activeApplication.preferredContactMethod)}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Trạng thái hồ sơ:</strong>{" "}
                  <Badge tone="info">
                    {APPLICATION_STATUS_LABEL[activeApplication.status] || activeApplication.status}
                  </Badge>
                </p>
              </Card>

              {activeApplication.answers && activeApplication.answers.length > 0 && (
                <Card title="Câu hỏi sàng lọc đã trả lời">
                  <div style={{ display: "grid", gap: 12 }}>
                    {activeApplication.answers.map((ans, idx) => {
                      const qSnap = ans.questionSnapshot as { label?: string; type?: string } | undefined;
                      const qLabel = qSnap?.label || `Câu hỏi ${idx + 1}`;
                      let answerText = "—";
                      if (typeof ans.answerValue === "boolean") {
                        answerText = ans.answerValue ? "Có" : "Không";
                      } else if (Array.isArray(ans.answerValue)) {
                        answerText = ans.answerValue.join(", ");
                      } else if (ans.answerValue !== undefined && ans.answerValue !== null) {
                        answerText = String(ans.answerValue);
                      }
                      return (
                        <div key={ans.id || idx} style={{ borderBottom: "1px solid var(--color-border, #e2e8f0)", paddingBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: 4 }}>
                            {idx + 1}. {qLabel}
                          </div>
                          <div style={{ color: "var(--color-text-secondary, #475569)", fontSize: "0.875rem" }}>
                            {answerText}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {activeApplication.coverLetter && (
                <Card title="Thư giới thiệu (Cover Letter)">
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {activeApplication.coverLetter}
                  </p>
                </Card>
              )}

              {activeApplication.resumeVersion?.builderContent ? (
                <Card title="Nội dung CV Builder">
                  <pre
                    style={{
                      margin: 0,
                      background: "var(--color-surface-soft, #f8fafc)",
                      padding: 12,
                      borderRadius: 8,
                      fontSize: "0.8125rem",
                      overflowX: "auto",
                      maxHeight: 280,
                    }}
                  >
                    {JSON.stringify(activeApplication.resumeVersion.builderContent, null, 2)}
                  </pre>
                </Card>
              ) : (
                <Card title="Nội dung CV">
                  <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>
                    Hồ sơ CV Builder liên kết (Phiên bản v{activeApplication.resumeVersion?.versionNumber ?? 1}).
                  </p>
                </Card>
              )}

              {/* Review transitions inside modal */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 8 }}>
                {availableReviewTransitions(activeApplication.status).map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`${ui.btn} ${st === "REJECTED" ? "" : ui.btnPrimary}`}
                    disabled={!writes || busyId === activeApplication.id}
                    onClick={() => handleReview(activeApplication, st)}
                  >
                    Chuyển: {TRANSITION_LABEL[st]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployerApplicantsPage;
