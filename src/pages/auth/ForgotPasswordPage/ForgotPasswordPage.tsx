import {
  Link,
} from "react-router-dom";

import AuthErrorMessage from "@/features/auth/components/AuthErrorMessage/AuthErrorMessage";
import AuthField from "@/features/auth/components/AuthField/AuthField";
import AuthFooterText from "@/features/auth/components/AuthFooterText/AuthFooterText";
import AuthForm from "@/features/auth/components/AuthForm/AuthForm";
import AuthShell from "@/features/auth/components/AuthShell/AuthShell";
import AuthSubmitButton from "@/features/auth/components/AuthSubmitButton/AuthSubmitButton";

import {
  useForgotPasswordForm,
} from "@/features/auth/hooks/useForgotPasswordForm";

import ForgotPasswordSuccessState from "./components/ForgotPasswordSuccessState";

const ForgotPasswordPage = () => {
  const {
    email,
    isSubmitted,
    error,

    setEmail,
    resetSubmission,

    handleSubmit,
  } = useForgotPasswordForm();

  if (isSubmitted) {
    return (
      <AuthShell
        eyebrow="KHÔI PHỤC TÀI KHOẢN"
        title="Kiểm tra email của bạn"
        description="Nếu email tồn tại trong hệ thống, FINDWORK sẽ gửi hướng dẫn đặt lại mật khẩu."
        footer={
          <AuthFooterText>
            Chưa nhận được email?{" "}
            <button
              type="button"
              onClick={resetSubmission}
            >
              Gửi lại
            </button>
          </AuthFooterText>
        }
      >
        <ForgotPasswordSuccessState />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="KHÔI PHỤC TÀI KHOẢN"
      title="Quên mật khẩu?"
      description="Nhập email đã đăng ký. FINDWORK sẽ gửi hướng dẫn đặt lại mật khẩu nếu tài khoản tồn tại."
      footer={
        <AuthFooterText>
          Nhớ mật khẩu rồi?{" "}
          <Link to="/login">
            Đăng nhập
          </Link>
        </AuthFooterText>
      }
    >
      <AuthForm onSubmit={handleSubmit}>
        <AuthField
          id="email"
          type="email"
          label="Email"
          value={email}
          placeholder="you@example.com"
          autoComplete="email"
          required
          onChange={setEmail}
        />

        <AuthErrorMessage
          message={error}
        />

        <AuthSubmitButton>
          Gửi hướng dẫn đặt lại mật khẩu
        </AuthSubmitButton>
      </AuthForm>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
