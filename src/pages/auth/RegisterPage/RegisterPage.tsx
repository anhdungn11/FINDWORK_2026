import { Link } from "react-router-dom";

import AuthCheckbox from "@/features/auth/components/AuthCheckbox/AuthCheckbox";
import AuthDivider from "@/features/auth/components/AuthDivider/AuthDivider";
import AuthErrorMessage from "@/features/auth/components/AuthErrorMessage/AuthErrorMessage";
import AuthField from "@/features/auth/components/AuthField/AuthField";
import AuthFooterText from "@/features/auth/components/AuthFooterText/AuthFooterText";
import AuthForm from "@/features/auth/components/AuthForm/AuthForm";
import AuthPasswordField from "@/features/auth/components/AuthPasswordField/AuthPasswordField";
import AuthPasswordRules from "@/features/auth/components/AuthPasswordRules/AuthPasswordRules";
import AuthShell from "@/features/auth/components/AuthShell/AuthShell";
import AuthSocialButtons from "@/features/auth/components/AuthSocialButtons/AuthSocialButtons";
import AuthSubmitButton from "@/features/auth/components/AuthSubmitButton/AuthSubmitButton";

import { useRegisterForm } from "@/features/auth/hooks/useRegisterForm";

import styles from "./RegisterPageLinks.module.css";

const RegisterPage = () => {
  const {
    fullName,
    email,
    password,
    confirmPassword,
    agreeTerms,
    error,
    passwordRules,
    setFullName,
    setEmail,
    setPassword,
    setConfirmPassword,
    setAgreeTerms,
    handleSubmit,
  } = useRegisterForm();

  return (
    <AuthShell
      eyebrow="TÀI KHOẢN ỨNG VIÊN"
      title="Tạo tài khoản FINDWORK"
      description="Bắt đầu xây dựng hồ sơ nghề nghiệp và khám phá những cơ hội phù hợp với bạn."
      footer={
        <AuthFooterText>
          Đã có tài khoản?{" "}
          <Link to="/login">Đăng nhập</Link>
        </AuthFooterText>
      }
    >
      <AuthSocialButtons />

      <AuthDivider>hoặc đăng ký bằng email</AuthDivider>

      <AuthForm onSubmit={handleSubmit}>
        <AuthField
          id="fullName"
          label="Họ và tên"
          value={fullName}
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          required
          onChange={setFullName}
        />

        <AuthField
          id="email"
          type="email"
          label="Email"
          value={email}
          placeholder="you@gmail.com"
          autoComplete="email"
          required
          onChange={setEmail}
        />

        <AuthPasswordField
          id="password"
          label="Mật khẩu"
          value={password}
          placeholder="Tạo mật khẩu"
          autoComplete="new-password"
          required
          onChange={setPassword}
        >
          <AuthPasswordRules rules={passwordRules} />
        </AuthPasswordField>

        <AuthPasswordField
          id="confirmPassword"
          label="Xác nhận mật khẩu"
          value={confirmPassword}
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
          required
          onChange={setConfirmPassword}
        />

        <AuthCheckbox
          checked={agreeTerms}
          onChange={setAgreeTerms}
        >
          Tôi đồng ý với{" "}
          <a href="/terms" className={styles.termsLink}>
            Điều khoản sử dụng
          </a>{" "}
          và{" "}
          <a href="/privacy" className={styles.termsLink}>
            Chính sách bảo mật
          </a>{" "}
          của FINDWORK.
        </AuthCheckbox>

        <AuthErrorMessage message={error} />

        <AuthSubmitButton>Tạo tài khoản</AuthSubmitButton>
      </AuthForm>
    </AuthShell>
  );
};

export default RegisterPage;
