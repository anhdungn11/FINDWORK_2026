import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "@/features/auth/components/AuthShell/AuthShell";
import { emailVerificationApi } from "@/services/api/emailVerificationApi";
import { useAuthStore } from "@/store/authStore";
import styles from "./VerifyEmailPage.module.css";

type VerifyStatus = "checking" | "success" | "invalid";

export const VerifyEmailPage = () => {
  const [status, setStatus] = useState<VerifyStatus>("checking");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const [token] = useState<string | null>(() => {
    // 1. Check URL fragment (#token=<secret>) first as per Backend security specification
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const hashToken = hashParams.get("token");
    if (hashToken && /^[A-Za-z0-9_-]{43}$/.test(hashToken)) {
      return hashToken;
    }
    // 2. Fallback to query parameter (?token=<secret>)
    const searchToken = new URLSearchParams(window.location.search).get("token");
    if (searchToken && /^[A-Za-z0-9_-]{43}$/.test(searchToken)) {
      return searchToken;
    }
    return null;
  });

  const confirmation = useRef<Promise<void> | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Sanitize token from URL fragment to protect secret in browser history/referer
    if (window.location.hash) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }

    if (!token) {
      setStatus("invalid");
      setErrorMessage("Liên kết xác minh không có mã token hợp lệ hoặc sai định dạng.");
      return;
    }

    let active = true;
    confirmation.current ??= emailVerificationApi.confirm(token).then(() => undefined);

    confirmation.current
      .then(() => {
        if (!active) return;
        setStatus("success");
      })
      .catch((err) => {
        if (!active) return;
        setStatus("invalid");
        const msg =
          err?.kind === "unauthorized" || err?.message?.includes("token")
            ? "Mã xác minh không hợp lệ hoặc đã hết hạn."
            : err?.message || "Không thể xác minh email từ máy chủ.";
        setErrorMessage(msg);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleResend = async () => {
    setResendStatus(null);
    if (!user) {
      setResendStatus("Vui lòng đăng nhập vào tài khoản của bạn để yêu cầu gửi lại email xác minh.");
      return;
    }

    setIsResending(true);
    try {
      await emailVerificationApi.request();
      setResendStatus("Yêu cầu gửi lại đã được tiếp nhận và xếp vào hàng đợi gửi email.");
    } catch (err: any) {
      if (err?.code === "AUTH_EMAIL_VERIFICATION_DELIVERY_UNAVAILABLE" || err?.status === 503) {
        setResendStatus(
          "Dịch vụ gửi email hiện chưa được cấu hình nhà cung cấp dịch vụ trên máy chủ. Vui lòng liên hệ quản trị viên."
        );
      } else if (err?.status === 429) {
        setResendStatus("Bạn đã yêu cầu gửi quá nhiều lần trong thời gian ngắn. Vui lòng thử lại sau 10 phút.");
      } else {
        setResendStatus(err?.message || "Không thể gửi yêu cầu xác minh lúc này.");
      }
    } finally {
      setIsResending(false);
    }
  };

  if (status === "checking") {
    return (
      <AuthShell
        eyebrow="XÁC MINH TÀI KHOẢN"
        title="Đang xác minh email"
        description="FINDWORK đang kiểm tra liên kết xác minh từ hệ thống Backend."
      >
        <div className={styles.statusState}>
          <div className={styles.loadingIcon}>
            <span />
          </div>
          <h2>Vui lòng chờ một chút</h2>
          <p>Hệ thống đang đối soát mã xác minh an toàn.</p>
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
            Đã xác minh tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
        }
      >
        <div className={styles.statusState}>
          <div className={`${styles.statusIcon} ${styles.errorIcon}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M12 8v5M12 16.5h.01"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h2>Không thể xác minh email</h2>
          <p>{errorMessage || "Bạn có thể yêu cầu gửi lại email xác minh từ tài khoản của mình."}</p>

          {resendStatus && (
            <p
              style={{
                fontSize: "13px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "var(--color-text-secondary, #64748b)",
                marginTop: 12,
              }}
            >
              {resendStatus}
            </p>
          )}

          {user ? (
            <button
              type="button"
              className={styles.resendButton}
              onClick={handleResend}
              disabled={isResending}
              style={{ marginTop: 16 }}
            >
              {isResending ? "Đang gửi yêu cầu..." : "Gửi lại email xác minh"}
            </button>
          ) : (
            <Link to="/login" className={styles.resendButton} style={{ marginTop: 16, display: "inline-block", textAlign: "center" }}>
              Đăng nhập để yêu cầu gửi lại
            </Link>
          )}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="HOÀN TẤT"
      title="Xác minh thành công"
      description="Tài khoản FINDWORK của bạn đã sẵn sàng để tiếp tục."
    >
      <div className={styles.statusState}>
        <div className={`${styles.statusIcon} ${styles.successIcon}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="m8 12 2.6 2.6L16 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2>Xác minh thành công</h2>
        <p>
          Email của bạn đã được xác minh trên hệ thống. Bạn có thể đăng nhập và tiếp tục hoàn thiện hồ sơ
          nghề nghiệp.
        </p>

        <Link to="/login" className={styles.loginButton}>
          Tiếp tục đăng nhập
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
        </Link>
      </div>
    </AuthShell>
  );
};

export default VerifyEmailPage;
