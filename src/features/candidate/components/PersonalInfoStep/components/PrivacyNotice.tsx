import styles from "../PersonalInfoStep.module.css";

const PrivacyNotice = () => {
  return (
    <div className={styles.securityNotice}>
      <div className={styles.securityIcon}>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            d="M12 3 5 6v5c0 4.6 2.9 8.3 7 10 4.1-1.7 7-5.4 7-10V6l-7-3Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />

          <path
            d="m9 12 2 2 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div>
        <strong>
          Kiểm soát quyền riêng tư
        </strong>

        <p>
          Email, số điện thoại và địa chỉ không mặc
          định công khai cho nhà tuyển dụng. Bạn sẽ
          quyết định quyền chia sẻ ở bước cuối.
        </p>
      </div>
    </div>
  );
};

export default PrivacyNotice;
