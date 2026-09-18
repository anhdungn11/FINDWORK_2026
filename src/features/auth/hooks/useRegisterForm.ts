import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type {
  RegisterFormValues,
} from "../types/auth-form.types";

import {
  getPasswordRules,
  isPasswordRuleSetValid,
} from "../utils/password-validation.utils";

export const useRegisterForm = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");

  const passwordRules = useMemo(
    () => getPasswordRules(password),
    [password],
  );

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    if (!isPasswordRuleSetValid(passwordRules)) {
      setError("Mật khẩu chưa đáp ứng đầy đủ yêu cầu.");
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

    const values: RegisterFormValues = {
      fullName,
      email,
      password,
    };

    // Frontend mock.
    // Sau này thay bằng POST /auth/register.
    console.log(values);
  };

  return {
    fullName,
    email,
    password,
    confirmPassword,
    agreeTerms,
    error,
    passwordRules,
    setFullName,
    setEmail,
    setPassword,
    setConfirmPassword,
    setAgreeTerms,
    handleSubmit,
  };
};
