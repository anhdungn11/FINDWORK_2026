import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import AuthShell from "@/features/auth/components/AuthShell/AuthShell";

import styles from "./ResetPasswordPage.module.css";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] =
    useState(false);

  const passwordRules = useMemo(
    () => ({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    }),
    [password],
  );

  const isPasswordValid =
    Object.values(passwordRules).every(Boolean);

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    if (!isPasswordValid) {
      setError(
        "Mật khẩu chưa đáp ứng đầy đủ yêu cầu.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Mật khẩu xác nhận không khớp.",
      );
      return;
    }

    // Frontend mock.
    // Sau này backend sẽ xác minh reset token
    // và đổi mật khẩu thật.
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <AuthShell
        eyebrow="BẢO MẬT TÀI KHOẢN"
        title="Mật khẩu đã được cập nhật"
        description="Bạn có thể đăng nhập lại bằng mật khẩu mới."
      >
        <div className={styles.successState}>
          <div className={styles.successIcon}>
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

          <h2>Đặt lại mật khẩu thành công</h2>

          <p>
            Mật khẩu mới đã được ghi nhận.
            Hãy đăng nhập lại để tiếp tục sử dụng
            FINDWORK.
          </p>

          <Link
            to="/login"
            className={styles.loginButton}
          >
            Đăng nhập
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="BẢO MẬT TÀI KHOẢN"
      title="Tạo mật khẩu mới"
      description="Chọn mật khẩu mạnh và không sử dụng lại mật khẩu cũ."
      footer={
        <p className={styles.footerText}>
          Không yêu cầu đặt lại mật khẩu?{" "}
          <Link to="/login">
            Quay lại đăng nhập
          </Link>
        </p>
      }
    >
      <form
        className={styles.form}
        onSubmit={handleSubmit}
      >
        <div className={styles.field}>
          <label htmlFor="password">
            Mật khẩu mới
          </label>

          <div className={styles.passwordInput}>
            <input
              id="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              placeholder="Nhập mật khẩu mới"
              autoComplete="new-password"
              required
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
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

          <div className={styles.passwordRules}>
            <PasswordRule
              valid={passwordRules.length}
              label="8 ký tự trở lên"
            />

            <PasswordRule
              valid={passwordRules.uppercase}
              label="Có chữ hoa"
            />

            <PasswordRule
              valid={passwordRules.number}
              label="Có chữ số"
            />

            <PasswordRule
              valid={passwordRules.special}
              label="Có ký tự đặc biệt"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword">
            Xác nhận mật khẩu mới
          </label>

          <div className={styles.passwordInput}>
            <input
              id="confirmPassword"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              value={confirmPassword}
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              required
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
            />

            <button
              type="button"
              className={styles.showPassword}
              onClick={() =>
                setShowConfirmPassword(
                  (current) => !current,
                )
              }
            >
              {showConfirmPassword
                ? "Ẩn"
                : "Hiện"}
            </button>
          </div>
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
          Cập nhật mật khẩu

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

interface PasswordRuleProps {
  valid: boolean;
  label: string;
}

const PasswordRule = ({
  valid,
  label,
}: PasswordRuleProps) => {
  return (
    <span
      className={
        valid
          ? styles.ruleValid
          : styles.rule
      }
    >
      <span className={styles.ruleIcon}>
        {valid ? "✓" : "○"}
      </span>

      {label}
    </span>
  );
};

export default ResetPasswordPage;