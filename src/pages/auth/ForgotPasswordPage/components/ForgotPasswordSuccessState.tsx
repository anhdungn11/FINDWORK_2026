import {
  Link,
} from "react-router-dom";

import styles from "../styles/ForgotPasswordSuccessState.module.css";

const ForgotPasswordSuccessState = () => {
  return (
    <div className={styles.successState}>
      <div className={styles.successIcon}>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />

          <path
            d="m4 7 8 6 8-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2>
        Email đã được ghi nhận
      </h2>

      <p>
        Vì lý do bảo mật, FINDWORK không xác nhận
        email này có tồn tại trong hệ thống hay không.
      </p>

      <Link
        to="/login"
        className={styles.backLoginButton}
      >
        Quay lại đăng nhập
      </Link>
    </div>
  );
};

export default ForgotPasswordSuccessState;
