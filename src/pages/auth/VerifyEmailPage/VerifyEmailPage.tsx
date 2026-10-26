import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/services/http/apiClient";

import AuthShell from "@/features/auth/components/AuthShell/AuthShell";

import styles from "./VerifyEmailPage.module.css";

type VerifyStatus =
  | "checking"
  | "success"
  | "invalid";

const VerifyEmailPage = () => {
  const [status, setStatus] =
    useState<VerifyStatus>("checking");
  const [token] = useState(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token");
    return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
  });
  const confirmation = useRef<Promise<void> | null>(null);

  useEffect(() => {
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    if (!token) {
      setStatus("invalid");
      return;
    }

    // Reuse the promise across React StrictMode effect replays.
    confirmation.current ??= apiClient.post("/auth/email-verification/confirm", { token }).then(() => undefined);
    let active = true;
    void confirmation.current.then(() => { if (active) setStatus("success"); })
      .catch(() => { if (active) setStatus("invalid"); });
    return () => { active = false; };
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

          <Link to="/login" className={styles.resendButton}>
            Đăng nhập để yêu cầu gửi lại
          </Link>
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
