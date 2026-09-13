import styles from "../styles/EducationOverview.module.css";

interface EducationEmptyStateProps {
  onAdd: () => void;
}

const EducationEmptyState = ({ onAdd }: EducationEmptyStateProps) => (
  <div className={styles.emptyState}>
    <div className={styles.emptyIcon}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m3 9 9-5 9 5-9 5-9-5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M7 12v4c0 1.5 2.3 3 5 3s5-1.5 5-3v-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>

    <h4>Chưa có thông tin học vấn</h4>
    <p>Thêm quá trình học tập để hoàn thiện hồ sơ nghề nghiệp của bạn.</p>

    <button type="button" onClick={onAdd}>
      + Thêm học vấn đầu tiên
    </button>
  </div>
);

export default EducationEmptyState;
