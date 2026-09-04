import { useState } from "react";
import { Link } from "react-router-dom";

import AuthShell from "@/features/auth/components/AuthShell/AuthShell";

import styles from "./LoginPage.module.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(false);

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

    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    // Frontend mock.
    // Sau này thay bằng POST /auth/login.
    console.log({
      email,
      password,
      rememberMe,
    });
  };

  return (
    <AuthShell
      eyebrow="TÀI KHOẢN ỨNG VIÊN"
      title="Đăng nhập FINDWORK"
      description="Tiếp tục quản lý hồ sơ, CV và những cơ hội nghề nghiệp của bạn."
      footer={
        <p className={styles.registerText}>
          Chưa có tài khoản?{" "}
          <Link to="/register">
            Đăng ký ngay
          </Link>
        </p>
      }
    >
      <div className={styles.socialGrid}>
        <button
          type="button"
          className={styles.socialButton}
        >
          <span className={styles.googleIcon}>
            G
          </span>

          <span>
            Tiếp tục với Google
          </span>
        </button>

        <button
          type="button"
          className={styles.socialButton}
        >
          <span className={styles.linkedinIcon}>
            in
          </span>

          <span>
            Tiếp tục với LinkedIn
          </span>
        </button>
      </div>

      <div className={styles.divider}>
        <span>
          hoặc đăng nhập bằng email
        </span>
      </div>

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

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="password">
              Mật khẩu
            </label>

            <Link
              to="/forgot-password"
              className={styles.forgotLink}
            >
              Quên mật khẩu?
            </Link>
          </div>

          <div className={styles.passwordInput}>
            <input
              id="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              required
              onChange={(event) =>
                setPassword(event.target.value)
              }
            />

            <button
              type="button"
              className={styles.showPassword}
              onClick={() =>
                setShowPassword(
                  (current) => !current,
                )
              }
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
        </div>

        <label className={styles.remember}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) =>
              setRememberMe(
                event.target.checked,
              )
            }
          />

          <span>
            Ghi nhớ đăng nhập trên thiết bị này
          </span>
        </label>

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
          Đăng nhập

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

export default LoginPage;