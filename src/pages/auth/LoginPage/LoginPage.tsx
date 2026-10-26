import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import AuthErrorMessage from "@/features/auth/components/AuthErrorMessage/AuthErrorMessage";
import AuthField from "@/features/auth/components/AuthField/AuthField";
import AuthFooterText from "@/features/auth/components/AuthFooterText/AuthFooterText";
import AuthForm from "@/features/auth/components/AuthForm/AuthForm";
import AuthPasswordField from "@/features/auth/components/AuthPasswordField/AuthPasswordField";
import AuthShell from "@/features/auth/components/AuthShell/AuthShell";
import AuthSubmitButton from "@/features/auth/components/AuthSubmitButton/AuthSubmitButton";
import { useLoginForm } from "@/features/auth/hooks/useLoginForm";
import styles from "./LoginPageLinks.module.css";

const LoginPage = () => {
  const location = useLocation();
  const isEmployer = location.pathname.startsWith("/employer");
  const { email, password, error, isSubmitting, setEmail, setPassword, handleSubmit } = useLoginForm();
  const logoutError = useAuthStore((state) => state.logoutError);
  const logout = useAuthStore((state) => state.logout);
  const [isRetryingLogout, setIsRetryingLogout] = useState(false);
  const retryLogout = async () => {
    setIsRetryingLogout(true);
    try { await logout(); }
    finally { setIsRetryingLogout(false); }
  };
  return (
    <AuthShell
      eyebrow={isEmployer ? "DÀNH CHO NHÀ TUYỂN DỤNG" : "TÀI KHOẢN FINDWORK"}
      title={isEmployer ? "Đăng nhập nhà tuyển dụng" : "Đăng nhập FINDWORK"}
      description={
        isEmployer
          ? "Truy cập không gian làm việc doanh nghiệp để quản lý tin tuyển dụng và tìm kiếm ứng viên."
          : "Một tài khoản duy nhất để quản lý hồ sơ ứng viên và không gian tuyển dụng doanh nghiệp."
      }
      footer={
        <AuthFooterText>
          {isEmployer ? (
            <>
              Chưa có tài khoản tuyển dụng? <Link to="/employer/register">Đăng ký doanh nghiệp</Link>
            </>
          ) : (
            <>
              Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
            </>
          )}
        </AuthFooterText>
      }
    >
      {logoutError && <div role="alert">
        <p>{logoutError}</p>
        <button type="button" onClick={retryLogout} disabled={isRetryingLogout}>
          {isRetryingLogout ? "Đang thử lại..." : "Thử đăng xuất lại"}
        </button>
      </div>}
      <AuthForm onSubmit={handleSubmit}>
        <AuthField
          id="email" type="email" label="Email" value={email}
          placeholder="you@gmail.com" autoComplete="email" required onChange={setEmail}
        />
        <AuthPasswordField
          id="password" label="Mật khẩu" value={password}
          placeholder="Nhập mật khẩu" autoComplete="current-password" required onChange={setPassword}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-6px", marginBottom: "4px" }}>
          <Link to="/forgot-password" className={styles.forgotLink}>
            Quên mật khẩu?
          </Link>
        </div>
        <AuthErrorMessage message={error} />
        <AuthSubmitButton disabled={isSubmitting}>
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </AuthSubmitButton>
      </AuthForm>
    </AuthShell>
  );
};
export default LoginPage;
