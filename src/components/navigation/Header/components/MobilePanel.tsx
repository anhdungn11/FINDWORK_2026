import { Link, NavLink } from "react-router-dom";
import type { AuthUser } from "@/store/authStore";
import { useI18n } from "../../../../i18n/i18nStore";
import type { HeaderLanguage } from "../types/header.types";
import type { HeaderAuthView } from "../hooks/headerAuth";
import AccountDropdown from "./AccountDropdown";
import styles from "../styles/HeaderMobile.module.css";

interface MobilePanelProps {
  authView: HeaderAuthView;
  user: AuthUser | null;
  isOpen: boolean;
  isAccountOpen: boolean;
  language: HeaderLanguage;
  onLanguageChange: (value: HeaderLanguage) => void;
  onClose: () => void;
  onAccountToggle: () => void;
  onAccountClose: () => void;
  onLogout: () => void;
}

const MobilePanel = ({
  authView,
  user,
  isOpen,
  isAccountOpen,
  language,
  onLanguageChange,
  onClose,
  onAccountToggle,
  onAccountClose,
  onLogout,
}: MobilePanelProps) => {
  const t = useI18n((s) => s.t);
  if (!isOpen) return null;

  const isAuthenticated = authView === "authenticated" && user !== null;

  return (
    <div className={styles.mobilePanel}>
      <div className={`container ${styles.mobilePanelInner}`}>
        <nav className={styles.mobileNav}>
          <NavLink to="/jobs" className={styles.mobileNavLink} onClick={onClose}>
            {t.nav.jobs}
          </NavLink>

          <NavLink to="/companies" className={styles.mobileNavLink} onClick={onClose}>
            {t.nav.companies}
          </NavLink>

          <NavLink to="/cv" className={styles.mobileNavLink} onClick={onClose}>
            {t.nav.createCv}
          </NavLink>

          <NavLink to="/career" className={styles.mobileNavLink} onClick={onClose}>
            {t.nav.career}
          </NavLink>
        </nav>

        <div className={styles.mobileSection}>
          <span className={styles.mobileLabel}>Ngôn ngữ / Language</span>

          <div className={styles.mobileLanguage}>
            <button
              type="button"
              className={language === "VI" ? styles.mobileLanguageActive : undefined}
              onClick={() => onLanguageChange("VI")}
            >
              VI
            </button>

            <button
              type="button"
              className={language === "EN" ? styles.mobileLanguageActive : undefined}
              onClick={() => onLanguageChange("EN")}
            >
              EN
            </button>
          </div>
        </div>

        <div className={styles.mobileSection}>
          <span className={styles.mobileLabel}>{t.nav.forEmployers}</span>

          {isAuthenticated ? (
            <>
              <Link to="/employer" className={styles.mobileActionLink} onClick={onClose}>
                {t.nav.employerWorkspace}
              </Link>

              <Link to="/employer/onboarding" className={styles.mobileActionLink} onClick={onClose}>
                Đăng ký doanh nghiệp
              </Link>
            </>
          ) : (
            <>
              <Link to="/employer/login" className={styles.mobileActionLink} onClick={onClose}>
                {t.nav.signIn} ({t.nav.forEmployers})
              </Link>

              <Link to="/employer/register" className={styles.mobileActionLink} onClick={onClose}>
                {t.nav.register} ({t.nav.forEmployers})
              </Link>
            </>
          )}
        </div>

        <div className={`${styles.mobileAuth} ${authView === "anonymous" ? "" : styles.mobileAuthSingle}`}>
          {isAuthenticated && user ? (
            <AccountDropdown
              user={user}
              variant="mobile"
              isOpen={isAccountOpen}
              onToggle={onAccountToggle}
              onClose={onAccountClose}
              onNavigate={onClose}
              onLogout={onLogout}
            />
          ) : authView === "anonymous" ? (
            <>
              <Link to="/login" className={styles.mobileLogin} onClick={onClose}>
                {t.nav.signIn}
              </Link>
              <Link to="/register" className={styles.mobileRegister} onClick={onClose}>
                {t.nav.register}
              </Link>
            </>
          ) : (
            <span className={styles.mobileSessionStatus} role="status">
              {authView === "loggingOut" ? t.nav.loggingOut : t.access.checkingSession}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobilePanel;
