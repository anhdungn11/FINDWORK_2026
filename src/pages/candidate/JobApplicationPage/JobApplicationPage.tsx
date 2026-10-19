import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
    Link,
    useLocation,
    useParams,
    useSearchParams,
} from "react-router-dom";
import { isDemoFixturesAllowed } from "@/config/featureFlags";

import ApplicationJobSummary from "@/features/applications/components/ApplicationJobSummary/ApplicationJobSummary";
import ApplicationStepper from "@/features/applications/components/ApplicationStepper/ApplicationStepper";
import ResumeSelectionStep from "@/features/applications/components/ResumeSelectionStep";
import { useApplicationFlow } from "@/features/applications/hooks/useApplicationFlow";
import ApplicationDetailsStep from "@/features/applications/components/ApplicationDetailsStep/ApplicationDetailsStep";
import ApplicationQuestionsStep from "@/features/applications/components/ApplicationQuestionsStep";
import ApplicationReviewStep from "@/features/applications/components/ApplicationReviewStep";
import { parseJobId } from "@/app/router/jobId";
import { publicApi } from "@/services/api/publicApi";
import { candidateProfileService } from "@/features/candidate/profile/services/candidateProfileService";
import { resumeService } from "@/features/resume/services/resumeService";
import { candidateApplicationApi } from "@/services/api/candidateApplicationApi";
import { isLiveWritesEnabled } from "@/features/candidate/profile/config/candidateIntegrationConfig";
import { applicationDraftService } from "@/features/applications/services/applicationDraftService";
import { useApplicationDetails, createInitialDetails } from "@/features/applications/hooks/useApplicationDetails";
import {
    validateScreeningQuestions,
    type ScreeningQuestionItem,
} from "@/features/applications/utils/applicationValidation";
import type { ScreeningAnswerValue, ApplicationStep } from "@/features/applications/types/application.types";
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

const DEMO_SCREENING_QUESTIONS: ScreeningQuestionItem[] = [
    {
        id: "salary_expect",
        type: "TEXT",
        label: "Mức lương mong đợi của bạn (triệu VNĐ/tháng)",
        isRequired: true,
    },
    {
        id: "experience_yes_no",
        type: "YES_NO",
        label: "Bạn đã có kinh nghiệm làm việc thực tế với vị trí này chưa?",
        isRequired: true,
    },
    {
        id: "start_availability",
        type: "SELECT",
        label: "Thời gian bạn có thể bắt đầu làm việc nếu được tiếp nhận?",
        isRequired: true,
        options: ["Đi làm ngay", "Sau 1 tuần", "Sau 2 tuần", "Sau 1 tháng", "Thương lượng"],
    },
    {
        id: "skills_strengths",
        type: "MULTI_SELECT",
        label: "Kỹ năng hoặc thế mạnh nổi bật của bạn phù hợp với công việc?",
        isRequired: false,
        options: [
            "Giao tiếp & Làm việc nhóm",
            "Tư duy giải quyết vấn đề",
            "Ngoại ngữ chuyên ngành",
            "Quản lý thời gian & Tiến độ",
        ],
    },
    {
        id: "experience_brief",
        type: "TEXTAREA",
        label: "Mô tả ngắn gọn kinh nghiệm hoặc dự án tiêu biểu gần nhất của bạn",
        isRequired: false,
    },
];

const JobApplicationPage = () => {
    const { id } = useParams();
    const location = useLocation();

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

    if (!isDemoFixturesAllowed(location.search)) {
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
                    <p role="status">Chưa hỗ trợ gửi đơn ứng tuyển cho bản tin mẫu. Đây là bản xem trước; Chưa có đơn ứng tuyển nào được gửi.</p>
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
                            <ApplicationQuestionsStep
                                questions={DEMO_SCREENING_QUESTIONS}
                                answers={application.screeningAnswers}
                                onAnswerChange={application.updateScreeningAnswer}
                                onBack={() => application.goToStep("details")}
                                onContinue={() => application.goToStep("review")}
                                isDemo
                            />
                        )}

                        {application.currentStep === "review" && (
                            <ApplicationReviewStep
                                job={{
                                    id: application.job.id,
                                    title: application.job.title,
                                    companyName: application.job.company,
                                    locationText: application.job.location,
                                    salaryText: application.job.salary,
                                    employmentTypeLabel: application.job.type,
                                }}
                                selectedResume={application.selectedResume}
                                details={application.details}
                                questions={DEMO_SCREENING_QUESTIONS}
                                screeningAnswers={application.screeningAnswers}
                                onEditStep={application.goToStep}
                                onSubmit={() => {}}
                                isDemo
                            />
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

  const [step, setStep] = useState<ApplicationStep>(
    () => (initialDraft?.currentStep as ApplicationStep) ?? "resume"
  );
  const [job, setJob] = useState<JobDto | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>(() => initialDraft?.selectedResumeId ?? "");
  const [selectedVersionId, setSelectedVersionId] = useState<string>(() => initialDraft?.selectedResumeVersionId ?? "");
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, ScreeningAnswerValue>>(
    () => (initialDraft?.screeningAnswers as Record<string, ScreeningAnswerValue>) ?? {}
  );
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [hasOnboardingDraft, setHasOnboardingDraft] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<CompanyApplicationDto | null>(null);

  const initialDetails = useMemo(() => {
    return createInitialDetails({
      contact: {
        fullName: initialDraft?.details?.contact?.fullName || user?.name || "",
        email: initialDraft?.details?.contact?.email || user?.email || "",
        phone: initialDraft?.details?.contact?.phone || "",
      },
      currentLocation: initialDraft?.details?.currentLocation || "",
      availability: (initialDraft?.details?.availability as any) || "",
      preferredContactMethod: initialDraft?.details?.preferredContactMethod || "email",
      coverLetter: initialDraft?.details?.coverLetter || "",
    });
  }, [initialDraft, user]);

  const {
    details,
    detailsErrors,
    canContinueDetails,
    updateContact,
    updateDetails,
    prefillFromResume,
  } = useApplicationDetails({
    initialDetails,
  });

  // Lưu draft khi có thay đổi trong quá trình điền wizard
  useEffect(() => {
    if (step === "success") return;
    applicationDraftService.saveDraft(userId, jobId, {
      currentStep: step,
      selectedResumeId,
      selectedResumeVersionId: selectedVersionId,
      details,
      screeningAnswers,
    });
  }, [userId, jobId, step, selectedResumeId, selectedVersionId, details, screeningAnswers]);

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
        const hasDraft = bootstrap?.draft?.state === "exists";
        setProfileExists(hasProfile);
        setHasOnboardingDraft(hasDraft);

        setResumes(resumeList);
        if (resumeList.length > 0) {
          const eligibleResumes = resumeList.filter(
            (r) => r.sourceType === "builder" && r.status === "ready"
          );
          const createdCvId = searchParams.get("createdCvId");
          if (createdCvId && resumeList.some((r) => r.id === createdCvId)) {
            const newlyCreated = resumeList.find((r) => r.id === createdCvId)!;
            setSelectedResumeId(newlyCreated.id);
            setSelectedVersionId(newlyCreated.currentVersion.id);
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete("createdCvId");
            setSearchParams(nextParams, { replace: true });
          } else {
            // Ưu tiên giữ lại resume đã chọn trong draft nếu còn tồn tại và hợp lệ
            const draftResume = resumeList.find((r) => r.id === selectedResumeId);
            if (draftResume && draftResume.sourceType === "builder" && draftResume.status === "ready") {
              setSelectedResumeId(draftResume.id);
              setSelectedVersionId(draftResume.currentVersion.id);
            } else {
              // Ưu tiên default resume nếu eligible, hoặc bản eligible đầu tiên, hoặc fallback resumeList[0]
              const defaultResume =
                eligibleResumes.find((r) => r.isDefault) ??
                eligibleResumes[0] ??
                resumeList.find((r) => r.isDefault) ??
                resumeList[0];
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

  const selectedResume = resumes.find((r) => r.id === selectedResumeId) ?? null;

  // Prefill thông tin từ CV vào form Step 2 (không ghi đè các trường người dùng đã nhập)
  useEffect(() => {
    if (selectedResume) {
      prefillFromResume(selectedResume);
    }
  }, [selectedResume, prefillFromResume]);

  const isSubmittingRef = useRef(false);

  const isSelectedResumeEligible = Boolean(
    selectedResume &&
      String(selectedResume.sourceType || "").toLowerCase() === "builder" &&
      String(selectedResume.status || "").toLowerCase() === "ready" &&
      Boolean(selectedResume.currentVersion?.id)
  );

  const handleSelectResume = (r: Resume) => {
    const isEligible =
      String(r.sourceType || "").toLowerCase() === "builder" &&
      String(r.status || "").toLowerCase() === "ready";
    if (!isEligible) return;
    setSelectedResumeId(r.id);
    setSelectedVersionId(r.currentVersion.id);
  };

  const handleUpdateScreeningAnswer = useCallback((questionId: string, value: ScreeningAnswerValue) => {
    setScreeningAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  // Map real screening questions from job
  const realQuestions: ScreeningQuestionItem[] = useMemo(() => {
    if (!job?.screeningQuestions || job.screeningQuestions.length === 0) return [];
    return job.screeningQuestions.map((q) => ({
      id: q.id,
      type: q.type,
      label: q.label,
      isRequired: q.isRequired,
      options: q.options,
    }));
  }, [job?.screeningQuestions]);

  const handleSubmit = async () => {
    // 1. Chốt chặn synchronous lock: chống 2 click diễn ra trong cùng 1 tick event loop
    if (isSubmittingRef.current) {
      return;
    }

    if (!isLiveWritesEnabled()) {
      return;
    }

    if (!selectedResumeId || !selectedVersionId) {
      setError("Vui lòng chọn một bản CV để ứng tuyển.");
      return;
    }
    if (!isSelectedResumeEligible) {
      setError("Bản CV đã chọn không hợp lệ. Vui lòng chọn CV trực tuyến tạo từ CV Builder ở trạng thái sẵn sàng.");
      return;
    }
    if (!canContinueDetails) {
      setError("Vui lòng hoàn thành đầy đủ thông tin liên hệ và thời gian làm việc ở Bước 2.");
      setStep("details");
      return;
    }

    // Validate screening questions
    const validationErrors = validateScreeningQuestions(realQuestions, screeningAnswers);
    if (Object.keys(validationErrors).length > 0) {
      setError("Vui lòng hoàn thành các câu hỏi sàng lọc bắt buộc ở Bước 3.");
      setStep("questions");
      return;
    }

    // Khóa đồng bộ ngay lập tức trước khi chuyển sang await
    isSubmittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      // Chuẩn bị payload câu trả lời sàng lọc: chỉ gửi các câu hỏi thực sự có câu trả lời
      // YES_NO: false vẫn là câu trả lời hợp lệ (boolean)
      // MULTI_SELECT: mảng không rỗng
      // TEXT / TEXTAREA / SELECT: chuỗi không rỗng
      const answersPayload = realQuestions
        .filter((q) => {
          const ans = screeningAnswers[q.id];
          if (ans === undefined || ans === null) return false;
          if (typeof ans === "string" && ans.trim() === "") return false;
          if (Array.isArray(ans) && ans.length === 0) return false;
          return true;
        })
        .map((q) => ({
          questionId: q.id,
          answer: typeof screeningAnswers[q.id] === "string" ? (screeningAnswers[q.id] as string).trim() : screeningAnswers[q.id],
        }));

      const res = await candidateApplicationApi.submit(jobId, {
        resumeId: selectedResumeId,
        resumeVersionId: selectedVersionId,
        details: {
          contact: {
            fullName: details.contact.fullName.trim(),
            email: details.contact.email.trim(),
            phone: details.contact.phone.trim(),
          },
          currentLocation: details.currentLocation.trim() || undefined,
          availability: details.availability as any,
          preferredContactMethod: details.preferredContactMethod,
        },
        coverLetter: details.coverLetter.trim() || undefined,
        answers: answersPayload.length > 0 ? answersPayload : undefined,
      });

      // Chỉ xóa draft khi server trả về 201 thành công
      applicationDraftService.clearDraft(userId, jobId);
      setSubmittedApp(res);
      setStep("success");
      // GIỮ NGUYÊN KHÓA isSubmittingRef.current = true: không cho phép resubmit đơn đã nộp thành công
    } catch (err: unknown) {
      // Khi server trả lỗi, draft vẫn được giữ nguyên trong sessionStorage
      isSubmittingRef.current = false;
      const apiErr = err as { status?: number; code?: string; message?: string; details?: unknown };
      const errCode = apiErr.code ?? "";
      const status = apiErr.status ?? 0;

      if (errCode === "APPLICATION_DUPLICATE" || (status === 409 && (errCode === "ALREADY_APPLIED" || apiErr.message?.includes("already applied")))) {
        setError("Bạn đã nộp đơn ứng tuyển cho vị trí này trước đó. Vui lòng kiểm tra danh sách đơn đã nộp.");
        isSubmittingRef.current = true; // Duplicate application: giữ khóa để tránh spam request trùng
      } else if (errCode === "JOB_UNAVAILABLE" || (status === 409 && (errCode === "JOB_NOT_ACCEPTING" || apiErr.message?.includes("Job") || apiErr.message?.includes("not accepting")))) {
        setError("Vị trí tuyển dụng này hiện không còn nhận hồ sơ ứng tuyển (đã đóng, tạm dừng hoặc hết hạn).");
      } else if (errCode === "SCREENING_CONFIGURATION_INVALID") {
        setError("Cấu hình câu hỏi sàng lọc của tin tuyển dụng bị lỗi trên máy chủ. Vui lòng liên hệ nhà tuyển dụng hoặc hỗ trợ kỹ thuật.");
      } else if (status === 404 && (errCode === "CANDIDATE_PROFILE_NOT_FOUND" || errCode === "NOT_FOUND")) {
        setError("Không tìm thấy hồ sơ ứng viên hợp lệ trên hệ thống. Vui lòng hoàn tất hồ sơ cá nhân trước khi ứng tuyển.");
      } else if (errCode === "RESUME_UNAVAILABLE") {
        setError("Bản CV đã chọn không hợp lệ, chưa ở trạng thái sẵn sàng hoặc không thuộc quyền sở hữu của bạn.");
      } else if (errCode === "SCREENING_REQUIRED_ANSWER_MISSING") {
        setError("Vui lòng trả lời đầy đủ các câu hỏi sàng lọc bắt buộc của nhà tuyển dụng.");
      } else if (errCode === "SCREENING_ANSWER_INVALID" || errCode === "SCREENING_OPTION_INVALID") {
        setError("Câu trả lời câu hỏi sàng lọc không hợp lệ hoặc không thuộc danh sách lựa chọn của nhà tuyển dụng.");
      } else if (errCode === "SCREENING_QUESTION_INVALID") {
        setError("Câu hỏi sàng lọc không hợp lệ hoặc không thuộc vị trí tuyển dụng này.");
      } else if (errCode === "VALIDATION_ERROR") {
        setError(apiErr.message || "Thông tin gửi lên không đúng định dạng yêu cầu của hệ thống.");
      } else if (status === 401 || errCode.startsWith("AUTH_")) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.");
      } else if (status === 403) {
        setError("Tài khoản của bạn không có quyền nộp đơn cho vị trí này.");
      } else if (status === 0 || errCode === "NETWORK_ERROR") {
        setError("Không thể kết nối tới máy chủ hoặc yêu cầu đã hết thời gian chờ. Đơn của bạn chưa được xác nhận, bản nháp vẫn được lưu an toàn. Vui lòng thử lại sau.");
      } else {
        setError(apiErr.message || "Gửi đơn ứng tuyển thất bại. Vui lòng thử lại sau.");
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
                {hasOnboardingDraft
                  ? "Hệ thống phát hiện tài khoản của bạn đã có bản nháp từ Onboarding. Vui lòng hoàn tất và kích hoạt hồ sơ ứng viên trước khi nộp đơn ứng tuyển."
                  : "Theo quy định của hệ thống FINDWORK, bạn cần có Hồ sơ Ứng viên hợp lệ trước khi gửi đơn ứng tuyển vào doanh nghiệp."}
              </span>
            </div>
            <div className={styles.buttonRow}>
              <Link to="/candidate/onboarding" className={styles.submitBtn}>
                {hasOnboardingDraft ? "Tiếp tục hoàn thiện hồ sơ" : "Tạo hồ sơ ứng viên ngay"}
              </Link>
              {hasOnboardingDraft && (
                <Link to="/candidate/profile" className={styles.secondaryBtn}>
                  Xem hồ sơ cá nhân
                </Link>
              )}
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
                    const isEligible =
                      String(r.sourceType || "").toLowerCase() === "builder" &&
                      String(r.status || "").toLowerCase() === "ready";
                    return (
                      <label
                        key={r.id}
                        className={`${styles.resumeOptionItem} ${isSelected ? styles.resumeOptionSelected : ""}`}
                        style={!isEligible ? { opacity: 0.7, cursor: "not-allowed" } : undefined}
                      >
                        <input
                          type="radio"
                          name="selectedResume"
                          className={styles.resumeRadio}
                          checked={isSelected}
                          disabled={!isEligible}
                          onChange={() => handleSelectResume(r)}
                        />
                        <div className={styles.resumeInfo}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className={styles.resumeName}>{r.name}</span>
                            {r.isDefault && (
                              <span style={{ fontSize: 11, background: "#dbeafe", color: "#1e40af", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                                Mặc định
                              </span>
                            )}
                            {isEligible ? (
                              <span style={{ fontSize: 11, background: "#dcfce7", color: "#166534", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                                Sẵn sàng ứng tuyển
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, background: "#fee2e2", color: "#991b1b", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                                {String(r.sourceType || "").toLowerCase() !== "builder" ? "Chưa hỗ trợ tệp tải lên" : "Chưa hoàn tất"}
                              </span>
                            )}
                          </div>
                          <div className={styles.resumeMeta}>
                            <span>Loại: {String(r.sourceType || "").toLowerCase() === "builder" ? "Tạo trực tuyến (CV Builder)" : "File PDF tải lên"}</span>
                            <span>Phiên bản: v{r.currentVersion.versionNumber}</span>
                            <span>Cập nhật: {new Date(r.updatedAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                          {!isEligible && (
                            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#b91c1c" }}>
                              Hệ thống hiện yêu cầu CV tạo từ CV Builder ở trạng thái sẵn sàng để nộp trực tuyến kèm thông tin phiên bản.
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {!resumes.some((r) => String(r.sourceType || "").toLowerCase() === "builder" && String(r.status || "").toLowerCase() === "ready") && (
                  <div className={`${styles.bannerNotice} ${styles.bannerWarning}`} style={{ marginTop: 12 }}>
                    <strong>Lưu ý:</strong> Tài khoản của bạn chưa có bản CV nào tạo trực tuyến (CV Builder) ở trạng thái sẵn sàng. Vui lòng bấm <strong>"+ Tạo CV mới"</strong> để tạo CV trước khi ứng tuyển.
                  </div>
                )}

                <div className={styles.buttonRow}>
                  <Link to={`/jobs/${jobId}`} className={styles.secondaryBtn}>
                    Hủy bỏ
                  </Link>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    disabled={!selectedResumeId || !isSelectedResumeEligible}
                    onClick={() => setStep("details")}
                  >
                    Tiếp tục: Thông tin & Thư giới thiệu →
                  </button>
                </div>
              </div>
            )}

            {step === "details" && (
              <ApplicationDetailsStep
                details={details}
                errors={detailsErrors}
                selectedResume={selectedResume}
                canContinue={canContinueDetails}
                onContactChange={updateContact}
                onDetailsChange={updateDetails}
                onBack={() => setStep("resume")}
                onContinue={() => setStep("questions")}
              />
            )}

            {step === "questions" && (
              <ApplicationQuestionsStep
                questions={realQuestions}
                answers={screeningAnswers}
                onAnswerChange={handleUpdateScreeningAnswer}
                onBack={() => setStep("details")}
                onContinue={() => setStep("review")}
                isDemo={false}
              />
            )}

            {step === "review" && (
              <ApplicationReviewStep
                job={{
                  id: job.id,
                  title: job.title,
                  companyName: job.companyName,
                  categoryName: job.categoryName,
                  employmentTypeLabel: job.employmentType ? EMPLOYMENT_TYPE_LABEL[job.employmentType] : null,
                  workplaceTypeLabel: job.workplaceType ? WORKPLACE_TYPE_LABEL[job.workplaceType] : null,
                  salaryText: formatSalary(job),
                }}
                selectedResume={selectedResume}
                details={details}
                questions={realQuestions}
                screeningAnswers={screeningAnswers}
                onEditStep={setStep}
                onSubmit={handleSubmit}
                isSubmitting={submitting}
                isDemo={false}
                isLiveWritesEnabled={isLiveWritesEnabled()}
              />
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
