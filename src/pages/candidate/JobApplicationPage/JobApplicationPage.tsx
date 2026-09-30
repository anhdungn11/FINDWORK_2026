import {
    Link,
    useParams,
} from "react-router-dom";

import ApplicationJobSummary from "@/features/applications/components/ApplicationJobSummary/ApplicationJobSummary";
import ApplicationStepper from "@/features/applications/components/ApplicationStepper/ApplicationStepper";
import ResumeSelectionStep from "@/features/applications/components/ResumeSelectionStep";
import { useApplicationFlow } from "@/features/applications/hooks/useApplicationFlow";
import ApplicationDetailsStep from "@/features/applications/components/ApplicationDetailsStep/ApplicationDetailsStep";

import styles from "./JobApplicationPage.module.css";

const JobApplicationPage = () => {
    const { id } = useParams();

    const jobId = Number(id);

    const application = useApplicationFlow({
        jobId,
    });

    if (
        !Number.isInteger(jobId) ||
        jobId <= 0
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

export default JobApplicationPage;