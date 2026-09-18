import type {
  PasswordRuleState,
} from "../../utils/password-validation.utils";

import styles from "./AuthPasswordRules.module.css";

interface AuthPasswordRulesProps {
  rules: PasswordRuleState;
}

interface PasswordRuleProps {
  valid: boolean;
  label: string;
}

const PasswordRule = ({
  valid,
  label,
}: PasswordRuleProps) => {
  return (
    <span
      className={
        valid
          ? styles.ruleValid
          : styles.rule
      }
    >
      <span className={styles.ruleIcon}>
        {valid ? "✓" : "○"}
      </span>

      {label}
    </span>
  );
};

const AuthPasswordRules = ({
  rules,
}: AuthPasswordRulesProps) => {
  return (
    <div className={styles.passwordRules}>
      <PasswordRule valid={rules.length} label="8 ký tự trở lên" />
      <PasswordRule valid={rules.uppercase} label="Có chữ hoa" />
      <PasswordRule valid={rules.number} label="Có chữ số" />
      <PasswordRule valid={rules.special} label="Có ký tự đặc biệt" />
    </div>
  );
};

export default AuthPasswordRules;
