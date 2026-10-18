import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Link,
    useParams,
    useSearchParams,
} from "react-router-dom";

import ApplicationJobSummary from "@/features/applications/components/ApplicationJobSummary/ApplicationJobSummary";
import ApplicationStepper from "@/features/applications/components/ApplicationStepper/ApplicationStepper";
import ResumeSelectionStep from "@/features/applications/components/ResumeSelectionStep";
import { useApplicationFlow } from "@/features/applications/hooks/useApplicationFlow";
import ApplicationDetailsStep from "@/features/applications/components/ApplicationDetailsStep/ApplicationDetailsStep";
import { parseJobId } from "@/app/router/jobId";
import { publicApi } from "@/services/api/publicApi";
import { candidateProfileService } from "@/features/candidate/profile/services/candidateProfileService";
import { resumeService } from "@/features/resume/services/resumeService";
import { candidateApplicationApi } from "@/services/api/candidateApplicationApi";
import { isLiveWritesEnabled } from "@/features/candidate/profile/config/candidateIntegrationConfig";
import { applicationDraftService } from "@/features/applications/services/applicationDraftService";
import {
    EMPLOYMENT_TYPE_LABEL,
    WORKPLACE_TYPE_LABEL,
    formatSalary,
    type JobDto,
    type CompanyApplicationDto,
} from "@/services/api/apiTypes";
import type { Resume } from "@/features/resume/types/resume.types";
import { useAuthStore } from "@/store/authStore";

import styles from "./JobApplicationPage.module.css";

const JobApplicationPage = () => {
    const { id } = useParams();

    const parsedJobId = parseJobId(id);

    if (
        parsedJobId.kind === "invalid"
    ) {
        return (
            <section className={styles.statePage}>
                <div>
                    <h1>Đường dẫn ứng tuyển không hợp lệ</h1>

                    <Link to="/jobs">
                        Quay lại danh sách việc làm
                    </Link>
                </div>
            </section>
        );
    }

    if (parsedJobId.kind === "backend") {
        return <RealJobApplicationPage key={parsedJobId.id} jobId={parsedJobId.id} />;
    }

    return <MockJobApplicationPage key={parsedJobId.id} jobId={parsedJobId.id} />;
};

const MockJobApplicationPage = ({ jobId }: { jobId: number }) => {
    const application = useApplicationFlow({ jobId });

    if (application.isLoading) {
        return (
            <section className={styles.statePage}>
                <p>Đang tải hồ sơ ứng tuyển...</p>
            </section>
        );
    }

    if (application.errorMessage) {
        return (
            <section className={styles.statePage}>
                <div>
                    <h1>Không thể tải hồ sơ ứng tuyển</h1>

                    <p>{application.errorMessage}</p>

                    <Link to={`/jobs/${jobId}`}>
                        Quay lại việc làm
                    </Link>
                </div>
            </section>
        );
    }

    if (!application.job) {
        return (
            <section className={styles.statePage}>
                <div>
                    <h1>Không tìm thấy việc làm</h1>

                    <p>
                        Tin tuyển dụng không tồn tại hoặc
                        không còn khả dụng.
                    </p>

                    <Link to="/jobs">
                        Quay lại danh sách việc làm
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section className={styles.page}>
            <div className="container">
                <Link
                    to={`/jobs/${application.job.id}`}
                    className={styles.backLink}
                >
                    ← Quay lại việc làm
                </Link>

                <header className={styles.header}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span>Ứng tuyển việc làm</span>
                        <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                            Bản tin mẫu (Demo)
                        </span>
                    </div>

                    <h1>{application.job.title}</h1>

                    <p>
                        {application.job.company}
                        {" • "}
                        {application.job.location}
                    </p>
                    <p role="status">Đây là bản xem trước. Chức năng gửi đơn ứng tuyển chưa được kết nối; Chưa có đơn ứng tuyển nào được gửi.</p>
                </header>

                <ApplicationStepper
                    currentStep={application.currentStep}
                />

                <div className={styles.workspace}>
                    <main className={styles.mainColumn}>
                        {application.currentStep === "resume" && (
                            <ResumeSelectionStep
                                jobId={jobId}
                                resumes={application.resumes}
                                selectedResumeId={
                                    application.selectedResumeId
                                }
                                onSelectResume={
                                    application.selectResume
                                }
                                onContinue={() =>
                                    application.goToStep("details")
                                }
                            />
                        )}

                        {application.currentStep === "details" && (
                            <ApplicationDetailsStep
                                details={application.details}
                                errors={application.detailsErrors}
                                selectedResume={application.selectedResume}
                                canContinue={application.canContinueDetails}
                                onContactChange={application.updateContact}
                                onDetailsChange={application.updateDetails}
                                onBack={() =>
                                    application.goToStep("resume")
                                }
                                onContinue={() =>
                                    application.goToStep("questions")
                                }
                            />
                        )}

                        {application.currentStep === "questions" && (
                            <div className={styles.formCard}>
                                <div className={`${styles.bannerNotice} ${styles.bannerInfo}`} style={{ marginBottom: 20 }}>
                                    <strong>Ví dụ câu hỏi sàng lọc (Demo):</strong> Dưới đây là các câu hỏi mẫu để bạn trải nghiệm quy trình sàng lọc trước khi nộp hồ sơ. Dữ liệu này được lưu an toàn trong phiên làm việc qua F5.
                                </div>

                                <h2 className={styles.sectionTitle}>Bước 3: Câu hỏi sàng lọc của nhà tuyển dụng</h2>
                                <p className={styles.sectionSubtitle}>
                                    Vui lòng trả lời các câu hỏi ngắn sau để nhà tuyển dụng đánh giá mức độ phù hợp.
                                </p>

                                <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
                                    <div>
                                        <label htmlFor="demo-q1" className={styles.reviewLabel}>
                                            1. Mức lương mong đợi của bạn (triệu VNĐ/tháng)
                                        </label>
                                        <input
                                            id="demo-q1"
                                            type="text"
                                            className={styles.textarea}
                                            style={{ minHeight: "auto", height: 42 }}
                                            placeholder="Ví dụ: 15 - 20 triệu"
                                            value={application.screeningAnswers["salary_expect"] ?? ""}
                                            onChange={(e) => application.updateScreeningAnswer("salary_expect", e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="demo-q2" className={styles.reviewLabel}>
                                            2. Bạn có thể bắt đầu làm việc sau bao lâu kể từ khi nhận offer?
                                        </label>
                                        <input
                                            id="demo-q2"
                                            type="text"
                                            className={styles.textarea}
                                            style={{ minHeight: "auto", height: 42 }}
                                            placeholder="Ví dụ: Có thể nhận việc ngay hoặc sau 2 tuần"
                                            value={application.screeningAnswers["start_availability"] ?? ""}
                                            onChange={(e) => application.updateScreeningAnswer("start_availability", e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="demo-q3" className={styles.reviewLabel}>
                                            3. Bạn đã có kinh nghiệm làm việc thực tế với vị trí này chưa?
                                        </label>
                                        <textarea
                                            id="demo-q3"
                                            className={styles.textarea}
                                            style={{ minHeight: 90 }}
                                            placeholder="Mô tả ngắn gọn kinh nghiệm liên quan của bạn..."
                                            value={application.screeningAnswers["experience_brief"] ?? ""}
                                            onChange={(e) => application.updateScreeningAnswer("experience_brief", e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className={styles.buttonRow}>
                                    <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        onClick={() => application.goToStep("details")}
                                    >
                                        ← Quay lại thông tin
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.submitBtn}
                                        onClick={() => application.goToStep("review")}
                                    >
                                        Tiếp tục: Xem lại hồ sơ →
                                    </button>
                                </div>
                            </div>
                        )}

                        {application.currentStep === "review" && (
                            <div className={styles.formCard}>
                                <h2 className={styles.sectionTitle}>Bước 4: Xem lại thông tin hồ sơ (Bản xem trước)</h2>
                                <p className={styles.sectionSubtitle}>
                                    Kiểm tra lại toàn bộ thông tin ứng tuyển của bạn trước khi gửi.
                                </p>

                                <div className={styles.reviewGrid}>
                                    <div className={styles.reviewRow}>
                                        <span className={styles.reviewLabel}>Vị trí ứng tuyển</span>
                                        <span className={styles.reviewValue}>{application.job.title}</span>
                                    </div>
                                    <div className={styles.reviewRow}>
                                        <span className={styles.reviewLabel}>Doanh nghiệp</span>
                                        <span className={styles.reviewValue}>{application.job.company}</span>
                                    </div>
                                    <div className={styles.reviewRow}>
                                        <span className={styles.reviewLabel}>CV đính kèm</span>
                                        <span className={styles.reviewValue}>
                                            {application.selectedResume?.name || "CV mặc định"}
                                        </span>
                                    </div>
                                    <div className={styles.reviewRow}>
                                        <span className={styles.reviewLabel}>Họ và tên ứng viên</span>
                                        <span className={styles.reviewValue}>
                                            {application.details.contact.fullName || "Chưa nhập"}
                                        </span>
                                    </div>
                                    <div className={styles.reviewRow}>
                                        <span className={styles.reviewLabel}>Email liên hệ</span>
                                        <span className={styles.reviewValue}>
                                            {application.details.contact.email || "Chưa nhập"}
                                        </span>
                                    </div>
                                    <div className={styles.reviewRow}>
                                        <span className={styles.reviewLabel}>Số điện thoại</span>
                                        <span className={styles.reviewValue}>
                                            {application.details.contact.phone || "Chưa nhập"}
                                        </span>
                                    </div>
                                    {application.details.currentLocation && (
                                        <div className={styles.reviewRow}>
                                            <span className={styles.reviewLabel}>Nơi ở hiện tại</span>
                                            <span className={styles.reviewValue}>
                                                {application.details.currentLocation}
                                            </span>
                                        </div>
                                    )}
                                    {application.details.coverLetter && (
                                        <div className={styles.reviewRow}>
                                            <span className={styles.reviewLabel}>Thư giới thiệu</span>
                                            <span className={styles.reviewValue}>
                                                {application.details.coverLetter}
                                            </span>
                                        </div>
                                    )}
                                    {Object.keys(application.screeningAnswers).length > 0 && (
                                        <div className={styles.reviewRow}>
                                            <span className={styles.reviewLabel}>Câu trả lời sàng lọc (Demo)</span>
                                            <span className={styles.reviewValue}>
                                                {Object.entries(application.screeningAnswers).map(([k, v]) => `${k}: ${v}`).join("\n")}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <aside className={`${styles.bannerNotice} ${styles.bannerWarning}`} role="status">
                                    <strong>Chưa hỗ trợ gửi đơn ứng tuyển:</strong>
                                    <span>
                                        Đây là bản xem trước. Chức năng gửi đơn ứng tuyển chưa được kết nối; Chưa có đơn ứng tuyển nào được gửi. Tính năng nộp đơn thực tế chỉ khả dụng với các tin tuyển dụng thật từ Backend.
                                    </span>
                                </aside>

                                <div className={styles.buttonRow}>
                                    <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        onClick={() => application.goToStep("questions")}
                                    >
                                        ← Sửa câu hỏi
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.submitBtn}
                                        disabled
                                        title="Chưa hỗ trợ gửi đơn ứng tuyển cho tin mẫu"
                                    >
                                        Nộp đơn (Bản xem trước demo)
                                    </button>
                                </div>
                            </div>
                        )}

                    </main>

                    <div className={styles.sidebarColumn}>
                        <ApplicationJobSummary
                            job={application.job}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

interface RealJobApplicationPageProps {
  jobId: string;
}

const RealJobApplicationPage = ({ jobId }: RealJobApplicationPageProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;

  // Rehydrate draft từ sessionStorage theo cặp (userId, jobId)
  const initialDraft = useMemo(() => {
    return applicationDraftService.getDraft(userId, jobId);
  }, [userId, jobId]);

  const [step, setStep] = useState<"resume" | "details" | "questions" | "review" | "success">(
    () => (initialDraft?.currentStep as ("resume" | "details" | "questions" | "review" | "success")) ?? "resume"
  );
  const [job, setJob] = useState<JobDto | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>(() => initialDraft?.selectedResumeId ?? "");
  const [selectedVersionId, setSelectedVersionId] = useState<string>(() => initialDraft?.selectedResumeVersionId ?? "");
  const [coverLetter, setCoverLetter] = useState<string>(() => initialDraft?.details?.coverLetter ?? "");
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>(
    () => initialDraft?.screeningAnswers ?? {}
  );
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<CompanyApplicationDto | null>(null);

  // Lưu draft khi có thay đổi trong quá trình điền wizard
  useEffect(() => {
    if (step === "success") return;
    applicationDraftService.saveDraft(userId, jobId, {
      currentStep: step,
      selectedResumeId,
      selectedResumeVersionId: selectedVersionId,
      details: {
        contact: {
          fullName: user?.name ?? "",
          email: user?.email ?? "",
          phone: "",
        },
        currentLocation: "",
        availability: "immediately",
        preferredContactMethod: "email",
        coverLetter,
      },
      screeningAnswers,
    });
  }, [userId, jobId, step, selectedResumeId, selectedVersionId, coverLetter, screeningAnswers, user]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      publicApi.getJob(jobId),
      candidateProfileService.getBootstrap().catch(() => null),
      resumeService.list().catch(() => [] as Resume[]),
    ])
      .then(([jobDto, bootstrap, resumeList]) => {
        if (!active) return;
        setJob(jobDto);

        const hasProfile = bootstrap?.profile?.state === "exists";
        setProfileExists(hasProfile);

        setResumes(resumeList);
        if (resumeList.length > 0) {
          const createdCvId = searchParams.get("createdCvId");
          if (createdCvId && resumeList.some((r) => r.id === createdCvId)) {
            const newlyCreated = resumeList.find((r) => r.id === createdCvId)!;
            setSelectedResumeId(newlyCreated.id);
            setSelectedVersionId(newlyCreated.currentVersion.id);
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete("createdCvId");
            setSearchParams(nextParams, { replace: true });
          } else {
            // Ưu tiên giữ lại resume đã chọn trong draft nếu còn tồn tại
            const draftResume = resumeList.find((r) => r.id === selectedResumeId);
            if (draftResume) {
              setSelectedResumeId(draftResume.id);
              setSelectedVersionId(draftResume.currentVersion.id);
            } else {
              const defaultResume = resumeList.find((r) => r.isDefault) ?? resumeList[0];
              setSelectedResumeId(defaultResume.id);
              setSelectedVersionId(defaultResume.currentVersion.id);
            }
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Không thể tải thông tin việc làm từ hệ thống.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [jobId]);

  const selectedResume = resumes.find((r) => r.id === selectedResumeId);

  const handleSelectResume = (r: Resume) => {
    setSelectedResumeId(r.id);
    setSelectedVersionId(r.currentVersion.id);
  };

  const handleUpdateScreeningAnswer = useCallback((questionId: string, value: string) => {
    setScreeningAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  const handleSubmit = async () => {
    if (!isLiveWritesEnabled()) {
      return;
    }
    if (!selectedResumeId || !selectedVersionId) {
      setError("Vui lòng chọn một bản CV để ứng tuyển.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await candidateApplicationApi.submit(jobId, {
        resumeId: selectedResumeId,
        resumeVersionId: selectedVersionId,
        coverLetter: coverLetter.trim() || undefined,
      });
      // Xóa draft sau khi nộp thành công
      applicationDraftService.clearDraft(userId, jobId);
      setSubmittedApp(res);
      setStep("success");
    } catch (err: unknown) {
      const apiErr = err as { status?: number; code?: string; message?: string };
      if (apiErr.status === 409 || apiErr.code === "APPLICATION_DUPLICATE") {
        setError("Bạn đã nộp đơn ứng tuyển cho vị trí này trước đó. Không thể gửi trùng lặp.");
      } else if (apiErr.status === 404 && apiErr.code === "CANDIDATE_PROFILE_NOT_FOUND") {
        setError("Không tìm thấy hồ sơ ứng viên. Vui lòng hoàn thành hồ sơ cá nhân trước khi ứng tuyển.");
      } else {
        setError(apiErr.message || "Gửi đơn ứng tuyển thất bại. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className={styles.statePage}>
        <div>
          <p>Đang tải thông tin ứng tuyển...</p>
        </div>
      </section>
    );
  }

  if (error && !job) {
    return (
      <section className={styles.statePage}>
        <div>
          <h1>Không thể tải thông tin việc làm</h1>
          <p>{error}</p>
          <Link to="/jobs">Quay lại danh sách việc làm</Link>
        </div>
      </section>
    );
  }

  if (!job) {
    return (
      <section className={styles.statePage}>
        <div>
          <h1>Không tìm thấy việc làm</h1>
          <p>Tin tuyển dụng không tồn tại hoặc đã hết hạn.</p>
          <Link to="/jobs">Quay lại danh sách việc làm</Link>
        </div>
      </section>
    );
  }

  if (profileExists === false) {
    return (
      <section className={styles.page}>
        <div className="container">
          <Link to={`/jobs/${jobId}`} className={styles.backLink}>
            ← Quay lại việc làm
          </Link>
          <div className={styles.formCard}>
            <div className={`${styles.bannerNotice} ${styles.bannerWarning}`}>
              <strong>Yêu cầu hoàn tất Hồ sơ Ứng viên:</strong>
              <span>
                Theo quy định của hệ thống FINDWORK, bạn cần có Hồ sơ Ứng viên hợp lệ trước khi gửi đơn ứng tuyển vào doanh nghiệp.
              </span>
            </div>
            <div className={styles.buttonRow}>
              <Link to="/candidate/onboarding" className={styles.submitBtn}>
                Tạo hồ sơ ứng viên ngay
              </Link>
              <Link to={`/jobs/${jobId}`} className={styles.secondaryBtn}>
                Quay lại việc làm
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (resumes.length === 0) {
    return (
      <section className={styles.page}>
        <div className="container">
          <Link to={`/jobs/${jobId}`} className={styles.backLink}>
            ← Quay lại việc làm
          </Link>
          <div className={styles.formCard}>
            <div className={`${styles.bannerNotice} ${styles.bannerWarning}`}>
              <strong>Chưa có CV nào trong tài khoản:</strong>
              <span>
                Bạn cần tạo một bản CV trực tuyến hoặc tải lên CV để đính kèm vào đơn ứng tuyển.
              </span>
            </div>
            <div className={styles.buttonRow}>
              <Link to={`/cv/create?returnTo=${encodeURIComponent(`/jobs/${jobId}/apply`)}`} className={styles.submitBtn}>
                Tạo CV ngay
              </Link>
              <Link to={`/jobs/${jobId}`} className={styles.secondaryBtn}>
                Quay lại việc làm
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (step === "success") {
    return (
      <section className={styles.page}>
        <div className="container" style={{ maxWidth: 680 }}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.successTitle}>Nộp đơn ứng tuyển thành công!</h1>
            <p className={styles.successDesc}>
              Hồ sơ ứng tuyển của bạn đã được gửi trực tiếp tới <strong>{job.companyName || "nhà tuyển dụng"}</strong> cho vị trí <strong>{job.title}</strong>.
            </p>
            {submittedApp && (
              <div className={styles.reviewGrid}>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Mã đơn ứng tuyển</span>
                  <span className={styles.reviewValue}>{submittedApp.id}</span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Thời gian ghi nhận</span>
                  <span className={styles.reviewValue}>
                    {submittedApp.submittedAt ? new Date(submittedApp.submittedAt).toLocaleString("vi-VN") : "Vừa xong"}
                  </span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Trạng thái</span>
                  <span className={styles.reviewValue}>Đã nộp (SUBMITTED)</span>
                </div>
              </div>
            )}
            <div className={styles.buttonRow} style={{ justifyContent: "center" }}>
              <Link to="/candidate/applications" className={styles.submitBtn}>
                Xem danh sách đơn đã nộp
              </Link>
              <Link to={`/jobs/${jobId}`} className={styles.secondaryBtn}>
                Quay lại việc làm
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className="container">
        <Link to={`/jobs/${jobId}`} className={styles.backLink}>
          ← Quay lại việc làm
        </Link>

        <header className={styles.header}>
          <span>Ứng tuyển việc làm trực tuyến</span>
          <h1>{job.title}</h1>
          <p>
            {job.companyName || "Doanh nghiệp tuyển dụng"}
            {job.categoryName ? ` • ${job.categoryName}` : ""}
            {job.employmentType ? ` • ${EMPLOYMENT_TYPE_LABEL[job.employmentType]}` : ""}
          </p>
        </header>

        <ApplicationStepper currentStep={step} />

        {error && (
          <aside className={`${styles.bannerNotice} ${styles.bannerError}`} role="alert">
            <strong>Thông báo:</strong> {error}
          </aside>
        )}

        <div className={styles.workspace} style={{ marginTop: 24 }}>
          <main className={styles.mainColumn}>
            {step === "resume" && (
              <div className={styles.formCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                  <div>
                    <h2 className={styles.sectionTitle}>Bước 1: Chọn CV ứng tuyển</h2>
                    <p className={styles.sectionSubtitle}>
                      Chọn bản CV bạn muốn sử dụng để nộp cho vị trí này. Nhà tuyển dụng sẽ xem bản CV snapshot kèm thông tin phiên bản này.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link
                      to={`/cv/create?returnTo=${encodeURIComponent(`/jobs/${jobId}/apply`)}`}
                      className={styles.secondaryBtn}
                      style={{ padding: "8px 14px", fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      + Tạo CV mới
                    </Link>
                    <Link
                      to="/cv"
                      className={styles.secondaryBtn}
                      style={{ padding: "8px 14px", fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      Quản lý CV
                    </Link>
                  </div>
                </div>

                <div className={styles.resumeOptionList}>
                  {resumes.map((r) => {
                    const isSelected = r.id === selectedResumeId;
                    return (
                      <label
                        key={r.id}
                        className={`${styles.resumeOptionItem} ${isSelected ? styles.resumeOptionSelected : ""}`}
                      >
                        <input
                          type="radio"
                          name="selectedResume"
                          className={styles.resumeRadio}
                          checked={isSelected}
                          onChange={() => handleSelectResume(r)}
                        />
                        <div className={styles.resumeInfo}>
                          <div className={styles.resumeName}>{r.name}</div>
                          <div className={styles.resumeMeta}>
                            <span>Loại: {r.sourceType === "builder" ? "Tạo trực tuyến (CV Builder)" : "File PDF tải lên"}</span>
                            <span>Phiên bản: v{r.currentVersion.versionNumber}</span>
                            <span>Cập nhật: {new Date(r.updatedAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className={styles.buttonRow}>
                  <Link to={`/jobs/${jobId}`} className={styles.secondaryBtn}>
                    Hủy bỏ
                  </Link>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    disabled={!selectedResumeId}
                    onClick={() => setStep("details")}
                  >
                    Tiếp tục: Thông tin & Thư giới thiệu →
                  </button>
                </div>
              </div>
            )}

            {step === "details" && (
              <div className={styles.formCard}>
                <h2 className={styles.sectionTitle}>Bước 2: Thông tin ứng viên & Thư giới thiệu</h2>
                <p className={styles.sectionSubtitle}>
                  Thông tin liên hệ xác thực và thư giới thiệu đính kèm cho nhà tuyển dụng.
                </p>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <span className={styles.reviewLabel}>Họ và tên ứng viên</span>
                      <input
                        type="text"
                        className={styles.textarea}
                        style={{ minHeight: "auto", height: 42, background: "#f8fafc" }}
                        value={user?.name || "Ứng viên FINDWORK"}
                        readOnly
                      />
                    </div>
                    <div>
                      <span className={styles.reviewLabel}>Email liên hệ</span>
                      <input
                        type="text"
                        className={styles.textarea}
                        style={{ minHeight: "auto", height: 42, background: "#f8fafc" }}
                        value={user?.email || "Chưa cập nhật"}
                        readOnly
                      />
                    </div>
                  </div>

                  <label htmlFor="cover-letter-input" className={styles.reviewLabel}>
                    Nội dung thư giới thiệu (Tùy chọn, tối đa 5000 ký tự)
                  </label>
                  <textarea
                    id="cover-letter-input"
                    className={styles.textarea}
                    placeholder="Kính gửi nhà tuyển dụng, tôi ứng tuyển vị trí này vì có kinh nghiệm phù hợp với các yêu cầu..."
                    value={coverLetter}
                    maxLength={5000}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />
                  <div className={styles.charCounter}>
                    {coverLetter.length} / 5000 ký tự
                  </div>
                </div>

                <div className={styles.buttonRow}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setStep("resume")}
                  >
                    ← Quay lại chọn CV
                  </button>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    onClick={() => setStep("questions")}
                  >
                    Tiếp tục: Câu hỏi sàng lọc →
                  </button>
                </div>
              </div>
            )}

            {step === "questions" && (
              <div className={styles.formCard}>
                <h2 className={styles.sectionTitle}>Bước 3: Câu hỏi sàng lọc của nhà tuyển dụng</h2>
                <p className={styles.sectionSubtitle}>
                  Nhà tuyển dụng có thể đặt các câu hỏi sàng lọc nhằm nắm bắt rõ hơn năng lực của ứng viên.
                </p>

                <div className={`${styles.bannerNotice} ${styles.bannerInfo}`} style={{ marginBottom: 24 }}>
                  <strong>Trạng thái sàng lọc vị trí:</strong>
                  <span>
                    Vị trí này không yêu cầu câu hỏi sàng lọc bổ sung bắt buộc từ nhà tuyển dụng. Toàn bộ thông tin CV và thư giới thiệu của bạn đã sẵn sàng để gửi.
                  </span>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="additional-notes" className={styles.reviewLabel}>
                    Ghi chú bổ sung cho nhà tuyển dụng (Tùy chọn)
                  </label>
                  <textarea
                    id="additional-notes"
                    className={styles.textarea}
                    style={{ minHeight: 90 }}
                    placeholder="Bổ sung thêm thông tin về thời gian phỏng vấn phù hợp hoặc các lưu ý khác..."
                    value={screeningAnswers["notes"] ?? ""}
                    onChange={(e) => handleUpdateScreeningAnswer("notes", e.target.value)}
                  />
                </div>

                <div className={styles.buttonRow}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setStep("details")}
                  >
                    ← Quay lại thông tin
                  </button>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    onClick={() => setStep("review")}
                  >
                    Tiếp tục: Xem lại hồ sơ →
                  </button>
                </div>
              </div>
            )}

            {step === "review" && (
              <div className={styles.formCard}>
                <h2 className={styles.sectionTitle}>Bước 4: Xem lại và xác nhận nộp đơn</h2>
                <p className={styles.sectionSubtitle}>
                  Vui lòng kiểm tra lại toàn bộ thông tin trước khi gửi đơn ứng tuyển tới nhà tuyển dụng.
                </p>

                <div className={styles.reviewGrid}>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Vị trí ứng tuyển</span>
                    <span className={styles.reviewValue}>{job.title}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Doanh nghiệp</span>
                    <span className={styles.reviewValue}>{job.companyName || "Chưa cập nhật"}</span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>CV đính kèm</span>
                    <span className={styles.reviewValue}>
                      {selectedResume?.name} (Phiên bản v{selectedResume?.currentVersion.versionNumber})
                    </span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Ứng viên</span>
                    <span className={styles.reviewValue}>
                      {user?.name || user?.email || "Ứng viên FINDWORK"}
                    </span>
                  </div>
                  <div className={styles.reviewRow}>
                    <span className={styles.reviewLabel}>Thư giới thiệu</span>
                    <span className={styles.reviewValue}>
                      {coverLetter.trim() || "(Không đính kèm thư giới thiệu)"}
                    </span>
                  </div>
                  {screeningAnswers["notes"] && (
                    <div className={styles.reviewRow}>
                      <span className={styles.reviewLabel}>Ghi chú bổ sung</span>
                      <span className={styles.reviewValue}>
                        {screeningAnswers["notes"]}
                      </span>
                    </div>
                  )}
                </div>

                {!isLiveWritesEnabled() && (
                  <aside className={`${styles.bannerNotice} ${styles.bannerWarning}`} role="note">
                    <strong>Chế độ an toàn kiểm thử (ENABLE_LIVE_WRITES: false):</strong>
                    <span>
                      Cổng ghi cơ sở dữ liệu trực tiếp đang được tạm khóa để bảo đảm an toàn nộp bài theo quy định sprint. API nộp đơn thực tế (POST /api/v1/jobs/:jobId/applications) đã được kết nối hoàn chỉnh. Khi bật ENABLE_LIVE_WRITES: true, đơn sẽ được ghi nhận trực tiếp vào hệ thống.
                    </span>
                  </aside>
                )}

                <div className={styles.buttonRow}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setStep("questions")}
                  >
                    ← Quay lại sửa câu hỏi
                  </button>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    disabled={submitting || !isLiveWritesEnabled()}
                    onClick={handleSubmit}
                    title={!isLiveWritesEnabled() ? "Cổng ghi trực tiếp đang khóa an toàn" : "Xác nhận nộp đơn ứng tuyển"}
                  >
                    {submitting
                      ? "Đang gửi đơn..."
                      : isLiveWritesEnabled()
                      ? "Xác nhận nộp đơn"
                      : "Nộp đơn (Cổng ghi an toàn đang khóa)"}
                  </button>
                </div>
              </div>
            )}
          </main>

          <aside className={styles.sidebarColumn}>
            <div className={styles.formCard} style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "#0f172a" }}>Tóm tắt tuyển dụng</h3>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 8px" }}>
                  <strong>Doanh nghiệp:</strong> {job.companyName || "Chưa cập nhật"}
                </p>
                <p style={{ margin: "0 0 8px" }}>
                  <strong>Hình thức:</strong> {job.employmentType ? EMPLOYMENT_TYPE_LABEL[job.employmentType] : "Toàn thời gian"}
                </p>
                <p style={{ margin: "0 0 8px" }}>
                  <strong>Nơi làm việc:</strong> {job.workplaceType ? WORKPLACE_TYPE_LABEL[job.workplaceType] : "Tại văn phòng"}
                </p>
                <p style={{ margin: "0 0 8px" }}>
                  <strong>Mức lương:</strong> {formatSalary(job)}
                </p>
                {job.applicationDeadline && (
                  <p style={{ margin: 0 }}>
                    <strong>Hạn nộp hồ sơ:</strong> {new Date(job.applicationDeadline).toLocaleDateString("vi-VN")}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default JobApplicationPage;
