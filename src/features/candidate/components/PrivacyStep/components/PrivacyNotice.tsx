import styles from "../styles/PrivacyStep.module.css";

const PrivacyNotice = () => {
  return (
    <div className={styles.notice}>
      <span className={styles.noticeIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path
            d="M7.5 10V7.8a4.5 4.5 0 0 1 9 0V10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <rect
            x="5"
            y="10"
            width="14"
            height="10"
            rx="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M12 14v2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <div>
        <strong>Quyền riêng tư được kiểm soát theo từng ngữ cảnh</strong>
        <p>
          FINDWORK không tự động công khai địa chỉ chi tiết hoặc toàn bộ CV của
          bạn ra Internet. Khi bạn chủ động ứng tuyển, dữ liệu được chia sẻ với
          công ty sẽ được xử lý riêng theo quy trình ứng tuyển.
        </p>
      </div>
    </div>
  );
};

export default PrivacyNotice;
