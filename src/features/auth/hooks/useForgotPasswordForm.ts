import { useState, type FormEvent } from "react";
import { passwordResetApi } from "@/services/api/passwordResetApi";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const useForgotPasswordForm = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    setError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Vui lòng nhập email.");
      return;
    }

    if (!EMAIL_REGEX.test(trimmed)) {
      setError("Địa chỉ email không đúng định dạng.");
      return;
    }

    setIsLoading(true);
    try {
      await passwordResetApi.request(trimmed);
      setIsSubmitted(true);
    } catch (err: any) {
      if (err?.status === 503 || err?.code === "AUTH_PASSWORD_RESET_DELIVERY_UNAVAILABLE") {
        setError(
          "Dịch vụ gửi email đặt lại mật khẩu hiện chưa được cấu hình nhà cung cấp dịch vụ trên máy chủ (HTTP 503). Vui lòng liên hệ quản trị viên để được hỗ trợ."
        );
      } else if (err?.status === 429) {
        setError("Bạn đã yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau 10 phút.");
      } else {
        setError(err?.message || "Không thể gửi yêu cầu đặt lại mật khẩu lúc này.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetSubmission = () => {
    setIsSubmitted(false);
    setError("");
  };

  return {
    email,
    isSubmitted,
    isLoading,
    error,

    setEmail,
    resetSubmission,
    handleSubmit,
  };
};
