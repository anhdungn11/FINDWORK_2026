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
import { RegistrationIntentSelector } from "@/features/auth/components/RegistrationIntentSelector/RegistrationIntentSelector";
import { useRegisterForm } from "@/features/auth/hooks/useRegisterForm";
import styles from "./RegisterPageLinks.module.css";

const RegisterPage = () => {
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
    registeredIntent,
    setEmail,
    setPassword,
    setConfirmPassword,
    setAgreeTerms,
    setIntent,
    handleSubmit,
  } = useRegisterForm();

  const activeIntent = isRegistered ? (registeredIntent ?? intent) : intent;

  if (isRegistered) {
    if (activeIntent === "EMPLOYER") {
      return (
        <AuthShell
          eyebrow="DÀNH CHO NHÀ TUYỂN DỤNG"
          title="Tài khoản tuyển dụng đã sẵn sàng!"
          description="Tài khoản FINDWORK đã được kích hoạt. Hãy thiết lập hồ sơ doanh nghiệp để bắt đầu đăng tin tuyển dụng và tìm kiếm ứng viên."
        >
          <div className={styles.successCard} role="status">
            <span className={styles.successIcon} aria-hidden="true">✓</span>
            <div>
              <h3 className={styles.successTitle}>Đăng ký thành công tài khoản tuyển dụng</h3>
              <p className={styles.successText}>
                Tài khoản tuyển dụng đã sẵn sàng. Bước tiếp theo: Thiết lập thông tin hồ sơ doanh nghiệp của bạn.
              </p>
            </div>
          </div>

          <div className={styles.stepsGuide}>
            <h4 className={styles.stepsTitle}>Các bước tiếp theo</h4>
            <ol className={styles.stepsList}>
              <li><strong>Bước 1:</strong> Thiết lập thông tin doanh nghiệp (tên công ty, quy mô, địa chỉ).</li>
              <li><strong>Bước 2:</strong> Tạo và phát hành tin đăng tuyển dụng.</li>
              <li><strong>Bước 3:</strong> Tiếp cận và quản lý hồ sơ ứng viên tập trung.</li>
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
        eyebrow="DÀNH CHO ỨNG VIÊN"
        title="Tài khoản tìm việc đã sẵn sàng!"
        description="Chào mừng bạn đến với FINDWORK. Hãy bắt đầu hoàn thiện hồ sơ để tiếp cận các cơ hội việc làm tốt nhất."
      >
        <div className={styles.successCard} role="status">
          <span className={styles.successIcon} aria-hidden="true">✓</span>
          <div>
            <h3 className={styles.successTitle}>Đăng ký thành công tài khoản ứng viên</h3>
            <p className={styles.successText}>
              Tài khoản đã sẵn sàng. Họ tên và thông tin chuyên môn sẽ được bổ sung trong bước tiếp theo.
            </p>
          </div>
        </div>

        <div className={styles.stepsGuide}>
          <h4 className={styles.stepsTitle}>Các bước tiếp theo</h4>
          <ol className={styles.stepsList}>
            <li><strong>Bước 1:</strong> Hoàn thiện thông tin nghề nghiệp và định hướng làm việc.</li>
            <li><strong>Bước 2:</strong> Tạo hoặc tải lên CV trực tuyến trong CV Center.</li>
            <li><strong>Bước 3:</strong> Ứng tuyển nhanh chóng vào các vị trí phù hợp.</li>
          </ol>
        </div>

        <div className={styles.actionButtons}>
          <Link
            to="/candidate/onboarding"
            className={styles.primaryBtn}
            data-testid="candidate-onboarding-cta"
          >
            Tiếp tục hoàn thiện hồ sơ
          </Link>
          <Link
            to="/candidate"
            className={styles.secondaryBtn}
            data-testid="candidate-dashboard-cta"
          >
            Đến không gian ứng viên
          </Link>
          <Link
            to="/jobs"
            className={styles.tertiaryBtn}
            data-testid="candidate-jobs-cta"
          >
            Khám phá việc làm ngay
          </Link>
        </div>
      </AuthShell>
    );
  }

  const isEmployer = intent === "EMPLOYER";

  return (
    <AuthShell
      eyebrow={isEmployer ? "DÀNH CHO NHÀ TUYỂN DỤNG" : "DÀNH CHO ỨNG VIÊN"}
      title={isEmployer ? "Tạo tài khoản tuyển dụng" : "Tạo tài khoản tìm việc"}
      description={
        isEmployer
          ? "Đăng ký tài khoản để thiết lập doanh nghiệp, đăng tin tuyển dụng và tìm kiếm ứng viên tài năng."
          : "Đăng ký tài khoản để khám phá việc làm phù hợp, tạo CV chuyên nghiệp và nộp hồ sơ trực tuyến."
      }
      footer={
        <AuthFooterText>
          Đã có tài khoản? <Link to={isEmployer ? "/employer/login" : "/login"}>Đăng nhập</Link>
          {" | "}
          Tuyển dụng? <Link to="/employer/register">Đăng ký doanh nghiệp</Link>
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
          label={isEmployer ? "Email doanh nghiệp hoặc cá nhân" : "Email"}
          value={email}
          placeholder={isEmployer ? "hr@congty.com" : "you@gmail.com"}
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
          {isSubmitting
            ? "Đang tạo tài khoản..."
            : isEmployer
            ? "Tạo tài khoản tuyển dụng"
            : "Tạo tài khoản tìm việc"}
        </AuthSubmitButton>
      </AuthForm>
    </AuthShell>
  );
};

export default RegisterPage;
