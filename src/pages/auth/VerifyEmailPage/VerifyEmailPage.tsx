import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "@/features/auth/components/AuthShell/AuthShell";
import { emailVerificationApi } from "@/services/api/emailVerificationApi";
import { useAuthStore } from "@/store/authStore";
import styles from "./VerifyEmailPage.module.css";

const TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;

interface TokenExtractionResult {
  token: string | null;
  hasSuppliedToken: boolean;
}

const extractVerificationToken = (): TokenExtractionResult => {
  if (typeof window === "undefined") {
    return { token: null, hasSuppliedToken: false };
  }

  // 1. Check URL fragment (#token=<secret> or #<secret>) first as per Backend security specification
  const rawHash = window.location.hash.replace(/^#/, "").trim();
  if (rawHash) {
    if (rawHash.includes("=")) {
      const hashParams = new URLSearchParams(rawHash);
      const hashToken = hashParams.get("token");
      if (hashToken !== null) {
        return {
          token: TOKEN_REGEX.test(hashToken) ? hashToken : null,
          hasSuppliedToken: true,
        };
      }
    } else {
      return {
        token: TOKEN_REGEX.test(rawHash) ? rawHash : null,
        hasSuppliedToken: true,
      };
    }
  }

  // 2. Check query string (?token=<secret>)
  const searchParams = new URLSearchParams(window.location.search);
  const queryToken = searchParams.get("token");
  if (queryToken !== null) {
    return {
      token: TOKEN_REGEX.test(queryToken) ? queryToken : null,
      hasSuppliedToken: true,
    };
  }

  return { token: null, hasSuppliedToken: false };
};

type VerifyStatus = "checking" | "success" | "invalid";

export const VerifyEmailPage = () => {
  const [initialTokenInfo] = useState(extractVerificationToken);
  const { token, hasSuppliedToken } = initialTokenInfo;

  const [status, setStatus] = useState<VerifyStatus>(() => (hasSuppliedToken ? "checking" : "checking"));
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const confirmation = useRef<Promise<void> | null>(null);

  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const logout = useAuthStore((s) => s.logout);

  // 1. Sanitize the URL to protect sensitive tokens from leaking
  useEffect(() => {
    if (typeof window === "undefined") return;

    let needsClean = false;
    if (window.location.hash) {
      needsClean = true;
    }
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("token")) {
      searchParams.delete("token");
      needsClean = true;
    }

    if (needsClean) {
      const cleanSearch = searchParams.toString();
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + (cleanSearch ? `?${cleanSearch}` : ""),
      );
    }
  }, []);

  // 2. Token verification flow (when a token was supplied in the URL)
  useEffect(() => {
    if (!hasSuppliedToken) return;

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
  }, [hasSuppliedToken, token]);

  // 3. Auth initialization flow (when no token is supplied, wait for auth check)
  useEffect(() => {
    if (!hasSuppliedToken && authStatus === "idle") {
      void checkAuth();
    }
  }, [hasSuppliedToken, authStatus, checkAuth]);

  // Explicit user-triggered resend action — never run automatically
  const handleResend = async () => {
    setResendStatus(null);
    setResendSuccess(false);
    if (!user) {
      setResendStatus("Vui lòng đăng nhập vào tài khoản của bạn để yêu cầu gửi lại email xác minh.");
      return;
    }

    setIsResending(true);
    try {
      await emailVerificationApi.request();
      setResendSuccess(true);
      setResendStatus("Yêu cầu gửi email xác minh đã được tiếp nhận và xếp vào hàng đợi gửi email.");
    } catch (err: any) {
      setResendSuccess(false);
      if (err?.code === "AUTH_EMAIL_VERIFICATION_DELIVERY_UNAVAILABLE" || err?.status === 503) {
        setResendStatus(
          "Dịch vụ gửi email hiện chưa được cấu hình nhà cung cấp dịch vụ trên máy chủ. Vui lòng liên hệ quản trị viên.",
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

  // Case A: Token was supplied in URL
  if (hasSuppliedToken) {
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
              Đã xác minh tài khoản?{" "}
              <Link to="/login" state={{ from: "/verify-email" }}>
                Đăng nhập
              </Link>
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
            <p>{errorMessage || "Mã xác minh không hợp lệ hoặc đã hết hạn."}</p>

            {resendStatus && (
              <p
                style={{
                  fontSize: "13px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: resendSuccess ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${resendSuccess ? "#bbf7d0" : "#fecaca"}`,
                  color: resendSuccess ? "#166534" : "#991b1b",
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
              <Link
                to="/login"
                state={{ from: "/verify-email" }}
                className={styles.resendButton}
                style={{ marginTop: 16, display: "inline-block", textAlign: "center" }}
              >
                Đăng nhập để yêu cầu gửi lại
              </Link>
            )}
          </div>
        </AuthShell>
      );
    }

    // Success state
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
            Email của bạn đã được xác minh trên hệ thống. Bạn có thể tiếp tục hoàn thiện hồ sơ và trải nghiệm đầy
            đủ tính năng.
          </p>

          <Link
            to={user ? (user.accountType === "EMPLOYER" ? "/employer" : "/candidate") : "/login"}
            className={styles.loginButton}
          >
            {user ? "Tiếp tục vào trang chính" : "Tiếp tục đăng nhập"}
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
  }

  // Case B: No token was supplied in URL
  // 1. Wait for auth initialization before deciding signed-in vs signed-out state
  if (authStatus === "idle" || authStatus === "loading") {
    return (
      <AuthShell
        eyebrow="XÁC MINH TÀI KHOẢN"
        title="Đang kiểm tra tài khoản"
        description="FINDWORK đang kiểm tra trạng thái phiên làm việc của bạn."
      >
        <div className={styles.statusState}>
          <div className={styles.loadingIcon}>
            <span />
          </div>
          <h2>Vui lòng chờ một chút</h2>
          <p>Hệ thống đang đồng bộ thông tin phiên làm việc.</p>
        </div>
      </AuthShell>
    );
  }

  // 2. Signed-out user without token sees a clear prompt to log in and return
  if (!user || authStatus === "unauthenticated") {
    return (
      <AuthShell
        eyebrow="XÁC MINH TÀI KHOẢN"
        title="Yêu cầu đăng nhập"
        description="Vui lòng đăng nhập vào tài khoản FINDWORK để yêu cầu gửi email xác minh."
        footer={
          <p className={styles.footerText}>
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </p>
        }
      >
        <div className={styles.statusState}>
          <div className={`${styles.statusIcon} ${styles.infoIcon}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2>Bạn chưa đăng nhập</h2>
          <p>Để yêu cầu gửi email xác minh hoặc kiểm tra trạng thái tài khoản, vui lòng đăng nhập vào hệ thống.</p>

          <Link
            to="/login"
            state={{ from: "/verify-email" }}
            className={styles.loginButton}
            style={{ marginTop: 16 }}
          >
            Đăng nhập vào FINDWORK
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
  }

  // 3. Authenticated user who is already verified
  if (user.emailVerified) {
    return (
      <AuthShell
        eyebrow="XÁC MINH TÀI KHOẢN"
        title="Email đã xác thực"
        description="Địa chỉ email tài khoản của bạn đã được xác minh thành công trên FINDWORK."
        footer={
          <p className={styles.footerText}>
            Cần chuyển tài khoản?{" "}
            <button
              type="button"
              onClick={() => void logout()}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                cursor: "pointer",
                fontWeight: 700,
                padding: 0,
              }}
            >
              Đăng xuất
            </button>
          </p>
        }
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

          <h2>Tài khoản đã được bảo vệ</h2>
          <p>
            Địa chỉ email <strong>{user.email}</strong> đã hoàn tất xác thực trên hệ thống FINDWORK.
          </p>

          <Link
            to={user.accountType === "EMPLOYER" ? "/employer" : "/candidate"}
            className={styles.loginButton}
            style={{ marginTop: 16 }}
          >
            Vào trang tổng quan
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
  }

  // 4. Authenticated unverified user without a token sees a clear request UI
  return (
    <AuthShell
      eyebrow="XÁC MINH TÀI KHOẢN"
      title="Xác thực địa chỉ email"
      description="Tài khoản của bạn cần xác minh địa chỉ email để đảm bảo an toàn và kích hoạt đầy đủ quyền hạn."
      footer={
        <p className={styles.footerText}>
          Không phải tài khoản của bạn?{" "}
          <button
            type="button"
            onClick={() => void logout()}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-primary)",
              cursor: "pointer",
              fontWeight: 700,
              padding: 0,
            }}
          >
            Đăng nhập tài khoản khác
          </button>
        </p>
      }
    >
      <div className={styles.statusState}>
        <div className={`${styles.statusIcon} ${styles.infoIcon}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2>Yêu cầu xác minh email</h2>
        <p>
          Địa chỉ email tài khoản: <strong>{user.email}</strong>
          <br />
          Nhấn vào nút bên dưới để nhận liên kết kích hoạt qua hộp thư điện tử của bạn.
        </p>

        {resendStatus && (
          <div
            role="status"
            style={{
              fontSize: "13px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: resendSuccess ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${resendSuccess ? "#bbf7d0" : "#fecaca"}`,
              color: resendSuccess ? "#166534" : "#991b1b",
              marginTop: 12,
              marginBottom: 8,
              textAlign: "left",
              lineHeight: 1.5,
            }}
          >
            {resendStatus}
          </div>
        )}

        <button
          type="button"
          className={styles.loginButton}
          onClick={handleResend}
          disabled={isResending}
          style={{ marginTop: 16, width: "100%", cursor: isResending ? "not-allowed" : "pointer" }}
        >
          {isResending ? "Đang gửi yêu cầu..." : "Gửi email xác minh"}
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
      </div>
    </AuthShell>
  );
};

export default VerifyEmailPage;
