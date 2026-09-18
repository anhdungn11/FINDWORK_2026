import { Link } from "react-router-dom";

import AuthCheckbox from "@/features/auth/components/AuthCheckbox/AuthCheckbox";
import AuthDivider from "@/features/auth/components/AuthDivider/AuthDivider";
import AuthErrorMessage from "@/features/auth/components/AuthErrorMessage/AuthErrorMessage";
import AuthField from "@/features/auth/components/AuthField/AuthField";
import AuthFooterText from "@/features/auth/components/AuthFooterText/AuthFooterText";
import AuthForm from "@/features/auth/components/AuthForm/AuthForm";
import AuthPasswordField from "@/features/auth/components/AuthPasswordField/AuthPasswordField";
import AuthShell from "@/features/auth/components/AuthShell/AuthShell";
import AuthSocialButtons from "@/features/auth/components/AuthSocialButtons/AuthSocialButtons";
import AuthSubmitButton from "@/features/auth/components/AuthSubmitButton/AuthSubmitButton";
import { useLoginForm } from "@/features/auth/hooks/useLoginForm";

import styles from "./LoginPageLinks.module.css";

const LoginPage = () => {
  const {
    email, password, rememberMe, error,
    setEmail, setPassword, setRememberMe,
    handleSubmit,
  } = useLoginForm();

  return (
    <AuthShell
      eyebrow="TÀI KHOẢN ỨNG VIÊN"
      title="Đăng nhập FINDWORK"
      description="Tiếp tục quản lý hồ sơ, CV và những cơ hội nghề nghiệp của bạn."
      footer={
        <AuthFooterText>
          Chưa có tài khoản?{" "}
          <Link to="/register">Đăng ký ngay</Link>
        </AuthFooterText>
      }
    >
      <AuthSocialButtons />

      <AuthDivider>hoặc đăng nhập bằng email</AuthDivider>

      <AuthForm onSubmit={handleSubmit}>
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
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          required
          onChange={setPassword}
          labelAction={
            <Link to="/forgot-password" className={styles.forgotLink}>
              Quên mật khẩu?
            </Link>
          }
        />

        <AuthCheckbox checked={rememberMe} onChange={setRememberMe}>
          Ghi nhớ thông tin đăng nhập trên thiết bị này
        </AuthCheckbox>

        <AuthErrorMessage message={error} />

        <AuthSubmitButton>Đăng nhập</AuthSubmitButton>
      </AuthForm>
    </AuthShell>
  );
};

export default LoginPage;
