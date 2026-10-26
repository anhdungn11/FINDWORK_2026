import { useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { extractApiErrorMessage } from "../../../services/http/apiClient";
import { registerAccount } from "../../../services/api/registrationApi";
import { useAuthStore } from "../../../store/authStore";
import { getPasswordRules, isPasswordRuleSetValid } from "../utils/password-validation.utils";
import type { RegistrationIntent } from "../types/accountType";

export interface UseRegisterFormOptions {
  defaultIntent?: RegistrationIntent;
}

export const useRegisterForm = (options?: UseRegisterFormOptions) => {
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const initialIntent: RegistrationIntent = useMemo(() => {
    const rawParam = (
      searchParams.get("intent") ||
      searchParams.get("role") ||
      searchParams.get("type") ||
      ""
    ).trim().toLowerCase();

    if (rawParam === "employer") return "EMPLOYER";
    if (rawParam === "candidate") return "CANDIDATE";
    return options?.defaultIntent ?? "CANDIDATE";
  }, [searchParams, options?.defaultIntent]);

  const [intent, setIntent] = useState<RegistrationIntent>(initialIntent);
  const [registeredIntent, setRegisteredIntent] = useState<RegistrationIntent | null>(null);
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
      const session = await registerAccount({
        email: normalizedEmail,
        password,
        accountType: intent,
      });
      setAuth(session.user, session.accessToken);
      setRegisteredIntent(intent);

      try {
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem("findwork.registrationIntent", intent);
        }
      } catch {
        // Storage may be disabled
      }

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
  };
};
