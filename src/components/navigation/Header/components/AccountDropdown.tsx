import { useEffect, useId, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

import type { AuthUser } from "@/store/authStore";
import { useEmployerMembership } from "@/features/company/hooks/useEmployerMembership";
import { useI18n } from "../../../../i18n/i18nStore";

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
  const location = useLocation();
  const { isEmployer } = useEmployerMembership();
  const t = useI18n((s) => s.t);

  const isEmployerContext = location.pathname.startsWith("/employer");
  // Chỉ tài khoản có tư cách doanh nghiệp hợp lệ (GET /companies/me) mới có đích đến /employer.
  // Tài khoản thuần Ứng viên luôn hướng tới /candidate.
  const workspaceTarget = isEmployer ? (isEmployerContext ? "/employer" : "/employer") : "/candidate";
  const workspaceTitle = isEmployer
    ? t.nav.employerWorkspace
    : t.nav.candidateWorkspace;

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
      <Link to={workspaceTarget} className={styles.workspaceLink} onClick={onNavigate} title={workspaceTitle}>
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
            {isEmployer ? (
              <>
                <Link to="/employer" onClick={onNavigate}>{t.nav.employerWorkspace}</Link>
                <Link to="/employer/jobs" onClick={onNavigate}>{t.nav.employerJobs}</Link>
                <Link to="/employer/profile" onClick={onNavigate}>{t.nav.employerProfile}</Link>
                <Link to="/employer/locations" onClick={onNavigate}>{t.nav.employerLocations}</Link>
                <Link to="/employer/members" onClick={onNavigate}>{t.nav.employerMembers}</Link>
                <Link to="/employer/applicants" onClick={onNavigate}>{t.nav.employerApplicants}</Link>
                <Link to="/jobs" onClick={onNavigate}>{t.nav.jobs}</Link>
              </>
            ) : (
              <>
                <Link to="/candidate" onClick={onNavigate}>{t.nav.dashboard}</Link>
                <Link to="/candidate/profile" onClick={onNavigate}>{t.nav.profile}</Link>
                <Link to="/cv" onClick={onNavigate}>{t.nav.cvCenter}</Link>
                <Link to="/candidate/saved-jobs" onClick={onNavigate}>{t.nav.savedJobs}</Link>
                <Link to="/candidate/applications" onClick={onNavigate}>{t.nav.applications}</Link>
                <Link to="/jobs" onClick={onNavigate}>{t.nav.jobs}</Link>
                {isEmployer && (
                  <Link to="/employer" onClick={onNavigate}>{t.nav.employerWorkspace}</Link>
                )}
              </>
            )}
            <button type="button" className={styles.logoutButton} onClick={onLogout}>
              {t.nav.logout}
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};

export default AccountDropdown;
