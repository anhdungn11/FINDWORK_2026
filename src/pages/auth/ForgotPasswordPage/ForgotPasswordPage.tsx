import { useState } from "react";
import { Link } from "react-router-dom";

import AuthShell from "@/features/auth/components/AuthShell/AuthShell";

import styles from "./ForgotPasswordPage.module.css";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }

    setIsSubmitted(true);

    // Frontend mock.
    // Sau này sẽ gọi POST /auth/forgot-password.
  };

  if (isSubmitted) {
    return (
      <AuthShell
        eyebrow="KHÔI PHỤC TÀI KHOẢN"
        title="Kiểm tra email của bạn"
        description="Nếu email tồn tại trong hệ thống, FINDWORK sẽ gửi hướng dẫn đặt lại mật khẩu."
        footer={
          <p className={styles.footerText}>
            Chưa nhận được email?{" "}
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
            >
              Gửi lại
            </button>
          </p>
        }
      >
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

          <h2>Email đã được ghi nhận</h2>

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
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="KHÔI PHỤC TÀI KHOẢN"
      title="Quên mật khẩu?"
      description="Nhập email đã đăng ký. FINDWORK sẽ gửi hướng dẫn đặt lại mật khẩu nếu tài khoản tồn tại."
      footer={
        <p className={styles.footerText}>
          Nhớ mật khẩu rồi?{" "}
          <Link to="/login">
            Đăng nhập
          </Link>
        </p>
      }
    >
      <form
        className={styles.form}
        onSubmit={handleSubmit}
      >
        <div className={styles.field}>
          <label htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            value={email}
            placeholder="you@example.com"
            autoComplete="email"
            required
            onChange={(event) =>
              setEmail(event.target.value)
            }
          />
        </div>

        {error && (
          <div
            className={styles.error}
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className={styles.submitButton}
        >
          Gửi hướng dẫn đặt lại mật khẩu

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
        </button>
      </form>
    </AuthShell>
  );
};

export default ForgotPasswordPage;