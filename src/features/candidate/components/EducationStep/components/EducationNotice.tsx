import styles from "../styles/EducationOverview.module.css";

const EducationNotice = () => (
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
      <strong>Chỉ thêm học vấn có giá trị cho hồ sơ</strong>
      <p>
        Ưu tiên chương trình học, chuyên ngành, thành tích và nội dung liên quan
        đến công việc bạn đang hướng tới.
      </p>
    </div>
  </div>
);

export default EducationNotice;
