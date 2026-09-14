import {
  Link,
  NavLink,
} from "react-router-dom";

import type {
  HeaderLanguage,
} from "../types/header.types";

import styles from "../styles/HeaderMobile.module.css";

interface MobilePanelProps {
  isOpen: boolean;
  language: HeaderLanguage;
  onLanguageChange:
    (value: HeaderLanguage) => void;
  onClose: () => void;
}

const MobilePanel = ({
  isOpen,
  language,
  onLanguageChange,
  onClose,
}: MobilePanelProps) => {
  if (!isOpen) {
    return null;
  }

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
        </div>

        <div className={styles.mobileAuth}>
          <Link
            to="/login"
            className={styles.mobileLogin}
            onClick={onClose}
          >
            Đăng nhập
          </Link>

          <Link
            to="/register"
            className={styles.mobileRegister}
            onClick={onClose}
          >
            Đăng ký
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MobilePanel;
