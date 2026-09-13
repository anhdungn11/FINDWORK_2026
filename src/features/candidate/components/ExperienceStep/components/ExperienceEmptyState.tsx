import styles from "../styles/ExperienceOverview.module.css";

interface ExperienceEmptyStateProps {
  onAdd: () => void;
}

const ExperienceEmptyState = ({ onAdd }: ExperienceEmptyStateProps) => (
  <div className={styles.emptyState}>
    <div className={styles.emptyIcon}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="4"
          y="7"
          width="16"
          height="12"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 12h16M10 12v2h4v-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>

    <h4>Chưa có kinh nghiệm làm việc</h4>
    <p>
      Nếu bạn từng thực tập, làm part-time, freelance, dự án thực tế hoặc công
      việc chính thức, hãy thêm vào đây.
    </p>

    <button type="button" onClick={onAdd}>
      + Thêm kinh nghiệm đầu tiên
    </button>

    <span className={styles.skipHint}>
      Chưa từng làm việc? Bạn có thể bỏ qua bước này và bổ sung sau.
    </span>
  </div>
);

export default ExperienceEmptyState;
