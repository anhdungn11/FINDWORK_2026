import { Link } from "react-router-dom";

import Button from "@/components/common/Button";

import type {
  HeaderLanguage,
} from "../types/header.types";

import EmployerDropdown from "./EmployerDropdown";
import LanguageDropdown from "./LanguageDropdown";

import styles from "../styles/HeaderActions.module.css";

interface DesktopActionsProps {
  language: HeaderLanguage;
  isLanguageOpen: boolean;
  isEmployerOpen: boolean;
  onLanguageToggle: () => void;
  onEmployerToggle: () => void;
  onLanguageChange:
    (value: HeaderLanguage) => void;
  onClose: () => void;
}

const DesktopActions = ({
  language,
  isLanguageOpen,
  isEmployerOpen,
  onLanguageToggle,
  onEmployerToggle,
  onLanguageChange,
  onClose,
}: DesktopActionsProps) => {
  return (
    <div className={styles.actions}>
      <LanguageDropdown
        language={language}
        isOpen={isLanguageOpen}
        onToggle={onLanguageToggle}
        onChange={onLanguageChange}
      />

      <EmployerDropdown
        isOpen={isEmployerOpen}
        onToggle={onEmployerToggle}
        onClose={onClose}
      />

      <span
        className={styles.actionDivider}
      />

      <Link
        to="/login"
        className={styles.loginLink}
        onClick={onClose}
      >
        Đăng nhập
      </Link>

      <Link
        to="/register"
        className={styles.registerLink}
        onClick={onClose}
      >
        <Button size="small">
          Đăng ký
        </Button>
      </Link>
    </div>
  );
};

export default DesktopActions;
