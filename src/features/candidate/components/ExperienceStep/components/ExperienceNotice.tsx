import styles from "../ExperienceStep.module.css";

const ExperienceNotice = () => (
  <div className={styles.notice}>
    <div className={styles.noticeIcon}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M12 11v5M12 8h.01"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>

    <div>
      <strong>Không chỉ công việc chính thức mới được tính là kinh nghiệm</strong>
      <p>
        Thực tập, part-time, freelance, tình nguyện hoặc công việc thực tế có
        liên quan đều có thể giúp hồ sơ của bạn mạnh hơn.
      </p>
    </div>
  </div>
);

export default ExperienceNotice;
