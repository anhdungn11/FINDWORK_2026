import styles from "./ApplicationDetailsActions.module.css";

interface ApplicationDetailsActionsProps {
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
}

const ApplicationDetailsActions = ({
  canContinue,
  onBack,
  onContinue,
}: ApplicationDetailsActionsProps) => {
  return (
    <footer className={styles.actions}>
      <button
        type="button"
        className={styles.backButton}
        onClick={onBack}
      >
        ← Quay lại
      </button>

      <button
        type="button"
        className={styles.continueButton}
        disabled={!canContinue}
        onClick={onContinue}
      >
        Tiếp tục

        <span aria-hidden="true">
          →
        </span>
      </button>
    </footer>
  );
};

export default ApplicationDetailsActions;