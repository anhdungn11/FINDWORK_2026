import styles from "./ResumeEmptyState.module.css";

interface ResumeEmptyStateProps {
  onAddResume: () => void;
}

const ResumeEmptyState = ({ onAddResume }: ResumeEmptyStateProps) => {
  return (
    <section className={styles.emptyState}>
      <div className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v5h5M10 13h5M10 17h5" />
        </svg>
      </div>

      <div className={styles.content}>
        <span className={styles.eyebrow}>CV đầu tiên</span>
        <h2>Bạn chưa có CV nào</h2>
        <p>
          Tải CV đầu tiên để sẵn sàng ứng tuyển. FINDWORK hiện hỗ trợ
          PDF tối đa 10 MB.
        </p>
      </div>

      <button type="button" className={styles.primaryButton} onClick={onAddResume}>
        <span aria-hidden="true">＋</span>
        Tải CV
      </button>
    </section>
  );
};

export default ResumeEmptyState;
