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
import { RegistrationIntentSelector } from "@/features/auth/components/RegistrationIntentSelector/RegistrationIntentSelector";
import { useRegisterForm } from "@/features/auth/hooks/useRegisterForm";
import styles from "../auth/RegisterPage/RegisterPageLinks.module.css";

const EmployerRegisterPage = () => {
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const {
    email,
    password,
    confirmPassword,
    agreeTerms,
    error,
    passwordRules,
    isSubmitting,
    isRegistered,
    intent,
    setEmail,
    setPassword,
    setConfirmPassword,
    setAgreeTerms,
    setIntent,
    handleSubmit,
  } = useRegisterForm({ defaultIntent: "EMPLOYER" });

  // If user is already authenticated, forward them directly to employer onboarding
  if (authStatus === "authenticated" && user) {
    return <Navigate to="/employer/onboarding" replace />;
  }

  if (isRegistered) {
    return (
      <AuthShell
        eyebrow="DÀNH CHO NHÀ TUYỂN DỤNG"
        title="Đã tạo tài khoản tuyển dụng"
        description="Tài khoản FINDWORK đã sẵn sàng. Hãy tiếp tục bước khởi tạo doanh nghiệp để bắt đầu đăng tin tuyển dụng."
      >
        <div className={styles.successCard} role="status">
          <span className={styles.successIcon} aria-hidden="true">✓</span>
          <div>
            <h3 className={styles.successTitle}>Đăng ký thành công</h3>
            <p className={styles.successText}>
              Bước tiếp theo: Thiết lập hồ sơ doanh nghiệp của bạn.
            </p>
          </div>
        </div>

        <div className={styles.stepsGuide}>
          <h4 className={styles.stepsTitle}>Các bước tiếp theo</h4>
          <ol className={styles.stepsList}>
            <li><strong>Bước 1:</strong> Thiết lập thông tin doanh nghiệp (tên công ty, quy mô, địa chỉ).</li>
            <li><strong>Bước 2:</strong> Tạo và đăng tin tuyển dụng đầu tiên.</li>
            <li><strong>Bước 3:</strong> Tiếp cận và quản lý hồ sơ ứng viên trực tiếp trên hệ thống.</li>
          </ol>
        </div>

        <div className={styles.actionButtons}>
          <Link
            to="/employer/onboarding"
            className={styles.primaryBtn}
            data-testid="employer-onboarding-cta"
          >
            Tiếp tục khởi tạo doanh nghiệp
          </Link>
          <Link
            to="/jobs"
            className={styles.secondaryBtn}
            data-testid="employer-preview-jobs-cta"
          >
            Xem trước việc làm trên sàn
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="DÀNH CHO NHÀ TUYỂN DỤNG"
      title="Đăng ký tài khoản doanh nghiệp"
      description="Tạo một tài khoản FINDWORK để khởi tạo doanh nghiệp, quản lý tin đăng tuyển dụng và tìm kiếm ứng viên."
      footer={
        <AuthFooterText>
          Đã có tài khoản? <Link to="/employer/login">Đăng nhập</Link>
        </AuthFooterText>
      }
    >
      <AuthForm onSubmit={handleSubmit}>
        <RegistrationIntentSelector
          value={intent}
          onChange={setIntent}
          disabled={isSubmitting}
        />

        <AuthField
          id="email"
          type="email"
          label="Email doanh nghiệp hoặc cá nhân"
          value={email}
          placeholder="hr@congty.com"
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
        <AuthCheckbox checked={agreeTerms} onChange={setAgreeTerms}>
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
        <AuthSubmitButton disabled={isSubmitting}>
          {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản tuyển dụng"}
        </AuthSubmitButton>
      </AuthForm>
    </AuthShell>
  );
};

export default EmployerRegisterPage;
