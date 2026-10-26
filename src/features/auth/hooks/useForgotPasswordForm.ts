import {
  useState,
  type FormEvent,
} from "react";

export const useForgotPasswordForm = () => {
  const [
    email,
    setEmail,
  ] = useState("");

  const [
    isSubmitted,
    setIsSubmitted,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError(
        "Vui lòng nhập email.",
      );
      return;
    }

    // Backend Auth Service does not provide self-service /auth/forgot-password yet.
    // Display honest failure and instruct user rather than fabricating delivery.
    setError(
      "Dịch vụ gửi email đặt lại mật khẩu hiện chưa được cấu hình máy chủ (HTTP 503 / Endpoint Unconfigured). Vui lòng liên hệ quản trị viên nền tảng để được hỗ trợ cấp lại quyền truy cập an toàn."
    );
  };

  const resetSubmission = () => {
    setIsSubmitted(false);
  };

  return {
    email,
    isSubmitted,
    error,

    setEmail,
    resetSubmission,

    handleSubmit,
  };
};
