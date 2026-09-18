import styles from "./AuthField.module.css";

interface AuthFieldProps {
  id: string;
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  onChange: (value: string) => void;
}

const AuthField = ({ id, label, value, type = "text", placeholder, autoComplete, required = false, onChange }: AuthFieldProps) => {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
};

export default AuthField;
