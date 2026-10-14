import { Link } from "react-router-dom";

import Button from "@/components/common/Button";
import type { AuthUser } from "@/store/authStore";

import type {
  HeaderLanguage,
} from "../types/header.types";

import EmployerDropdown from "./EmployerDropdown";
import LanguageDropdown from "./LanguageDropdown";
import AccountDropdown from "./AccountDropdown";
import type { HeaderAuthView } from "../hooks/headerAuth";

import styles from "../styles/HeaderActions.module.css";

interface DesktopActionsProps {
  language: HeaderLanguage;
  isLanguageOpen: boolean;
  isEmployerOpen: boolean;
  isAccountOpen: boolean;
  authView: HeaderAuthView;
  user: AuthUser | null;
  onLanguageToggle: () => void;
  onEmployerToggle: () => void;
  onLanguageChange:
    (value: HeaderLanguage) => void;
  onClose: () => void;
  onAccountToggle: () => void;
  onAccountClose: () => void;
  onLogout: () => void;
}

const DesktopActions = ({
  language,
  isLanguageOpen,
  isEmployerOpen,
  isAccountOpen,
  authView,
  user,
  onLanguageToggle,
  onEmployerToggle,
  onLanguageChange,
  onClose,
  onAccountToggle,
  onAccountClose,
  onLogout,
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

      <span className={styles.actionDivider} />

      {authView === "authenticated" && user ? (
        <AccountDropdown
          user={user}
          variant="desktop"
          isOpen={isAccountOpen}
          onToggle={onAccountToggle}
          onClose={onAccountClose}
          onNavigate={onClose}
          onLogout={onLogout}
        />
      ) : authView === "anonymous" ? (
        <>
          <Link to="/login" className={styles.loginLink} onClick={onClose}>
            Đăng nhập
          </Link>
          <Link to="/register" className={styles.registerLink} onClick={onClose}>
            <Button size="small">Đăng ký</Button>
          </Link>
        </>
      ) : (
        <span className={styles.sessionStatus} role="status">
          {authView === "loggingOut" ? "Đang đăng xuất..." : "Đang kiểm tra phiên..."}
        </span>
      )}
    </div>
  );
};

export default DesktopActions;
