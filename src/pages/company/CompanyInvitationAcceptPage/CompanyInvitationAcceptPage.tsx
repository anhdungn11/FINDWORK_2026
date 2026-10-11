import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthShell from "@/features/auth/components/AuthShell/AuthShell";
import AuthField from "@/features/auth/components/AuthField/AuthField";
import AuthPasswordField from "@/features/auth/components/AuthPasswordField/AuthPasswordField";
import AuthSubmitButton from "@/features/auth/components/AuthSubmitButton/AuthSubmitButton";
import AuthErrorMessage from "@/features/auth/components/AuthErrorMessage/AuthErrorMessage";

import { useAuthStore } from "@/store/authStore";
import {
  acceptCompanyInvitation,
  extractTokenFromHash,
  sanitizeHashFromUrl,
  CompanyInvitationError,
  type AcceptCompanyInvitationSuccess,
  type TokenExtractionStatus,
} from "@/services/company/companyInvitationService";

import styles from "./CompanyInvitationAcceptPage.module.css";

type PagePhase =
  | "CHECKING"
  | "INVALID_TOKEN"
  | "UNAUTHENTICATED"
  | "CONFIRM"
  | "SUBMITTING"
  | "SUCCESS"
  | "ERROR";

const CompanyInvitationAcceptPage = () => {
  const navigate = useNavigate();
  const { user, accessToken, status: authStatus, checkAuth, login, logout } = useAuthStore();

  // Capture the fragment during render, before any effect can remove it.
  // React StrictMode replays effects in development, so reading it inside an
  // effect would turn a valid invitation into MISSING on the second replay.
  const [initialToken] = useState(() => extractTokenFromHash());
  const token = initialToken.token;
  const tokenStatus: TokenExtractionStatus = initialToken.status;
  const acceptInFlight = useRef(false);
  const loginInFlight = useRef(false);
  const [phase, setPhase] = useState<PagePhase>("CHECKING");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<AcceptCompanyInvitationSuccess | null>(null);
  const [invitationError, setInvitationError] = useState<CompanyInvitationError | null>(null);

  // Inline login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 1. Initial mount: extract token safely and strip hash from URL immediately
  useEffect(() => {
    let mounted = true;
    sanitizeHashFromUrl();

    if (tokenStatus !== "VALID" || !token) {
      setPhase("INVALID_TOKEN");
      return () => { mounted = false; };
    }

    // The store deduplicates simultaneous checks. Ignore completions from
    // discarded StrictMode effects or a page that has been unmounted.
    void checkAuth().then((authenticatedUser) => {
      if (!mounted) return;
      setPhase(authenticatedUser ? "CONFIRM" : "UNAUTHENTICATED");
    }).catch(() => {
      if (mounted) setPhase("UNAUTHENTICATED");
    });
    return () => { mounted = false; };
  }, [checkAuth, token, tokenStatus]);

  // Sync phase when auth state changes externally
  useEffect(() => {
    if (phase === "CHECKING" || phase === "INVALID_TOKEN" || phase === "SUCCESS") {
      return;
    }
    if (authStatus === "authenticated" && user && phase === "UNAUTHENTICATED") {
      setPhase("CONFIRM");
    } else if (authStatus === "unauthenticated" && !user && phase === "CONFIRM") {
      setPhase("UNAUTHENTICATED");
    }
  }, [authStatus, user, phase]);

  // 2. Handle Inline Login
  const handleInlineLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loginInFlight.current) return;
    setLoginError("");

    if (!loginEmail.trim()) {
      setLoginError("Vui lòng nhập địa chỉ email.");
      return;
    }
    if (!loginPassword) {
      setLoginError("Vui lòng nhập mật khẩu.");
      return;
    }

    loginInFlight.current = true;
    setIsLoggingIn(true);
    try {
      await login({ email: loginEmail, password: loginPassword });
      setLoginPassword("");
      setPhase("CONFIRM");
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      loginInFlight.current = false;
      setIsLoggingIn(false);
    }
  };

  // 3. Handle Switch Account
  const handleSwitchAccount = async () => {
    await logout();
    setLoginPassword("");
    setInvitationError(null);
    setPhase("UNAUTHENTICATED");
  };

  // 4. Handle Accept Invitation (User confirmation required, double-submission prevented)
  const handleAccept = async () => {
    if (acceptInFlight.current || !token) return;
    if (!user || !accessToken || authStatus !== "authenticated") {
      setPhase("UNAUTHENTICATED");
      return;
    }

    acceptInFlight.current = true;
    setIsSubmitting(true);
    setPhase("SUBMITTING");
    setInvitationError(null);

    try {
      const result = await acceptCompanyInvitation(token, accessToken);
      setSuccessData(result);
      setPhase("SUCCESS");
    } catch (err: unknown) {
      if (err instanceof CompanyInvitationError && err.code === "UNAUTHORIZED") {
        // The session expired after the confirmation screen was shown.
        useAuthStore.getState().clearAuth();
        setPhase("UNAUTHENTICATED");
      } else {
        setInvitationError(err instanceof CompanyInvitationError ? err :
          new CompanyInvitationError("UNKNOWN_ERROR", "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau."));
        setPhase("ERROR");
      }
    } finally {
      acceptInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // RENDER PHASES
  // ----------------------------------------------------

  // Phase: Checking
  if (phase === "CHECKING") {
    return (
      <AuthShell
        eyebrow="LỜI MỜI THAM GIA DOANH NGHIỆP"
        title="Đang kiểm tra lời mời"
        description="FINDWORK đang kiểm tra thông tin liên kết và trạng thái tài khoản của bạn."
      >
        <div className={styles.statusCard}>
          <div className={`${styles.iconWrapper} ${styles.loadingIcon}`}>
            <div className={styles.loadingSpinner} />
          </div>
          <h2 className={styles.statusTitle}>Đang tải thông tin</h2>
          <p className={styles.statusDescription}>
            Vui lòng chờ trong giây lát trong khi chúng tôi chuẩn bị lời mời cho bạn.
          </p>
        </div>
      </AuthShell>
    );
  }

  // Phase: Invalid / Missing Token
  if (phase === "INVALID_TOKEN") {
    const isMalformed = tokenStatus === "INVALID_FORMAT";
    return (
      <AuthShell
        eyebrow="LỜI MỜI THAM GIA DOANH NGHIỆP"
        title="Liên kết không hợp lệ"
        description="Không tìm thấy mã bảo mật lời mời hoặc mã bảo mật không đúng định dạng."
        footer={
          <p className={styles.footerHint}>
            Cần trợ giúp? <Link to="/">Về trang chủ FINDWORK</Link>
          </p>
        }
      >
        <div className={styles.statusCard}>
          <div className={`${styles.iconWrapper} ${styles.errorIcon}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className={styles.statusTitle}>
            {isMalformed ? "Mã bảo mật không đúng định dạng" : "Thiếu mã bảo mật lời mời"}
          </h2>
          <p className={styles.statusDescription}>
            Liên kết bạn vừa mở không chứa mã xác thực hợp lệ (mã 43 ký tự an toàn). Vui lòng
            kiểm tra lại liên kết trong email được gửi từ FINDWORK.
          </p>
          <div className={styles.actions}>
            <Link to="/" className={styles.primaryButton}>
              Về trang chủ
            </Link>
            <Link to="/login" className={styles.secondaryButton}>
              Đăng nhập FINDWORK
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  // Phase: Unauthenticated (User must log in)
  if (phase === "UNAUTHENTICATED") {
    return (
      <AuthShell
        eyebrow="LỜI MỜI THAM GIA DOANH NGHIỆP"
        title="Đăng nhập để nhận lời mời"
        description="Bạn đã nhận được lời mời tham gia doanh nghiệp. Vui lòng đăng nhập bằng email được mời."
        footer={
          <p className={styles.footerHint}>
            Chưa có tài khoản FINDWORK?{" "}
            <Link to="/register">Đăng ký bằng email được mời</Link>.
            Sau khi đăng ký và xác minh email, hãy mở lại liên kết gốc trong thư mời.
          </p>
        }
      >
        <div className={styles.loginSection}>
          <div className={styles.roleBox}>
            <div className={styles.roleBoxTitle}>
              <span>Thông tin lời mời</span>
              <span className={styles.roleTag}>VIEWER</span>
            </div>
            <p className={styles.roleBoxText}>
              Để bảo mật dữ liệu tổ chức, hệ thống chỉ cho phép tài khoản khớp chính xác với email
              nhận lời mời chấp nhận tham gia.
            </p>
          </div>

          <form onSubmit={handleInlineLogin} className={styles.inlineForm}>
            <AuthField
              id="loginEmail"
              type="email"
              label="Địa chỉ email được mời"
              value={loginEmail}
              placeholder="you@company.com"
              autoComplete="email"
              required
              onChange={setLoginEmail}
            />

            <AuthPasswordField
              id="loginPassword"
              label="Mật khẩu"
              value={loginPassword}
              placeholder="Nhập mật khẩu của bạn"
              autoComplete="current-password"
              required
              onChange={setLoginPassword}
            />

            <AuthErrorMessage message={loginError} />

            <AuthSubmitButton disabled={isLoggingIn}>
              {isLoggingIn ? "Đang xác thực..." : "Đăng nhập & Tiếp tục"}
            </AuthSubmitButton>
          </form>
        </div>
      </AuthShell>
    );
  }

  // Phase: Confirm (Authenticated, awaiting user explicit confirmation) or Submitting
  if (phase === "CONFIRM" || phase === "SUBMITTING") {
    return (
      <AuthShell
        eyebrow="LỜI MỜI THAM GIA DOANH NGHIỆP"
        title="Xác nhận tham gia công ty"
        description="Kiểm tra thông tin tài khoản và xác nhận gia nhập tổ chức trên FINDWORK."
      >
        <div className={styles.container}>
          <div className={styles.accountCard}>
            <div className={styles.accountDetails}>
              <span className={styles.accountLabel}>Tài khoản hiện tại</span>
              <span className={styles.accountEmail}>{user?.email}</span>
            </div>
            <span className={styles.accountBadge}>Đã đăng nhập</span>
          </div>

          <div className={styles.roleBox}>
            <div className={styles.roleBoxTitle}>
              <span>Vai trò khi gia nhập</span>
              <span className={styles.roleTag}>VIEWER</span>
            </div>
            <p className={styles.roleBoxText}>
              Bạn sẽ được cấp quyền Người xem (VIEWER) để theo dõi các thông tin và hoạt động tuyển
              dụng của công ty theo chính sách phân quyền.
            </p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleAccept}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className={styles.loadingSpinner} style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span>Đang tham gia...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Chấp nhận lời mời</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleSwitchAccount}
              disabled={isSubmitting}
            >
              Đổi tài khoản khác
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  // Phase: Success
  if (phase === "SUCCESS" && successData) {
    return (
      <AuthShell
        eyebrow="LỜI MỜI THAM GIA DOANH NGHIỆP"
        title="Gia nhập thành công"
        description="Chúc mừng bạn đã chính thức trở thành thành viên của công ty!"
      >
        <div className={styles.statusCard}>
          <div className={`${styles.iconWrapper} ${styles.successIcon}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          <h2 className={styles.statusTitle}>Chào mừng thành viên mới!</h2>
          <p className={styles.statusDescription}>
            Lời mời của bạn đã được xác nhận thành công. Bạn hiện có quyền truy cập vào tổ chức trên FINDWORK.
          </p>

          <div className={styles.metadataList}>
            <div className={styles.metadataRow}>
              <span className={styles.metadataLabel}>Mã định danh công ty:</span>
              <span className={styles.metadataValue}>{successData.companyId}</span>
            </div>
            <div className={styles.metadataRow}>
              <span className={styles.metadataLabel}>Vai trò được cấp:</span>
              <span className={styles.metadataValue}>{successData.role}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => navigate(`/companies/${successData.companyId}`)}
            >
              Vào trang công ty
            </button>
            <Link to="/" className={styles.secondaryButton}>
              Về trang chủ FINDWORK
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  // Phase: Error handling (403, 404, 409, 410, Network, etc.)
  const errorCode = invitationError?.code ?? "UNKNOWN_ERROR";

  if (errorCode === "FORBIDDEN") {
    return (
      <AuthShell
        eyebrow="LỜI MỜI THAM GIA DOANH NGHIỆP"
        title="Không thể xác nhận quyền tham gia"
        description="Tài khoản hoặc công ty hiện không đủ điều kiện chấp nhận lời mời."
      >
        <div className={styles.statusCard}>
          <div className={`${styles.iconWrapper} ${styles.errorIcon}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="18" y1="8" x2="23" y2="13" />
              <line x1="23" y1="8" x2="18" y2="13" />
            </svg>
          </div>

          <h2 className={styles.statusTitle}>Không thể chấp nhận bằng tài khoản hiện tại</h2>
          <p className={styles.statusDescription}>
            Tài khoản hiện tại: <strong>{user?.email}</strong>. Email có thể không khớp với người được mời,
            tài khoản chưa hoạt động hoặc công ty đã tạm ngừng hoạt động.
            Hãy thử tài khoản nhận lời mời hoặc liên hệ quản trị viên công ty.
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSwitchAccount}
            >
              Đăng xuất & Đăng nhập bằng tài khoản khác
            </button>
            <Link to="/" className={styles.secondaryButton}>
              Về trang chủ
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (errorCode === "EXPIRED") {
    return (
      <AuthShell
        eyebrow="LỜI MỜI THAM GIA DOANH NGHIỆP"
        title="Lời mời đã hết hạn"
        description="Thời hạn chấp nhận lời mời (7 ngày) đã kết thúc."
      >
        <div className={styles.statusCard}>
          <div className={`${styles.iconWrapper} ${styles.warningIcon}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <h2 className={styles.statusTitle}>Lời mời đã quá hạn 7 ngày</h2>
          <p className={styles.statusDescription}>
            Mã bảo mật lời mời này đã hết hiệu lực. Bạn có thể liên hệ với người quản trị hoặc người
            đã mời bạn tại công ty để yêu cầu gửi lại lời mời mới.
          </p>

          <div className={styles.actions}>
            <Link to="/" className={styles.primaryButton}>
              Về trang chủ
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (errorCode === "ALREADY_MEMBER") {
    return (
      <AuthShell
        eyebrow="LỜI MỜI THAM GIA DOANH NGHIỆP"
        title="Đã là thành viên"
        description="Tài khoản của bạn đã là thành viên của công ty này."
      >
        <div className={styles.statusCard}>
          <div className={`${styles.iconWrapper} ${styles.infoIcon}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>

          <h2 className={styles.statusTitle}>Bạn đã thuộc tổ chức này</h2>
          <p className={styles.statusDescription}>
            Hồ sơ thành viên của bạn tại công ty đã tồn tại. Bạn không cần phải chấp nhận lại lời mời.
          </p>

          <div className={styles.actions}>
            <Link to="/companies" className={styles.primaryButton}>
              Xem danh sách công ty
            </Link>
            <Link to="/" className={styles.secondaryButton}>
              Về trang chủ
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (errorCode === "NOT_FOUND_OR_REVOKED") {
    return (
      <AuthShell
        eyebrow="LỜI MỜI THAM GIA DOANH NGHIỆP"
        title="Lời mời không khả dụng"
        description="Không tìm thấy lời mời hợp lệ trên hệ thống FINDWORK."
      >
        <div className={styles.statusCard}>
          <div className={`${styles.iconWrapper} ${styles.errorIcon}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>

          <h2 className={styles.statusTitle}>Lời mời đã bị thu hồi hoặc đã sử dụng</h2>
          <p className={styles.statusDescription}>
            Lời mời này có thể đã được người quản trị thu hồi, đã được chấp nhận trước đó, hoặc
            thông tin liên kết không chính xác.
          </p>

          <div className={styles.actions}>
            <Link to="/" className={styles.primaryButton}>
              Về trang chủ
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  // Generic / Network error fallback
  return (
    <AuthShell
      eyebrow="LỜI MỜI THAM GIA DOANH NGHIỆP"
      title="Không thể chấp nhận lời mời"
      description="Đã xảy ra sự cố trong quá trình xử lý yêu cầu của bạn."
    >
      <div className={styles.statusCard}>
        <div className={`${styles.iconWrapper} ${styles.errorIcon}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 className={styles.statusTitle}>Xử lý thất bại</h2>
        <p className={styles.statusDescription}>
          {invitationError?.message || "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau giây lát."}
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setPhase("CONFIRM")}
          >
            Thử lại
          </button>
          <Link to="/" className={styles.secondaryButton}>
            Về trang chủ
          </Link>
        </div>
      </div>
    </AuthShell>
  );
};

export default CompanyInvitationAcceptPage;
