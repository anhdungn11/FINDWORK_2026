import { useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";

export const useLoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Vui lòng nhập email.");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await login({ email: normalizedEmail, password });
      const requestedPath = (location.state as { from?: unknown } | null)?.from;
      const destination = typeof requestedPath === "string" &&
        /^\/candidate(?:\/|\?|$)/.test(requestedPath) ? requestedPath : "/candidate";
      navigate(destination, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return { email, password, error, isSubmitting, setEmail, setPassword, handleSubmit };
};
