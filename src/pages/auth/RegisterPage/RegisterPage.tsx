import { Link } from "react-router-dom";
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
import styles from "./RegisterPageLinks.module.css";

const RegisterPage = () => {
  const {
    email, password, confirmPassword, agreeTerms, error, passwordRules,
    isSubmitting, isRegistered,
    setEmail, setPassword, setConfirmPassword, setAgreeTerms, handleSubmit,
  } = useRegisterForm();

  if (isRegistered) {
    return (
      <AuthShell
        eyebrow="TÀI KHOẢN ỨNG VIÊN"
        title="Đã tạo tài khoản FINDWORK"
        description="Tài khoản đã được tạo. Bạn có thể tiếp tục hoàn thiện hồ sơ. Một số tính năng có thể yêu cầu xác minh email."
      >
        <p role="status">Đăng ký thành công. Họ tên sẽ được bổ sung trong bước hoàn thiện hồ sơ.</p>
        <p><Link to="/candidate/onboarding">Tiếp tục hoàn thiện hồ sơ</Link></p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="TÀI KHOẢN ỨNG VIÊN"
      title="Tạo tài khoản FINDWORK"
      description="Đăng ký bằng email và mật khẩu. Bạn có thể bổ sung họ tên khi hoàn thiện hồ sơ."
      footer={<AuthFooterText>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></AuthFooterText>}
    >
      <AuthForm onSubmit={handleSubmit}>
        <AuthField
          id="email" type="email" label="Email" value={email}
          placeholder="you@gmail.com" autoComplete="email" required onChange={setEmail}
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
          {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </AuthSubmitButton>
      </AuthForm>
    </AuthShell>
  );
};
export default RegisterPage;
