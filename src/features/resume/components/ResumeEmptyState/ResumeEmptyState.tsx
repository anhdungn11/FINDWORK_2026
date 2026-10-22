import styles from "./ResumeEmptyState.module.css";

interface ResumeEmptyStateProps {
  onAddResume: () => void;
  onCreateResume?: () => void;
}

const ResumeEmptyState = ({ onAddResume, onCreateResume }: ResumeEmptyStateProps) => {
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
          Tạo bản CV điện tử chuẩn hóa hoặc tải lên tệp PDF có sẵn để sẵn sàng ứng tuyển vào các vị trí mong muốn.
        </p>
      </div>

      <div className={styles.actions}>
        {onCreateResume && (
          <button type="button" className={styles.primaryButton} onClick={onCreateResume}>
            <span aria-hidden="true">＋</span>
            Tạo CV trực tuyến
          </button>
        )}
        <button
          type="button"
          className={onCreateResume ? styles.secondaryButton : styles.primaryButton}
          onClick={onAddResume}
        >
          Tải file PDF
        </button>
      </div>
    </section>
  );
};

export default ResumeEmptyState;
