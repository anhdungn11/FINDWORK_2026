import { useNavigate } from "react-router-dom";

import PersonalInfoStep from "@/features/candidate/components/PersonalInfoStep/PersonalInfoStep";
import { useCandidateOnboarding } from "@/features/candidate/hooks/useCandidateOnboarding";
import EducationStep from "@/features/candidate/components/EducationStep/EducationStep";
import styles from "./CandidateOnboarding.module.css";
import ExperienceStep from "@/features/candidate/components/ExperienceStep/ExperienceStep";
const CandidateOnboarding = () => {
    const navigate = useNavigate();

    const {
        data,
        updateSection,

        steps,
        currentStep,
        currentStepIndex,
        progress,

        isFirstStep,
        isLastStep,

        goNext,
        goPrevious,
        goToStep,
    } = useCandidateOnboarding();

    const handleNext = () => {
        if (isLastStep) {
            console.log("Candidate onboarding:", data);

            navigate("/candidate");
            return;
        }

        goNext();

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <span className={styles.eyebrow}>
                            THIẾT LẬP HỒ SƠ
                        </span>

                        <h1>Hoàn thiện hồ sơ nghề nghiệp</h1>

                        <p>
                            Cung cấp thông tin cần thiết để FINDWORK
                            cá nhân hóa trải nghiệm và chuẩn bị hồ sơ
                            cho quá trình ứng tuyển.
                        </p>
                    </div>

                    <div className={styles.progressSection}>
                        <div className={styles.progressHeader}>
                            <span>Tiến độ hồ sơ</span>

                            <strong>{progress}%</strong>
                        </div>

                        <div className={styles.progressTrack}>
                            <div
                                className={styles.progressBar}
                                style={{
                                    width: `${progress}%`,
                                }}
                            />
                        </div>
                    </div>

                    <nav
                        className={styles.steps}
                        aria-label="Các bước thiết lập hồ sơ"
                    >
                        {steps.map((step, index) => {
                            const isActive =
                                step.id === currentStep.id;

                            const isCompleted =
                                index < currentStepIndex;

                            const canNavigate =
                                index <= currentStepIndex;

                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    className={`${styles.step} ${isActive
                                        ? styles.stepActive
                                        : ""
                                        } ${isCompleted
                                            ? styles.stepCompleted
                                            : ""
                                        }`}
                                    disabled={!canNavigate}
                                    onClick={() => {
                                        if (canNavigate) {
                                            goToStep(step.id);
                                        }
                                    }}
                                >
                                    <span className={styles.stepNumber}>
                                        {isCompleted
                                            ? "✓"
                                            : step.number}
                                    </span>

                                    <span className={styles.stepContent}>
                                        <strong>
                                            {step.title}
                                        </strong>

                                        <small>
                                            {step.description}
                                        </small>
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className={styles.privacyNote}>
                        <div className={styles.privacyIcon}>
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    d="M12 3 5 6v5c0 4.6 2.9 8.3 7 10 4.1-1.7 7-5.4 7-10V6l-7-3Z"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                        <p>
                            Hồ sơ của bạn không tự động công khai.
                            Quyền chia sẻ sẽ được kiểm soát ở bước cuối.
                        </p>
                    </div>
                </aside>

                <section className={styles.content}>
                    <div className={styles.contentHeader}>
                        <span className={styles.stepCounter}>
                            Bước {currentStepIndex + 1} / {steps.length}
                        </span>

                        <h2>{currentStep.title}</h2>

                        <p>{currentStep.description}</p>
                    </div>

                    <div className={styles.card}>
                        {currentStep.id === "personal" && (
                            <PersonalInfoStep
                                value={data.personal}
                                onChange={(value) =>
                                    updateSection(
                                        "personal",
                                        value,
                                    )
                                }
                            />
                        )}
                        {currentStep.id === "education" && (
                            <EducationStep
                                value={data.education}
                                onChange={(value) =>
                                    updateSection(
                                        "education",
                                        value,
                                    )
                                }
                            />
                        )}

                        {currentStep.id === "experience" && (
                            <ExperienceStep
                                value={data.experience}
                                onChange={(value) =>
                                    updateSection(
                                        "experience",
                                        value,
                                    )
                                }
                            />
                        )}

                        {currentStep.id !== "personal" &&
                            currentStep.id !== "education" &&
                            currentStep.id !== "experience" && (
                                <div className={styles.pendingStep}>
                                    <span>
                                        STEP {currentStep.number}
                                    </span>

                                    <h3>
                                        {currentStep.title}
                                    </h3>

                                    <p>
                                        Phần này sẽ được xây ở bước tiếp theo.
                                    </p>
                                </div>
                            )}

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={styles.secondaryButton}
                                disabled={isFirstStep}
                                onClick={goPrevious}
                            >
                                ← Quay lại
                            </button>

                            <button
                                type="button"
                                className={styles.primaryButton}
                                onClick={handleNext}
                            >
                                {isLastStep
                                    ? "Hoàn tất hồ sơ"
                                    : "Tiếp tục"}

                                <span>→</span>
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
};

export default CandidateOnboarding;