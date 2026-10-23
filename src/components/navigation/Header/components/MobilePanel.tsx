import {
  Link,
  NavLink,
} from "react-router-dom";
import type { AuthUser } from "@/store/authStore";

import type {
  HeaderLanguage,
} from "../types/header.types";

import styles from "../styles/HeaderMobile.module.css";
import AccountDropdown from "./AccountDropdown";
import type { HeaderAuthView } from "../hooks/headerAuth";

interface MobilePanelProps {
  isOpen: boolean;
  isAccountOpen: boolean;
  authView: HeaderAuthView;
  user: AuthUser | null;
  language: HeaderLanguage;
  onLanguageChange:
    (value: HeaderLanguage) => void;
  onClose: () => void;
  onAccountToggle: () => void;
  onAccountClose: () => void;
  onLogout: () => void;
}

const MobilePanel = ({
  isOpen,
  isAccountOpen,
  authView,
  user,
  language,
  onLanguageChange,
  onClose,
  onAccountToggle,
  onAccountClose,
  onLogout,
}: MobilePanelProps) => {
  if (!isOpen) {
    return null;
  }

  const isAuthenticated = authView === "authenticated" && user !== null;

  return (
    <div className={styles.mobilePanel}>
      <div
        className={`container ${styles.mobilePanelInner}`}
      >
        <nav className={styles.mobileNav}>
          <NavLink
            to="/jobs"
            className={styles.mobileNavLink}
            onClick={onClose}
          >
            Việc làm
          </NavLink>

          <NavLink
            to="/companies"
            className={styles.mobileNavLink}
            onClick={onClose}
          >
            Công ty
          </NavLink>

          <NavLink
            to="/cv"
            className={styles.mobileNavLink}
            onClick={onClose}
          >
            Tạo CV
          </NavLink>

          <NavLink
            to="/career"
            className={styles.mobileNavLink}
            onClick={onClose}
          >
            Khám phá nghề nghiệp
          </NavLink>

          <button
            type="button"
            className={styles.mobileNavLink}
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent("open-findwork-ai"));
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#0284c7",
              fontWeight: 600,
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              padding: "12px 0",
              width: "100%",
              fontFamily: "inherit",
              fontSize: "inherit",
            }}
          >
            <span>✨</span>
            <span>FINDWORK AI (Trợ lý)</span>
          </button>
        </nav>

        <div className={styles.mobileSection}>
          <span
            className={styles.mobileLabel}
          >
            Ngôn ngữ
          </span>

          <div
            className={styles.mobileLanguage}
          >
            <button
              type="button"
              className={
                language === "VI"
                  ? styles.mobileLanguageActive
                  : undefined
              }
              onClick={() =>
                onLanguageChange("VI")
              }
            >
              VI
            </button>

            <button
              type="button"
              className={
                language === "EN"
                  ? styles.mobileLanguageActive
                  : undefined
              }
              onClick={() =>
                onLanguageChange("EN")
              }
            >
              EN
            </button>
          </div>
        </div>

        <div className={styles.mobileSection}>
          <span
            className={styles.mobileLabel}
          >
            Nhà tuyển dụng
          </span>

          {isAuthenticated ? (
            <>
              <Link
                to="/employer"
                className={styles.mobileActionLink}
                onClick={onClose}
              >
                Không gian tuyển dụng
              </Link>

              <Link
                to="/employer/onboarding"
                className={styles.mobileActionLink}
                onClick={onClose}
              >
                Đăng ký doanh nghiệp
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/employer/login"
                className={styles.mobileActionLink}
                onClick={onClose}
              >
                Đăng nhập nhà tuyển dụng
              </Link>

              <Link
                to="/employer/register"
                className={styles.mobileActionLink}
                onClick={onClose}
              >
                Đăng ký doanh nghiệp
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
                Đăng nhập
              </Link>
              <Link to="/register" className={styles.mobileRegister} onClick={onClose}>
                Đăng ký
              </Link>
            </>
          ) : (
            <span className={styles.mobileSessionStatus} role="status">
              {authView === "loggingOut" ? "Đang đăng xuất..." : "Đang kiểm tra phiên..."}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobilePanel;
