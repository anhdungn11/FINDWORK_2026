import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import AuthShell from "@/features/auth/components/AuthShell/AuthShell";

import styles from "./RegisterPage.module.css";

const RegisterPage = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");

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
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (!agreeTerms) {
      setError(
        "Bạn cần đồng ý với điều khoản sử dụng.",
      );
      return;
    }

    // Frontend mock.
    console.log({
      fullName,
      email,
      password,
    });
  };

  return (
    <AuthShell
      eyebrow="TÀI KHOẢN ỨNG VIÊN"
      title="Tạo tài khoản FINDWORK"
      description="Bắt đầu xây dựng hồ sơ nghề nghiệp và khám phá những cơ hội phù hợp với bạn."
      footer={
        <p className={styles.loginText}>
          Đã có tài khoản?{" "}
          <Link to="/login">
            Đăng nhập
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
          hoặc đăng ký bằng email
        </span>
      </div>

      <form
        className={styles.form}
        onSubmit={handleSubmit}
      >
        <div className={styles.field}>
          <label htmlFor="fullName">
            Họ và tên
          </label>

          <input
            id="fullName"
            type="text"
            value={fullName}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            required
            onChange={(event) =>
              setFullName(event.target.value)
            }
          />
        </div>

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
          <label htmlFor="password">
            Mật khẩu
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
              placeholder="Tạo mật khẩu"
              autoComplete="new-password"
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
            Xác nhận mật khẩu
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
              placeholder="Nhập lại mật khẩu"
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

        <label className={styles.terms}>
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(event) =>
              setAgreeTerms(
                event.target.checked,
              )
            }
          />

          <span>
            Tôi đồng ý với{" "}
            <a href="/terms">
              Điều khoản sử dụng
            </a>{" "}
            và{" "}
            <a href="/privacy">
              Chính sách bảo mật
            </a>{" "}
            của FINDWORK.
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
          Tạo tài khoản

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

export default RegisterPage;