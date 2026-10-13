import styles from "../styles/OnboardingActions.module.css";

interface OnboardingActionsProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  disabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

const OnboardingActions = ({ isFirstStep, isLastStep, disabled = false, onPrevious, onNext }: OnboardingActionsProps) => (
  <div className={styles.actions}>
    <button type="button" className={styles.secondaryButton} disabled={isFirstStep || disabled} onClick={onPrevious}>
      ← Quay lại
    </button>
    <button type="button" className={styles.primaryButton} disabled={disabled} onClick={onNext}>
      {isLastStep ? "Lưu bản nháp" : "Tiếp tục"}
      <span>→</span>
    </button>
  </div>
);

export default OnboardingActions;
