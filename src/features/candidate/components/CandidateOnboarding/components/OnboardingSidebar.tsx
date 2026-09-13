import type {
  OnboardingStep,
  OnboardingStepId,
} from "@/features/candidate/types/onboarding.types";

import styles from "../styles/OnboardingSidebar.module.css";

interface OnboardingSidebarProps {
  steps: OnboardingStep[];
  currentStep: OnboardingStep;
  currentStepIndex: number;
  progress: number;
  onStepChange: (stepId: OnboardingStepId) => void;
}

const OnboardingSidebar = ({
  steps,
  currentStep,
  currentStepIndex,
  progress,
  onStepChange,
}: OnboardingSidebarProps) => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <span className={styles.eyebrow}>THIẾT LẬP HỒ SƠ</span>
        <h1>Hoàn thiện hồ sơ nghề nghiệp</h1>
        <p>
          Cung cấp thông tin cần thiết để FINDWORK cá nhân hóa trải nghiệm và
          chuẩn bị hồ sơ cho quá trình ứng tuyển.
        </p>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span>Tiến độ hồ sơ</span>
          <strong>{progress}%</strong>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <nav className={styles.steps} aria-label="Các bước thiết lập hồ sơ">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep.id;
          const isCompleted = index < currentStepIndex;
          const canNavigate = index <= currentStepIndex;

          return (
            <button
              key={step.id}
              type="button"
              className={`${styles.step} ${isActive ? styles.stepActive : ""} ${isCompleted ? styles.stepCompleted : ""}`}
              disabled={!canNavigate}
              onClick={() => canNavigate && onStepChange(step.id)}
            >
              <span className={styles.stepNumber}>
                {isCompleted ? "✓" : step.number}
              </span>
              <span className={styles.stepContent}>
                <strong>{step.title}</strong>
                <small>{step.description}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <div className={styles.privacyNote}>
        <div className={styles.privacyIcon}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 5 6v5c0 4.6 2.9 8.3 7 10 4.1-1.7 7-5.4 7-10V6l-7-3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </div>
        <p>
          Hồ sơ của bạn không tự động công khai. Quyền chia sẻ sẽ được kiểm soát
          ở bước cuối.
        </p>
      </div>
    </aside>
  );
};

export default OnboardingSidebar;
