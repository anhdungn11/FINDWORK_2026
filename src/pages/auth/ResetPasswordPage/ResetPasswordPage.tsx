import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import AuthShell from "@/features/auth/components/AuthShell/AuthShell";
import { passwordResetApi } from "@/services/api/passwordResetApi";
import { ApiFailure } from "@/services/api/apiFailure";

import styles from "./ResetPasswordPage.module.css";

const TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;

const ResetPasswordPage = () => {
  // 1. Secure token capture: fragment first (#token=<secret>), then fallback to search param (?token=<secret>)
  const [token] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const hashStr = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const hashParams = new URLSearchParams(hashStr);
    const hashToken = hashParams.get("token");
    if (hashToken && TOKEN_REGEX.test(hashToken)) {
      return hashToken;
    }
    const searchToken = new URLSearchParams(window.location.search).get("token");
    if (searchToken && TOKEN_REGEX.test(searchToken)) {
      return searchToken;
    }
    return null;
  });

  // 2. Remove token fragment immediately after capture to prevent leakage in history/referer
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
  }, []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isSubmittingRef = useRef(false);

  // Backend requires length between 12 and 128 characters
  const passwordRules = useMemo(
    () => ({
      length: password.length >= 12 && password.length <= 128,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    }),
    [password],
  );

  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || isSubmittingRef.current) return;

    setError("");

    if (!token) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ hoặc thiếu mã token.");
      return;
    }

    if (!isPasswordValid) {
      setError("Mật khẩu chưa đáp ứng đầy đủ yêu cầu (từ 12–128 ký tự, gồm chữ hoa, chữ số và ký tự đặc biệt).");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmitting(true);
    isSubmittingRef.current = true;

    try {
      await passwordResetApi.confirm(token, password);
      setIsSuccess(true);
    } catch (err: any) {
      if (err?.status === 401 || err?.code === "AUTH_PASSWORD_RESET_TOKEN_INVALID") {
        setError("Mã đặt lại mật khẩu không hợp lệ, đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu liên kết mới.");
      } else if (err?.status === 429) {
        setError("Bạn đã thử quá nhiều lần trong thời gian ngắn. Vui lòng đợi 10 phút trước khi thử lại.");
      } else if (err?.status === 503) {
        setError("Dịch vụ đặt lại mật khẩu tạm thời không khả dụng. Vui lòng thử lại sau.");
      } else {
        setError(err?.message || "Không thể cập nhật mật khẩu lúc này.");
      }
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
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
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path d="m8 12 2.6 2.6L16 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>Đặt lại mật khẩu thành công</h2>
          <p>Mật khẩu mới đã được ghi nhận và mọi phiên đăng nhập cũ đã được vô hiệu hóa để bảo vệ tài khoản.</p>
          <Link to="/login" className={styles.loginButton}>Đăng nhập ngay</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="BẢO MẬT TÀI KHOẢN"
      title="Tạo mật khẩu mới"
      description="Chọn mật khẩu mạnh từ 12 ký tự trở lên và không sử dụng lại mật khẩu cũ."
      footer={
        <p className={styles.footerText}>
          Không yêu cầu đặt lại mật khẩu? <Link to="/login">Quay lại đăng nhập</Link>
        </p>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        {!token && (
          <div className={styles.error} style={{ marginBottom: 16 }} role="alert">
            Liên kết đặt lại mật khẩu thiếu mã token xác thực hợp lệ hoặc mã sai định dạng. Vui lòng kiểm tra lại liên kết trong email hoặc{" "}
            <Link to="/forgot-password" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
              gửi yêu cầu mới
            </Link>.
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="password">Mật khẩu mới</label>
          <div className={styles.passwordInput}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              placeholder="Nhập mật khẩu mới (tối thiểu 12 ký tự)"
              autoComplete="new-password"
              required
              disabled={!token || isSubmitting}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className={styles.showPassword}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>

          <div className={styles.passwordRules}>
            <PasswordRule valid={passwordRules.length} label="12 ký tự trở lên (tối đa 128)" />
            <PasswordRule valid={passwordRules.uppercase} label="Có chữ hoa" />
            <PasswordRule valid={passwordRules.number} label="Có chữ số" />
            <PasswordRule valid={passwordRules.special} label="Có ký tự đặc biệt" />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
          <div className={styles.passwordInput}>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              required
              disabled={!token || isSubmitting}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button
              type="button"
              className={styles.showPassword}
              onClick={() => setShowConfirmPassword((current) => !current)}
            >
              {showConfirmPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={!token || !isPasswordValid || password !== confirmPassword || isSubmitting}
        >
          {isSubmitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
          <svg viewBox="0 0 24 24" aria-hidden="true">
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

const PasswordRule = ({ valid, label }: PasswordRuleProps) => {
  return (
    <span className={valid ? styles.ruleValid : styles.rule}>
      <span className={styles.ruleIcon}>{valid ? "✓" : "○"}</span>
      {label}
    </span>
  );
};

export default ResetPasswordPage;
