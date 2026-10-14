import { useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";

import type { AuthUser } from "@/store/authStore";

import { getAccountInitials, getAccountName } from "../hooks/headerAuth";
import styles from "../styles/AccountDropdown.module.css";

interface AccountDropdownProps {
  user: AuthUser;
  isOpen: boolean;
  variant: "desktop" | "mobile";
  onToggle: () => void;
  onClose: () => void;
  onNavigate: () => void;
  onLogout: () => void;
}

const AccountDropdown = ({
  user,
  isOpen,
  variant,
  onToggle,
  onClose,
  onNavigate,
  onLogout,
}: AccountDropdownProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div ref={rootRef} className={`${styles.account} ${variant === "mobile" ? styles.mobile : ""}`}>
      <Link to="/candidate" className={styles.workspaceLink} onClick={onNavigate}>
        Workspace
      </Link>
      <div className={styles.menuAnchor}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.accountButton}
          aria-label={`Tài khoản ${getAccountName(user)}`}
          aria-expanded={isOpen}
          aria-controls={menuId}
          onClick={onToggle}
        >
          <span className={styles.avatar} aria-hidden="true">{getAccountInitials(user)}</span>
          <span className={styles.accountName}>{getAccountName(user)}</span>
          <svg className={styles.chevron} viewBox="0 0 20 20" aria-hidden="true">
            <path d="m5 7 5 5 5-5" />
          </svg>
        </button>
        {isOpen && (
          <nav id={menuId} className={styles.menu} aria-label="Tài khoản">
            <Link to="/candidate" onClick={onNavigate}>Bảng điều khiển</Link>
            <Link to="/candidate/profile" onClick={onNavigate}>
              Hồ sơ <small>Đang phát triển</small>
            </Link>
            <Link to="/cv" onClick={onNavigate}>Trung tâm CV</Link>
            <button type="button" className={styles.logoutButton} onClick={onLogout}>
              Đăng xuất
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};

export default AccountDropdown;
