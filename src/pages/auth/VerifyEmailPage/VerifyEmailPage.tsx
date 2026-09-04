import { useEffect, useState } from "react";
import {
  Link,
  useSearchParams,
} from "react-router-dom";

import AuthShell from "@/features/auth/components/AuthShell/AuthShell";

import styles from "./VerifyEmailPage.module.css";

type VerifyStatus =
  | "checking"
  | "success"
  | "invalid";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();

  const [status, setStatus] =
    useState<VerifyStatus>("checking");

  const token =
    searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    // Frontend mock.
    // Sau này sẽ gọi backend:
    // POST /auth/verify-email
    //
    // Backend sẽ kiểm tra:
    // - token tồn tại
    // - token còn hạn
    // - token chưa được sử dụng
    // - token thuộc đúng account

    const timer = window.setTimeout(
      () => {
        setStatus("success");
      },
      800,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [token]);

  if (status === "checking") {
    return (
      <AuthShell
        eyebrow="XÁC MINH TÀI KHOẢN"
        title="Đang xác minh email"
        description="FINDWORK đang kiểm tra liên kết xác minh của bạn."
      >
        <div className={styles.statusState}>
          <div className={styles.loadingIcon}>
            <span />
          </div>

          <h2>
            Vui lòng chờ một chút
          </h2>

          <p>
            Quá trình xác minh thường chỉ mất
            vài giây.
          </p>
        </div>
      </AuthShell>
    );
  }

  if (status === "invalid") {
    return (
      <AuthShell
        eyebrow="XÁC MINH TÀI KHOẢN"
        title="Liên kết không hợp lệ"
        description="Liên kết xác minh không tồn tại, đã hết hạn hoặc không còn khả dụng."
        footer={
          <p className={styles.footerText}>
            Đã xác minh tài khoản?{" "}
            <Link to="/login">
              Đăng nhập
            </Link>
          </p>
        }
      >
        <div className={styles.statusState}>
          <div
            className={`${styles.statusIcon} ${styles.errorIcon}`}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              />

              <path
                d="M12 8v5M12 16.5h.01"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h2>
            Không thể xác minh email
          </h2>

          <p>
            Bạn có thể yêu cầu gửi lại email
            xác minh từ tài khoản của mình.
          </p>

          <button
            type="button"
            className={styles.resendButton}
          >
            Gửi lại email xác minh
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="XÁC MINH TÀI KHOẢN"
      title="Email đã được xác minh"
      description="Tài khoản FINDWORK của bạn đã sẵn sàng để tiếp tục."
    >
      <div className={styles.statusState}>
        <div
          className={`${styles.statusIcon} ${styles.successIcon}`}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />

            <path
              d="m8 12 2.6 2.6L16 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2>
          Xác minh thành công
        </h2>

        <p>
          Email của bạn đã được xác minh.
          Bạn có thể đăng nhập và tiếp tục
          hoàn thiện hồ sơ nghề nghiệp.
        </p>

        <Link
          to="/login"
          className={styles.loginButton}
        >
          Tiếp tục đăng nhập

          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M5 12h14M13 6l6 6-6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </AuthShell>
  );
};

export default VerifyEmailPage; 