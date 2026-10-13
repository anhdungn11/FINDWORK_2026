import { useMemo, useRef, useState, type FormEvent } from "react";
import { apiClient, extractApiErrorMessage } from "../../../services/http/apiClient";
import { API_ENDPOINTS } from "../../../services/http/endpoints";
import { useAuthStore } from "../../../store/authStore";
import { parseAuthResponse } from "../../../services/http/authResponse";
import { getPasswordRules, isPasswordRuleSetValid } from "../utils/password-validation.utils";

export const useRegisterForm = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const submittingRef = useRef(false);

  const passwordRules = useMemo(() => getPasswordRules(password), [password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || isRegistered) return;
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Vui lòng nhập email.");
      return;
    }
    if (!isPasswordRuleSetValid(passwordRules) || password.length > 128) {
      setError("Mật khẩu phải có 8–128 ký tự, chữ hoa, chữ số và ký tự đặc biệt.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (!agreeTerms) {
      setError("Bạn cần đồng ý với điều khoản sử dụng.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      // RegisterDto accepts only email and password. Name belongs to a later profile step.
      const response = await apiClient.post<unknown>(API_ENDPOINTS.AUTH.REGISTER, {
        email: normalizedEmail,
        password,
      });
      const session = parseAuthResponse(response.data);
      setAuth(session.user, session.accessToken);
      setIsRegistered(true);
      setPassword("");
      setConfirmPassword("");
    } catch (caught) {
      setError(extractApiErrorMessage(caught, "Không thể tạo tài khoản. Vui lòng thử lại."));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    email, password, confirmPassword, agreeTerms, error, passwordRules,
    isSubmitting, isRegistered,
    setEmail, setPassword, setConfirmPassword, setAgreeTerms, handleSubmit,
  };
};
