import type { ChangeEvent } from "react";

import styles from "../styles/PrivacyToggle.module.css";

interface PrivacyToggleProps {
  checked: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  badge?: string;
}

const PrivacyToggle = ({
  checked,
  title,
  description,
  onChange,
  disabled = false,
  badge,
}: PrivacyToggleProps) => {
  return (
    <label
      className={`${styles.option} ${disabled ? styles.disabled : ""}`}
    >
      <span className={styles.copy}>
        <span className={styles.titleRow}>
          <strong>{title}</strong>
          {badge && <span className={styles.badge}>{badge}</span>}
        </span>

        <span className={styles.description}>{description}</span>
      </span>

      <span className={styles.switchWrap}>
        <input
          className={styles.input}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange(event.target.checked)
          }
        />

        <span className={styles.switch} aria-hidden="true">
          <span className={styles.thumb} />
        </span>
      </span>
    </label>
  );
};

export default PrivacyToggle;
