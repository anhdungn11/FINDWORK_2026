import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Calendar, ArrowRight, FileText, CheckCircle2 } from "lucide-react";
import { candidateApplicationApi } from "@/services/api/candidateApplicationApi";
import {
  APPLICATION_STATUS_LABEL,
  formatAvailability,
  formatContactMethod,
  type ApplicationStatus,
  type CompanyApplicationDto,
  type Paged,
} from "@/services/api/apiTypes";
import type { ApiFailure } from "@/services/api/apiFailure";
import { PageHeader, Badge, LoadingBlock } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import styles from "./CandidateApplicationsPage.module.css";

const STATUS_TONES: Record<ApplicationStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  SUBMITTED: "info",
  REVIEWING: "warning",
  SHORTLISTED: "success",
  INTERVIEW: "success",
  OFFERED: "success",
  REJECTED: "danger",
  WITHDRAWN: "neutral",
};

const CandidateApplicationsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [paged, setPaged] = useState<Paged<CompanyApplicationDto> | null>(null);
  const [selectedApp, setSelectedApp] = useState<CompanyApplicationDto | null>(null);

  const fetchApplications = useCallback(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    candidateApplicationApi
      .list({ page: 1, pageSize: 50 }, ctrl.signal)
      .then((res) => {
        setPaged(res);
        setLoading(false);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setError(err);
        setLoading(false);
      });

    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    return fetchApplications();
  }, [fetchApplications]);

  const applications = paged?.data ?? [];

  return (
    <div className={styles.container}>
      <PageHeader
        title="Lịch sử ứng tuyển"
        subtitle="Theo dõi tiến độ các đơn ứng tuyển bạn đã gửi tới nhà tuyển dụng"
        actions={
          <Link to="/jobs" className={styles.findJobsLink}>
            Tìm thêm việc làm <ArrowRight size={15} aria-hidden="true" />
          </Link>
        }
      />

      {loading ? (
        <div style={{ marginTop: 24 }}>
          <LoadingBlock rows={5} label="Đang tải lịch sử ứng tuyển..." />
        </div>
      ) : error ? (
        <div style={{ marginTop: 24 }}>
          <ApiErrorState error={error} onRetry={fetchApplications} />
        </div>
      ) : applications.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconCircle}>
            <Briefcase size={32} aria-hidden="true" />
          </div>
          <h2 className={styles.emptyTitle}>Chưa có đơn ứng tuyển nào</h2>
          <p className={styles.emptyText}>
            Bạn chưa gửi hồ sơ ứng tuyển nào trên FINDWORK. Hãy khám phá các tin tuyển dụng đang mở và ứng tuyển ngay hôm nay.
          </p>
          <Link to="/jobs" className={styles.emptyButton}>
            Khám phá việc làm <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className={styles.appList}>
          {applications.map((app) => (
            <article key={app.id} className={styles.appCard}>
              <div className={styles.appHeader}>
                <div className={styles.jobInfo}>
                  <h2 className={styles.jobTitle}>
                    <Link to={`/jobs/${app.jobId}`}>
                      {app.job?.title || "Vị trí tuyển dụng"}
                    </Link>
                  </h2>
                  <p className={styles.companyName}>
                    {app.job?.company?.name || "Doanh nghiệp"}
                  </p>
                </div>

                <Badge tone={STATUS_TONES[app.status] ?? "neutral"}>
                  {APPLICATION_STATUS_LABEL[app.status] ?? app.status}
                </Badge>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaItem}>
                  <Calendar size={14} aria-hidden="true" />
                  Nộp ngày: {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("vi-VN") : "Gần đây"}
                </span>
                <span className={styles.metaItem}>
                  <FileText size={14} aria-hidden="true" />
                  CV đính kèm: {app.resumeVersion ? `Phiên bản #${app.resumeVersion.versionNumber}` : "Bản lưu trên hệ thống"}
                </span>
              </div>

              {app.coverLetter && (
                <div className={styles.coverLetterSnippet}>
                  <strong>Thư giới thiệu:</strong>
                  <p>{app.coverLetter}</p>
                </div>
              )}

              <div className={styles.cardFooter}>
                <span className={styles.appId}>Mã đơn: {app.id.slice(0, 8)}...</span>
                <div className={styles.cardActions}>
                  <Link to={`/jobs/${app.jobId}`} className={styles.viewJobBtn}>
                    Xem tin tuyển dụng
                  </Link>
                  <button
                    type="button"
                    className={styles.detailBtn}
                    onClick={() => setSelectedApp(app)}
                  >
                    Chi tiết hồ sơ
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal chi tiết đơn ứng tuyển */}
      {selectedApp && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="modal-app-title">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalEyebrow}>CHI TIẾT ĐƠN ỨNG TUYỂN</span>
                <h3 id="modal-app-title" className={styles.modalTitle}>
                  {selectedApp.job?.title || "Vị trí ứng tuyển"}
                </h3>
                <p className={styles.modalCompany}>{selectedApp.job?.company?.name}</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelectedApp(null)}
                aria-label="Đóng chi tiết"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailSection}>
                <h4>Trạng thái đơn</h4>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                  <Badge tone={STATUS_TONES[selectedApp.status] ?? "neutral"}>
                    {APPLICATION_STATUS_LABEL[selectedApp.status] ?? selectedApp.status}
                  </Badge>
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                    Cập nhật lần cuối: {new Date(selectedApp.updatedAt).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              <div className={styles.detailSection}>
                <h4>Thông tin người ứng tuyển</h4>
                <div className={styles.snapshotGrid}>
                  <div>
                    <span>Họ và tên:</span>
                    <strong>{selectedApp.fullNameSnapshot || "Chưa cập nhật"}</strong>
                  </div>
                  <div>
                    <span>Email liên hệ:</span>
                    <strong>{selectedApp.emailSnapshot || "Chưa cập nhật"}</strong>
                  </div>
                  <div>
                    <span>Số điện thoại:</span>
                    <strong>{selectedApp.phoneSnapshot || "Chưa cập nhật"}</strong>
                  </div>
                  <div>
                    <span>Địa điểm hiện tại:</span>
                    <strong>{selectedApp.currentLocationSnapshot || "Chưa cập nhật"}</strong>
                  </div>
                  <div>
                    <span>Thời gian bắt đầu:</span>
                    <strong>{formatAvailability(selectedApp.availability)}</strong>
                  </div>
                  <div>
                    <span>Phương thức liên hệ:</span>
                    <strong>{formatContactMethod(selectedApp.preferredContactMethod)}</strong>
                  </div>
                </div>
              </div>

              {selectedApp.answers && selectedApp.answers.length > 0 && (
                <div className={styles.detailSection}>
                  <h4>Câu hỏi sàng lọc đã trả lời</h4>
                  <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                    {selectedApp.answers.map((ans, idx) => {
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
                </div>
              )}

              {selectedApp.coverLetter && (
                <div className={styles.detailSection}>
                  <h4>Thư giới thiệu gửi nhà tuyển dụng</h4>
                  <div className={styles.coverLetterBox}>
                    {selectedApp.coverLetter}
                  </div>
                </div>
              )}

              <div className={styles.detailSection}>
                <h4>Bảo chứng dữ liệu</h4>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
                  <CheckCircle2 size={14} style={{ color: "#16a34a", verticalAlign: "middle", marginRight: 6 }} />
                  Đơn ứng tuyển được ghi nhận chính thức vào cơ sở dữ liệu FINDWORK với liên kết hồ sơ bất biến.
                </p>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setSelectedApp(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateApplicationsPage;
