import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import AuthCheckbox from "@/features/auth/components/AuthCheckbox/AuthCheckbox";
import AuthErrorMessage from "@/features/auth/components/AuthErrorMessage/AuthErrorMessage";
import AuthField from "@/features/auth/components/AuthField/AuthField";
import AuthFooterText from "@/features/auth/components/AuthFooterText/AuthFooterText";
import AuthForm from "@/features/auth/components/AuthForm/AuthForm";
import AuthPasswordField from "@/features/auth/components/AuthPasswordField/AuthPasswordField";
import AuthPasswordRules from "@/features/auth/components/AuthPasswordRules/AuthPasswordRules";
import AuthShell from "@/features/auth/components/AuthShell/AuthShell";
import AuthSubmitButton from "@/features/auth/components/AuthSubmitButton/AuthSubmitButton";
import { useRegisterForm } from "@/features/auth/hooks/useRegisterForm";
import styles from "../auth/RegisterPage/RegisterPageLinks.module.css";

const EmployerRegisterPage = () => {
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const {
    email, password, confirmPassword, agreeTerms, error, passwordRules,
    isSubmitting, isRegistered,
    setEmail, setPassword, setConfirmPassword, setAgreeTerms, handleSubmit,
  } = useRegisterForm();

  // If user is already authenticated, forward them directly to employer onboarding
  if (authStatus === "authenticated" && user) {
    return <Navigate to="/employer/onboarding" replace />;
  }

  if (isRegistered) {
    return (
      <AuthShell
        eyebrow="DÀNH CHO NHÀ TUYỂN DỤNG"
        title="Đã tạo tài khoản tuyển dụng"
        description="Tài khoản đã sẵn sàng. Hãy tiếp tục bước khởi tạo doanh nghiệp để bắt đầu đăng tin tuyển dụng."
      >
        <p role="status">Đăng ký thành công. Bước tiếp theo: Thiết lập hồ sơ doanh nghiệp của bạn.</p>
        <p><Link to="/employer/onboarding">Tiếp tục khởi tạo doanh nghiệp</Link></p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="DÀNH CHO NHÀ TUYỂN DỤNG"
      title="Đăng ký tài khoản doanh nghiệp"
      description="Tạo tài khoản để khởi tạo doanh nghiệp, quản lý tin đăng và tiếp cận các ứng viên tài năng trên FINDWORK."
      footer={<AuthFooterText>Đã có tài khoản tuyển dụng? <Link to="/employer/login">Đăng nhập</Link></AuthFooterText>}
    >
      <AuthForm onSubmit={handleSubmit}>
        <AuthField
          id="email" type="email" label="Email doanh nghiệp hoặc cá nhân" value={email}
          placeholder="hr@congty.com" autoComplete="email" required onChange={setEmail}
        />
        <AuthPasswordField
          id="password" label="Mật khẩu" value={password}
          placeholder="Tạo mật khẩu" autoComplete="new-password" required onChange={setPassword}
        >
          <AuthPasswordRules rules={passwordRules} />
        </AuthPasswordField>
        <AuthPasswordField
          id="confirmPassword" label="Xác nhận mật khẩu" value={confirmPassword}
          placeholder="Nhập lại mật khẩu" autoComplete="new-password" required onChange={setConfirmPassword}
        />
        <AuthCheckbox checked={agreeTerms} onChange={setAgreeTerms}>
          Tôi đồng ý với <a href="/terms" className={styles.termsLink}>Điều khoản sử dụng</a>
          {" "}và <a href="/privacy" className={styles.termsLink}>Chính sách bảo mật</a> của FINDWORK.
        </AuthCheckbox>
        <AuthErrorMessage message={error} />
        <AuthSubmitButton disabled={isSubmitting}>
          {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản tuyển dụng"}
        </AuthSubmitButton>
      </AuthForm>
    </AuthShell>
  );
};

export default EmployerRegisterPage;
