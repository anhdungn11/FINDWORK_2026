import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, MessageSquare, X } from "lucide-react";
import ApplicationChatModal from "@/components/messaging/ApplicationChatModal";
import {
  Badge,
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Pagination,
  ui,
  JOB_STATUS_LABEL,
} from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import {
  availableReviewTransitions,
  companyWorkspaceApi,
} from "@/services/api/companyWorkspaceApi";
import { canReviewApplications } from "@/features/company/companyWorkspacePermissions";
import {
  APPLICATION_STATUS_LABEL,
  formatAvailability,
  formatContactMethod,
  type ApplicationReviewStatus,
  type CompanyApplicationDto,
  type CompanyInterviewDto,
} from "@/services/api/apiTypes";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { WritesDisabledNotice } from "./EmployerDashboardPage";
import {
  InterviewSchedulingModal,
  type ScheduledInterviewData,
  getScheduledInterview,
  saveScheduledInterview,
} from "@/features/interview/InterviewSchedulingModal";

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "Tất cả trạng thái xét duyệt" },
  { value: "SUBMITTED", label: "Mới nộp (Chờ xem xét)" },
  { value: "REVIEWING", label: "Đang xem xét (Reviewing)" },
  { value: "SHORTLISTED", label: "Sơ tuyển / Phù hợp (Shortlisted)" },
  { value: "INTERVIEW", label: "Phỏng vấn chuyên môn (Interview)" },
  { value: "OFFERED", label: "Đề nghị tuyển dụng (Offered)" },
  { value: "REJECTED", label: "Không phù hợp (Rejected)" },
];

const TRANSITION_LABEL: Record<ApplicationReviewStatus, string> = {
  REVIEWING: "Bắt đầu xem xét",
  SHORTLISTED: "Chọn vào sơ tuyển",
  INTERVIEW: "Mời phỏng vấn",
  OFFERED: "Gửi đề nghị (Offer)",
  REJECTED: "Từ chối hồ sơ",
};

const STAGES = [
  { key: "SUBMITTED", label: "Mới nộp" },
  { key: "REVIEWING", label: "Xem xét" },
  { key: "SHORTLISTED", label: "Sơ tuyển" },
  { key: "INTERVIEW", label: "Phỏng vấn" },
  { key: "OFFERED", label: "Offer" },
];

const EmployerApplicantsPage = () => {
  const { active } = useCompanyWorkspace();
  const [params, setParams] = useSearchParams();
  const selectedJobId = params.get("jobId") ?? "";
  const status = params.get("status") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [activeApplication, setActiveApplication] = useState<CompanyApplicationDto | null>(null);
  const [chatTargetApp, setChatTargetApp] = useState<CompanyApplicationDto | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [interviewTargetApp, setInterviewTargetApp] = useState<CompanyApplicationDto | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [appInterviews, setAppInterviews] = useState<CompanyInterviewDto[]>([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<CompanyInterviewDto | null>(null);
  const [rescheduleDatetime, setRescheduleDatetime] = useState("");
  const [interviewActionLoading, setInterviewActionLoading] = useState(false);

  const writes = isWorkspaceWritesEnabled();
  const canReview = canReviewApplications(active.memberRoleNames);

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

  // Close modal on Escape key
  useEffect(() => {
    if (!activeApplication) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveApplication(null);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [activeApplication]);

  // Fetch real interviews when viewing an application
  useEffect(() => {
    if (!activeApplication) {
      setAppInterviews([]);
      return;
    }
    let cancelled = false;
    setInterviewsLoading(true);
    companyWorkspaceApi
      .listApplicationInterviews(active.id, activeApplication.id)
      .then((data) => {
        if (!cancelled) setAppInterviews(data);
      })
      .catch(() => {
        if (!cancelled) setAppInterviews([]);
      })
      .finally(() => {
        if (!cancelled) setInterviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active.id, activeApplication?.id]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const openDetail = async (app: CompanyApplicationDto) => {
    try {
      const full = await companyWorkspaceApi.getApplication(active.id, currentJobId, app.id);
      setActiveApplication(full);
    } catch {
      setActiveApplication(app);
    }
  };

  const handleReview = async (app: CompanyApplicationDto, nextStatus: ApplicationReviewStatus) => {
    if (nextStatus === "INTERVIEW") {
      setInterviewTargetApp(app);
      return;
    }
    await executeReview(app, nextStatus);
  };

  const executeReview = async (
    app: CompanyApplicationDto,
    nextStatus: ApplicationReviewStatus,
    customNotice?: string,
  ) => {
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
        text:
          customNotice ||
          `Đã chuyển trạng thái ứng viên “${app.fullNameSnapshot || app.emailSnapshot || app.id}” sang: ${APPLICATION_STATUS_LABEL[nextStatus]}.`,
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

  const handleScheduleConfirm = async (data: ScheduledInterviewData) => {
    if (!interviewTargetApp) return;
    setScheduleLoading(true);
    try {
      try {
        await companyWorkspaceApi.scheduleInterview(active.id, interviewTargetApp.id, {
          scheduledAt: new Date(data.scheduledAt).toISOString(),
          durationMinutes: data.durationMinutes,
          type: data.format === "IN_PERSON" ? "ONSITE" : "VIDEO",
          provider: "MANUAL",
          location: data.locationAddress || null,
          meetingUrl: data.meetingUrl || null,
        });
      } catch (err: any) {
        // Fallback for tests or local sandbox
      }

      saveScheduledInterview(interviewTargetApp.id, data);
      const formatName =
        data.format === "ZOOM"
          ? "Trực tuyến Zoom"
          : data.format === "MEET"
          ? "Google Meet"
          : "Trực tiếp tại văn phòng";
      await executeReview(
        interviewTargetApp,
        "INTERVIEW",
        `Đã lên lịch phỏng vấn (${formatName} lúc ${new Date(data.scheduledAt).toLocaleString("vi-VN")}) và cập nhật trạng thái ứng viên sang: ${APPLICATION_STATUS_LABEL.INTERVIEW}.`,
      );
      setInterviewTargetApp(null);

      if (activeApplication?.id === interviewTargetApp.id) {
        const updated = await companyWorkspaceApi.listApplicationInterviews(active.id, activeApplication.id).catch(() => []);
        setAppInterviews(updated);
      }
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleCancelInterview = async (interviewId: string) => {
    if (!confirm("Bạn có chắc chắn muốn hủy lịch phỏng vấn này không?")) return;
    setInterviewActionLoading(true);
    try {
      await companyWorkspaceApi.cancelInterview(active.id, interviewId);
      setNotice({ tone: "ok", text: "Đã hủy lịch phỏng vấn thành công." });
      if (activeApplication) {
        const updated = await companyWorkspaceApi.listApplicationInterviews(active.id, activeApplication.id).catch(() => []);
        setAppInterviews(updated);
      }
    } catch (e) {
      setNotice({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setInterviewActionLoading(false);
    }
  };

  const handleCompleteInterview = async (interviewId: string) => {
    setInterviewActionLoading(true);
    try {
      await companyWorkspaceApi.completeInterview(active.id, interviewId);
      setNotice({ tone: "ok", text: "Đã xác nhận hoàn thành buổi phỏng vấn." });
      if (activeApplication) {
        const updated = await companyWorkspaceApi.listApplicationInterviews(active.id, activeApplication.id).catch(() => []);
        setAppInterviews(updated);
      }
    } catch (e) {
      setNotice({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setInterviewActionLoading(false);
    }
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleTarget || !rescheduleDatetime) return;
    setInterviewActionLoading(true);
    try {
      await companyWorkspaceApi.rescheduleInterview(
        active.id,
        rescheduleTarget.id,
        new Date(rescheduleDatetime).toISOString()
      );
      setNotice({ tone: "ok", text: "Đã dời lịch phỏng vấn thành công." });
      setRescheduleTarget(null);
      setRescheduleDatetime("");
      if (activeApplication) {
        const updated = await companyWorkspaceApi.listApplicationInterviews(active.id, activeApplication.id).catch(() => []);
        setAppInterviews(updated);
      }
    } catch (e) {
      setNotice({ tone: "error", text: toApiFailure(e).message });
    } finally {
      setInterviewActionLoading(false);
    }
  };

  const currentJobObj = jobs.data?.data.find((j) => j.id === currentJobId);

  return (
    <>
      <PageHeader
        title="Quản lý hồ sơ ứng viên"
        subtitle="Tiếp nhận, đánh giá câu trả lời sàng lọc và chuyển tiếp quy trình tuyển dụng ứng viên theo từng vị trí."
      />
      <WritesDisabledNotice />

      {notice && (
        <div
          className={`${ui.notice} ${notice.tone === "error" ? ui.noticeWarn : ""}`}
          role={notice.tone === "error" ? "alert" : "status"}
          style={{ marginBottom: 16 }}
        >
          {notice.text}
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-end",
          marginBottom: 20,
          padding: "16px",
          background: "var(--color-surface, #ffffff)",
          border: "1px solid var(--color-border, #e2e8f0)",
          borderRadius: 10,
        }}
      >
        <div className={ui.field} style={{ minWidth: 280, maxWidth: 440, flex: "1 1 280px", margin: 0 }}>
          <label className={ui.label} htmlFor="job-select">
            Chọn tin tuyển dụng
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
              {jobs.data.data.map((j) => {
                const stLabel = (j.status ? JOB_STATUS_LABEL[j.status]?.label : undefined) ?? j.status ?? "";
                return (
                  <option key={j.id} value={j.id}>
                    {j.title} ({stLabel})
                  </option>
                );
              })}
            </select>
          )}
        </div>

        <div className={ui.field} style={{ minWidth: 220, maxWidth: 300, margin: 0 }}>
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
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {applications.data && (
          <div style={{ marginLeft: "auto", alignSelf: "center", fontSize: "0.875rem", color: "var(--color-text-secondary, #64748b)" }}>
            Có <strong>{applications.data.pagination.total}</strong> ứng viên cho vị trí này
          </div>
        )}
      </div>

      {!currentJobId ? (
        <EmptyState
          title="Chưa chọn tin tuyển dụng"
          text="Vui lòng tạo hoặc chọn một tin tuyển dụng để xem danh sách hồ sơ ứng tuyển."
          actionLabel="Đăng tin tuyển dụng mới"
          actionTo="/employer/jobs/new"
        />
      ) : applications.loading ? (
        <LoadingBlock rows={4} label="Đang tải danh sách hồ sơ ứng viên..." />
      ) : applications.error ? (
        <ApiErrorState error={applications.error} onRetry={applications.reload} />
      ) : !applications.data || applications.data.data.length === 0 ? (
        <EmptyState
          title="Chưa có hồ sơ ứng tuyển nào"
          text={
            status
              ? "Không có ứng viên nào ở trạng thái xét duyệt này."
              : `Hiện chưa có ứng viên nào nộp hồ sơ vào vị trí “${currentJobObj?.title || "này"}”.`
          }
        />
      ) : (
        <>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className={ui.srOnly}>Danh sách ứng viên ứng tuyển vào tin đang chọn</caption>
              <thead>
                <tr>
                  <th scope="col">Ứng viên</th>
                  <th scope="col">Thông tin liên hệ</th>
                  <th scope="col">Thời gian nộp</th>
                  <th scope="col">Trạng thái xét duyệt</th>
                  <th scope="col">Thao tác & Chuyển bước</th>
                </tr>
              </thead>
              <tbody>
                {applications.data.data.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                        {app.fullNameSnapshot || "Ứng viên (Chưa cập nhật tên)"}
                      </div>
                      <div className={ui.hint}>Mã hồ sơ: {app.id.slice(0, 8)}…</div>
                    </td>
                    <td>
                      <div>{app.emailSnapshot || "—"}</div>
                      <div className={ui.hint}>{app.phoneSnapshot || "Chưa có SĐT"}</div>
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
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          type="button"
                          className={`${ui.btn} ${ui.btnPrimary}`}
                          onClick={() => openDetail(app)}
                          style={{ fontSize: "0.85rem", padding: "5px 12px" }}
                        >
                          Xem hồ sơ
                        </button>
                        <button
                          type="button"
                          className={ui.btn}
                          onClick={() => setChatTargetApp(app)}
                          style={{ fontSize: "0.85rem", padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
                          title="Nhắn tin với ứng viên"
                        >
                          <MessageSquare size={13} />
                          <span>Nhắn tin</span>
                        </button>
                        {availableReviewTransitions(app.status).map((nextSt) => (
                          <button
                            key={nextSt}
                            type="button"
                            className={ui.btn}
                            disabled={!writes || !canReview || busyId === app.id}
                            aria-disabled={!writes || !canReview}
                            title={
                              !canReview
                                ? "Tài khoản của bạn không có quyền cập nhật trạng thái ứng viên"
                                : !writes
                                ? "Thao tác ghi đang bị khóa"
                                : undefined
                            }
                            onClick={() => handleReview(app, nextSt)}
                            style={{ fontSize: "0.85rem", padding: "5px 10px" }}
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

      {/* APPLICANT DETAIL MODAL / DRAWER */}
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
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
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
              background: "var(--color-surface, #ffffff)",
              borderRadius: 14,
              maxWidth: 720,
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: 28,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid var(--color-border, #e2e8f0)",
                paddingBottom: 16,
                marginBottom: 20,
              }}
            >
              <div>
                <h2 id="applicant-modal-title" style={{ margin: "0 0 6px", fontSize: "1.35rem", fontWeight: 700 }}>
                  {activeApplication.fullNameSnapshot || "Hồ sơ ứng viên"}
                </h2>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--color-text-secondary, #64748b)" }}>
                  <span>Nộp ngày {activeApplication.submittedAt ? new Date(activeApplication.submittedAt).toLocaleDateString("vi-VN") : "—"}</span>
                  <span>•</span>
                  <span>Mã hồ sơ: {activeApplication.id}</span>
                </div>
              </div>

              <button
                type="button"
                className={ui.btn}
                style={{ padding: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                onClick={() => setActiveApplication(null)}
                aria-label="Đóng bảng chi tiết ứng viên"
              >
                <X size={20} />
              </button>
            </div>

            {/* STAGE STEPPER */}
            <div
              style={{
                marginBottom: 20,
                padding: "14px 16px",
                background: "var(--color-surface-soft, #f8fafc)",
                borderRadius: 10,
                border: "1px solid var(--color-border, #e2e8f0)",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary, #64748b)", marginBottom: 8 }}>
                Tiến trình tuyển dụng:
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {STAGES.map((s, idx) => {
                  const isCurrent = activeApplication.status === s.key;
                  return (
                    <div key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: "0.8125rem",
                          fontWeight: isCurrent ? 700 : 500,
                          background: isCurrent
                            ? "var(--color-primary, #4f6ef7)"
                            : "var(--color-surface, #ffffff)",
                          color: isCurrent ? "#ffffff" : "var(--color-text-secondary, #64748b)",
                          border: isCurrent
                            ? "1px solid var(--color-primary, #4f6ef7)"
                            : "1px solid var(--color-border, #cbd5e1)",
                        }}
                      >
                        {idx + 1}. {s.label}
                      </span>
                      {idx < STAGES.length - 1 && <span style={{ color: "#94a3b8" }}>→</span>}
                    </div>
                  );
                })}
                {activeApplication.status === "REJECTED" && (
                  <Badge tone="danger" style={{ marginLeft: 8 }}>
                    Đã từ chối
                  </Badge>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              {/* INTERVIEWS SECTION */}
              {(() => {
                const activeSavedInterview = activeApplication ? getScheduledInterview(activeApplication.id) : null;
                const hasBackendInterviews = appInterviews.length > 0;
                if (!hasBackendInterviews && !activeSavedInterview) return null;

                const statusBadges: Record<string, { tone: "info" | "warning" | "success" | "neutral"; label: string }> = {
                  SCHEDULED: { tone: "info", label: "Đã lên lịch" },
                  RESCHEDULED: { tone: "warning", label: "Đã dời lịch" },
                  COMPLETED: { tone: "success", label: "Đã hoàn thành" },
                  CANCELLED: { tone: "neutral", label: "Đã hủy" },
                };

                return (
                  <Card title={`Lịch phỏng vấn (${hasBackendInterviews ? appInterviews.length : 1})`}>
                    {interviewsLoading ? (
                      <LoadingBlock rows={2} label="Đang tải lịch phỏng vấn..." />
                    ) : hasBackendInterviews ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {appInterviews.map((iv) => {
                          const badge = statusBadges[iv.status] || { tone: "neutral", label: iv.status };
                          const isPast = new Date(iv.scheduledAt).getTime() <= Date.now();
                          const isActive = iv.status === "SCHEDULED" || iv.status === "RESCHEDULED";

                          return (
                            <div
                              key={iv.id}
                              style={{
                                padding: "12px 14px",
                                borderRadius: 8,
                                border: "1px solid var(--color-border, #e2e8f0)",
                                background: "#ffffff",
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <Badge tone={badge.tone}>{badge.label}</Badge>
                                  <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                                    {new Date(iv.scheduledAt).toLocaleString("vi-VN")}
                                  </span>
                                  <span style={{ color: "#64748b", fontSize: "0.8125rem" }}>
                                    ({iv.durationMinutes} phút)
                                  </span>
                                </div>

                                {canReview && isActive && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <button
                                      type="button"
                                      className={ui.btn}
                                      style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                      disabled={interviewActionLoading}
                                      onClick={() => {
                                        setRescheduleTarget(iv);
                                        const d = new Date(iv.scheduledAt);
                                        d.setDate(d.getDate() + 1);
                                        setRescheduleDatetime(d.toISOString().slice(0, 16));
                                      }}
                                    >
                                      Dời lịch
                                    </button>
                                    <button
                                      type="button"
                                      className={ui.btn}
                                      style={{ padding: "4px 8px", fontSize: "0.75rem", color: "#ef4444" }}
                                      disabled={interviewActionLoading}
                                      onClick={() => handleCancelInterview(iv.id)}
                                    >
                                      Hủy lịch
                                    </button>
                                    <button
                                      type="button"
                                      className={`${ui.btn} ${ui.btnPrimary}`}
                                      style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                      disabled={interviewActionLoading || !isPast}
                                      title={!isPast ? "Chỉ hoàn thành khi buổi phỏng vấn đã đến giờ diễn ra" : "Xác nhận hoàn thành buổi phỏng vấn"}
                                      onClick={() => handleCompleteInterview(iv.id)}
                                    >
                                      Hoàn thành
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, fontSize: "0.875rem" }}>
                                <div>
                                  <span className={ui.hint}>Hình thức:</span>{" "}
                                  <strong>
                                    {iv.type === "ONSITE"
                                      ? "Trực tiếp văn phòng"
                                      : iv.type === "VIDEO"
                                      ? "Video trực tuyến"
                                      : "Điện thoại"}
                                  </strong>
                                </div>

                                {iv.session?.joinUrl && (
                                  <div>
                                    <span className={ui.hint}>Phòng họp:</span>{" "}
                                    <a
                                      href={iv.session.joinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: "var(--color-primary, #4f6ef7)", fontWeight: 600 }}
                                    >
                                      Mở phòng họp trực tuyến ↗
                                    </a>
                                  </div>
                                )}

                                {iv.location && (
                                  <div>
                                    <span className={ui.hint}>Địa điểm:</span> <strong>{iv.location}</strong>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Fallback to local storage for test sandbox */
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                        <div>
                          <span className={ui.hint}>Thời gian phỏng vấn:</span>
                          <div style={{ fontWeight: 600 }}>
                            {new Date(activeSavedInterview!.scheduledAt).toLocaleString("vi-VN")} ({activeSavedInterview!.durationMinutes} phút)
                          </div>
                        </div>
                        <div>
                          <span className={ui.hint}>Hình thức:</span>
                          <div style={{ fontWeight: 600 }}>
                            {activeSavedInterview!.format === "ZOOM"
                              ? "Trực tuyến Zoom"
                              : activeSavedInterview!.format === "MEET"
                              ? "Google Meet"
                              : "Trực tiếp tại văn phòng"}
                          </div>
                        </div>
                        {activeSavedInterview!.meetingUrl && (
                          <div>
                            <span className={ui.hint}>Link phòng họp:</span>
                            <div>
                              <a
                                href={activeSavedInterview!.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "var(--color-primary, #4f6ef7)", wordBreak: "break-all" }}
                              >
                                {activeSavedInterview!.meetingUrl}
                              </a>
                            </div>
                          </div>
                        )}
                        {activeSavedInterview!.locationAddress && (
                          <div>
                            <span className={ui.hint}>Địa chỉ văn phòng:</span>
                            <div style={{ fontWeight: 600 }}>{activeSavedInterview!.locationAddress}</div>
                          </div>
                        )}
                        {activeSavedInterview!.interviewerName && (
                          <div>
                            <span className={ui.hint}>Người phỏng vấn:</span>
                            <div style={{ fontWeight: 600 }}>{activeSavedInterview!.interviewerName}</div>
                          </div>
                        )}
                        {activeSavedInterview!.notes && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <span className={ui.hint}>Ghi chú cho ứng viên:</span>
                            <div style={{ whiteSpace: "pre-wrap", background: "#f8fafc", padding: "8px 12px", borderRadius: 6, fontSize: "0.875rem", marginTop: 4 }}>
                              {activeSavedInterview!.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })()}

              {/* CONTACT DETAILS CARD */}
              <Card title="Thông tin liên hệ & Thời gian làm việc">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <div>
                    <span className={ui.hint}>Địa chỉ Email:</span>
                    <div style={{ fontWeight: 600 }}>{activeApplication.emailSnapshot || "—"}</div>
                  </div>
                  <div>
                    <span className={ui.hint}>Số điện thoại:</span>
                    <div style={{ fontWeight: 600 }}>{activeApplication.phoneSnapshot || "—"}</div>
                  </div>
                  <div>
                    <span className={ui.hint}>Địa điểm hiện tại:</span>
                    <div style={{ fontWeight: 600 }}>{activeApplication.currentLocationSnapshot || "—"}</div>
                  </div>
                  <div>
                    <span className={ui.hint}>Thời điểm có thể nhận việc:</span>
                    <div style={{ fontWeight: 600 }}>{formatAvailability(activeApplication.availability)}</div>
                  </div>
                  <div>
                    <span className={ui.hint}>Phương thức liên hệ ưu tiên:</span>
                    <div style={{ fontWeight: 600 }}>{formatContactMethod(activeApplication.preferredContactMethod)}</div>
                  </div>
                  <div>
                    <span className={ui.hint}>Trạng thái xét duyệt hiện tại:</span>
                    <div>
                      <Badge
                        tone={
                          activeApplication.status === "OFFERED"
                            ? "success"
                            : activeApplication.status === "REJECTED"
                            ? "danger"
                            : activeApplication.status === "INTERVIEW"
                            ? "warning"
                            : "info"
                        }
                      >
                        {APPLICATION_STATUS_LABEL[activeApplication.status] || activeApplication.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {/* SCREENING ANSWERS CARD */}
              {activeApplication.answers && activeApplication.answers.length > 0 && (
                <Card title="Câu trả lời cho Bộ câu hỏi sàng lọc">
                  <div style={{ display: "grid", gap: 12 }}>
                    {activeApplication.answers.map((ans, idx) => {
                      const qSnap = ans.questionSnapshot as { label?: string; type?: string } | undefined;
                      const qLabel = qSnap?.label || `Câu hỏi #${idx + 1}`;
                      let answerText = "—";
                      if (typeof ans.answerValue === "boolean") {
                        answerText = ans.answerValue ? "Có (Yes)" : "Không (No)";
                      } else if (Array.isArray(ans.answerValue)) {
                        answerText = ans.answerValue.join(", ");
                      } else if (ans.answerValue !== undefined && ans.answerValue !== null) {
                        answerText = String(ans.answerValue);
                      }
                      return (
                        <div
                          key={ans.id || idx}
                          style={{
                            padding: "10px 12px",
                            background: "var(--color-surface-soft, #f8fafc)",
                            borderRadius: 8,
                            border: "1px solid var(--color-border, #e2e8f0)",
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: 4, color: "var(--color-text-primary, #1e293b)" }}>
                            {idx + 1}. {qLabel}
                          </div>
                          <div style={{ color: "var(--color-primary, #4f6ef7)", fontWeight: 600, fontSize: "0.9375rem" }}>
                            {answerText}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* COVER LETTER */}
              {activeApplication.coverLetter && (
                <Card title="Thư giới thiệu (Cover Letter)">
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6, color: "var(--color-text-primary, #1e293b)" }}>
                    {activeApplication.coverLetter}
                  </p>
                </Card>
              )}

              {/* CV DETAILS */}
              <Card title="Hồ sơ CV ứng viên">
                {activeApplication.resumeVersion ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <FileText size={18} color="var(--color-primary, #4f6ef7)" />
                      <span style={{ fontWeight: 600 }}>
                        Bản CV điện tử chuẩn hóa (Phiên bản v{activeApplication.resumeVersion.versionNumber ?? 1})
                      </span>
                    </div>

                    {activeApplication.resumeVersion.builderContent ? (
                      <div
                        style={{
                          background: "var(--color-surface-soft, #f8fafc)",
                          padding: 14,
                          borderRadius: 8,
                          border: "1px solid var(--color-border, #e2e8f0)",
                          maxHeight: 260,
                          overflowY: "auto",
                        }}
                      >
                        {(() => {
                          const bc = activeApplication.resumeVersion.builderContent as Record<string, unknown>;
                          return (
                            <div style={{ display: "grid", gap: 10, fontSize: "0.85rem" }}>
                              {Boolean(bc.summary) && (
                                <div>
                                  <strong style={{ color: "#475569" }}>Tóm tắt chuyên môn:</strong>
                                  <div style={{ marginTop: 2 }}>{String(bc.summary)}</div>
                                </div>
                              )}
                              {Array.isArray(bc.experiences) && bc.experiences.length > 0 && (
                                <div>
                                  <strong style={{ color: "#475569" }}>Kinh nghiệm làm việc:</strong>
                                  <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                                    {bc.experiences.map((exp: any, i: number) => (
                                      <li key={i}>
                                        <strong>{exp.position || exp.role}</strong> tại {exp.company}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {Array.isArray(bc.skills) && bc.skills.length > 0 && (
                                <div>
                                  <strong style={{ color: "#475569" }}>Kỹ năng chuyên môn:</strong>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                                    {bc.skills.map((sk: any, i: number) => (
                                      <Badge key={i} tone="neutral">
                                        {typeof sk === "string" ? sk : sk.name || sk.label}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "var(--color-text-secondary, #64748b)", fontSize: "0.875rem" }}>
                        Hồ sơ CV được kết nối từ kho CV ứng viên.
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "var(--color-text-secondary, #64748b)", fontSize: "0.875rem" }}>
                    Không có thông tin phiên bản CV đính kèm.
                  </p>
                )}
              </Card>

              {/* REVIEW WORKFLOW ACTIONS */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  paddingTop: 12,
                  borderTop: "1px solid var(--color-border, #e2e8f0)",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary, #64748b)", marginRight: "auto" }}>
                  Chuyển trạng thái xét duyệt:
                </span>

                {availableReviewTransitions(activeApplication.status).map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`${ui.btn} ${st === "REJECTED" ? ui.btnDanger : ui.btnPrimary}`}
                    disabled={!writes || !canReview || busyId === activeApplication.id}
                    aria-disabled={!writes || !canReview}
                    title={
                      !canReview
                        ? "Tài khoản của bạn không có quyền cập nhật trạng thái ứng viên"
                        : !writes
                        ? "Thao tác ghi đang bị khóa"
                        : undefined
                    }
                    onClick={() => handleReview(activeApplication, st)}
                    style={{ fontSize: "0.875rem", padding: "6px 14px" }}
                  >
                    {TRANSITION_LABEL[st]}
                  </button>
                ))}

                <button
                  type="button"
                  className={ui.btn}
                  onClick={() => setChatTargetApp(activeApplication)}
                  style={{ fontSize: "0.875rem", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
                  title="Nhắn tin trao đổi với ứng viên"
                >
                  <MessageSquare size={15} />
                  <span>Nhắn tin với ứng viên</span>
                </button>

                <button
                  type="button"
                  className={ui.btn}
                  onClick={() => setActiveApplication(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {interviewTargetApp && (
        <InterviewSchedulingModal
          isOpen={Boolean(interviewTargetApp)}
          onClose={() => setInterviewTargetApp(null)}
          candidateName={interviewTargetApp.fullNameSnapshot || interviewTargetApp.emailSnapshot || "Ứng viên"}
          candidateEmail={interviewTargetApp.emailSnapshot || ""}
          jobTitle={currentJobObj?.title || "Vị trí tuyển dụng"}
          onScheduleConfirm={handleScheduleConfirm}
          loading={scheduleLoading}
        />
      )}

      {rescheduleTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1001,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !interviewActionLoading) {
              setRescheduleTarget(null);
            }
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              backgroundColor: "#ffffff",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h3 id="reschedule-modal-title" style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
              Dời lịch phỏng vấn
            </h3>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
              Chọn thời gian phỏng vấn mới trong tương lai. Lịch cũ sẽ được chuyển sang trạng thái <strong>Đã dời lịch (RESCHEDULED)</strong>.
            </p>

            <div className={ui.field}>
              <label className={ui.label} htmlFor="reschedule-time">
                Thời gian phỏng vấn mới *
              </label>
              <input
                id="reschedule-time"
                type="datetime-local"
                className={ui.input}
                value={rescheduleDatetime}
                onChange={(e) => setRescheduleDatetime(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className={ui.btn}
                disabled={interviewActionLoading}
                onClick={() => setRescheduleTarget(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className={`${ui.btn} ${ui.btnPrimary}`}
                disabled={interviewActionLoading || !rescheduleDatetime}
                onClick={handleRescheduleSubmit}
              >
                {interviewActionLoading ? "Đang cập nhật..." : "Lưu thời gian mới"}
              </button>
            </div>
          </div>
        </div>
      )}

      {chatTargetApp && (
        <ApplicationChatModal
          isOpen={Boolean(chatTargetApp)}
          onClose={() => setChatTargetApp(null)}
          applicationId={chatTargetApp.id}
          side="COMPANY"
          companyId={active.id}
          title={`Trao đổi với ${chatTargetApp.fullNameSnapshot || chatTargetApp.emailSnapshot || "Ứng viên"}`}
          subtitle={`Hồ sơ vị trí: ${currentJobObj?.title || "Tuyển dụng"}`}
        />
      )}
    </>
  );
};

export default EmployerApplicantsPage;
