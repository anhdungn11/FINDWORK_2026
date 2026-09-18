import { useState, type FormEvent } from "react";
import type { LoginFormValues } from "../types/auth-form.types";

export const useLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }

    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    const values: LoginFormValues = { email, password, rememberMe };

    // Frontend mock.
    // Sau này thay bằng POST /auth/login.
    console.log(values);
  };

  return {
    email, password, rememberMe, error,
    setEmail, setPassword, setRememberMe,
    handleSubmit,
  };
};
