import styles from "../styles/OnboardingActions.module.css";

interface OnboardingActionsProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

const OnboardingActions = ({ isFirstStep, isLastStep, onPrevious, onNext }: OnboardingActionsProps) => (
  <div className={styles.actions}>
    <button type="button" className={styles.secondaryButton} disabled={isFirstStep} onClick={onPrevious}>
      ← Quay lại
    </button>
    <button type="button" className={styles.primaryButton} onClick={onNext}>
      {isLastStep ? "Hoàn tất hồ sơ" : "Tiếp tục"}
      <span>→</span>
    </button>
  </div>
);

export default OnboardingActions;
