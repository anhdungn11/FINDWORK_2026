import type {
  HeaderLanguage,
} from "../types/header.types";

import styles from "../styles/HeaderDropdown.module.css";

interface LanguageDropdownProps {
  language: HeaderLanguage;
  isOpen: boolean;
  onToggle: () => void;
  onChange:
    (value: HeaderLanguage) => void;
}

const LanguageDropdown = ({
  language,
  isOpen,
  onToggle,
  onChange,
}: LanguageDropdownProps) => {
  return (
    <div className={styles.dropdown}>
      <button
        type="button"
        className={styles.languageButton}
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span
          className={styles.languageGlobe}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
            />

            <path d="M3 12h18" />

            <path d="M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21" />

            <path d="M12 3c-2.4 2.5-3.6 5.5-3.6 9s1.2 6.5 3.6 9" />
          </svg>
        </span>

        <span>{language}</span>

        <span
          className={`${styles.chevron} ${
            isOpen
              ? styles.chevronOpen
              : ""
          }`}
        >
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="m6 8 4 4 4-4" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div
          className={`${styles.dropdownMenu} ${styles.languageMenu}`}
        >
          <span
            className={styles.dropdownEyebrow}
          >
            Ngôn ngữ
          </span>

          <button
            type="button"
            className={
              language === "VI"
                ? styles.dropdownItemActive
                : styles.dropdownItem
            }
            onClick={() =>
              onChange("VI")
            }
          >
            <span>
              <strong>Tiếng Việt</strong>
              <small>Vietnamese</small>
            </span>

            {language === "VI" && (
              <span
                className={styles.check}
              >
                ✓
              </span>
            )}
          </button>

          <button
            type="button"
            className={
              language === "EN"
                ? styles.dropdownItemActive
                : styles.dropdownItem
            }
            onClick={() =>
              onChange("EN")
            }
          >
            <span>
              <strong>English</strong>
              <small>English</small>
            </span>

            {language === "EN" && (
              <span
                className={styles.check}
              >
                ✓
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default LanguageDropdown;
