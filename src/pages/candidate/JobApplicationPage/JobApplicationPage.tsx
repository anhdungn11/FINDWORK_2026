import { useState, useEffect } from "react";
import {
    Link,
    useParams,
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
                    <span>Ứng tuyển việc làm</span>

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
                            <div role="status">
                                <h2>Chưa hỗ trợ gửi đơn ứng tuyển</h2>
                                <p>Hệ thống chưa có API ứng tuyển. Thông tin bạn vừa nhập chưa được gửi.</p>
                                <button type="button" onClick={() => application.goToStep("details")}>Quay lại</button>
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
  const [step, setStep] = useState<"resume" | "cover_letter" | "review" | "success">("resume");
  const [job, setJob] = useState<JobDto | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<CompanyApplicationDto | null>(null);

  const user = useAuthStore((state) => state.user);

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
          const defaultResume = resumeList.find((r) => r.isDefault) ?? resumeList[0];
          setSelectedResumeId(defaultResume.id);
          setSelectedVersionId(defaultResume.currentVersion.id);
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
              <Link to="/cv/create" className={styles.submitBtn}>
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

        {error && (
          <aside className={`${styles.bannerNotice} ${styles.bannerError}`} role="alert">
            <strong>Thông báo:</strong> {error}
          </aside>
        )}

        <div className={styles.workspace} style={{ marginTop: 24 }}>
          <main className={styles.mainColumn}>
            {step === "resume" && (
              <div className={styles.formCard}>
                <h2 className={styles.sectionTitle}>Bước 1: Chọn CV ứng tuyển</h2>
                <p className={styles.sectionSubtitle}>
                  Chọn bản CV bạn muốn sử dụng để nộp cho vị trí này. Nhà tuyển dụng sẽ xem bản CV snapshot kèm thông tin phiên bản này.
                </p>

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
                    onClick={() => setStep("cover_letter")}
                  >
                    Tiếp tục: Viết thư giới thiệu →
                  </button>
                </div>
              </div>
            )}

            {step === "cover_letter" && (
              <div className={styles.formCard}>
                <h2 className={styles.sectionTitle}>Bước 2: Thư giới thiệu (Cover Letter)</h2>
                <p className={styles.sectionSubtitle}>
                  Thư giới thiệu giúp nhà tuyển dụng hiểu rõ hơn về lý do bạn ứng tuyển, kinh nghiệm phù hợp và sự nhiệt huyết với vị trí này.
                </p>

                <div style={{ marginBottom: 16 }}>
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
                    onClick={() => setStep("review")}
                  >
                    Tiếp tục: Xem lại hồ sơ →
                  </button>
                </div>
              </div>
            )}

            {step === "review" && (
              <div className={styles.formCard}>
                <h2 className={styles.sectionTitle}>Bước 3: Xem lại và xác nhận nộp đơn</h2>
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
                    onClick={() => setStep("cover_letter")}
                  >
                    ← Sửa thư giới thiệu
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
