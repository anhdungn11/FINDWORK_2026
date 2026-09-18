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

    setIsSubmitted(true);

    // Frontend mock.
    // Sau này thay bằng POST /auth/forgot-password.
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
