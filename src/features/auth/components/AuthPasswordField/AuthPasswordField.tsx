import { useState, type ReactNode } from "react";
import styles from "./AuthPasswordField.module.css";

interface AuthPasswordFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  labelAction?: ReactNode;
  children?: ReactNode;
  onChange: (value: string) => void;
}

const AuthPasswordField = ({ id, label, value, placeholder, autoComplete, required = false, labelAction, children, onChange }: AuthPasswordFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id}>{label}</label>
        {labelAction}
      </div>
      <div className={styles.passwordInput}>
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className={styles.showPassword}
          onClick={() => setShowPassword((current) => !current)}
        >
          {showPassword ? "Ẩn" : "Hiện"}
        </button>
      </div>
      {children}
    </div>
  );
};

export default AuthPasswordField;
