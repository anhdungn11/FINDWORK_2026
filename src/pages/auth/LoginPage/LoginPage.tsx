import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import AuthErrorMessage from "@/features/auth/components/AuthErrorMessage/AuthErrorMessage";
import AuthField from "@/features/auth/components/AuthField/AuthField";
import AuthFooterText from "@/features/auth/components/AuthFooterText/AuthFooterText";
import AuthForm from "@/features/auth/components/AuthForm/AuthForm";
import AuthPasswordField from "@/features/auth/components/AuthPasswordField/AuthPasswordField";
import AuthShell from "@/features/auth/components/AuthShell/AuthShell";
import AuthSubmitButton from "@/features/auth/components/AuthSubmitButton/AuthSubmitButton";
import { useLoginForm } from "@/features/auth/hooks/useLoginForm";

const LoginPage = () => {
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
      eyebrow="TÀI KHOẢN ỨNG VIÊN"
      title="Đăng nhập FINDWORK"
      description="Tiếp tục quản lý hồ sơ, CV và những cơ hội nghề nghiệp của bạn."
      footer={<AuthFooterText>Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></AuthFooterText>}
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
        <AuthErrorMessage message={error} />
        <AuthSubmitButton disabled={isSubmitting}>
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </AuthSubmitButton>
      </AuthForm>
    </AuthShell>
  );
};
export default LoginPage;
