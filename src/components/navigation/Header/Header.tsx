import { useState } from "react";
import {
  Link,
  NavLink,
} from "react-router-dom";

import Button from "@/components/common/Button";

import styles from "./Header.module.css";

const Header = () => {
  const [
    isLanguageOpen,
    setIsLanguageOpen,
  ] = useState(false);

  const [
    isEmployerOpen,
    setIsEmployerOpen,
  ] = useState(false);

  const [
    isMobileOpen,
    setIsMobileOpen,
  ] = useState(false);

  const [
    language,
    setLanguage,
  ] = useState<"VI" | "EN">("VI");

  const closeMenus = () => {
    setIsLanguageOpen(false);
    setIsEmployerOpen(false);
    setIsMobileOpen(false);
  };

  const handleLanguageChange = (
    value: "VI" | "EN",
  ) => {
    setLanguage(value);
    setIsLanguageOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        {/* LOGO */}
        <Link
          to="/"
          className={styles.logo}
          onClick={closeMenus}
        >
          FINDWORK
        </Link>

        {/* DESKTOP NAV */}
        <nav
          className={styles.nav}
          aria-label="Điều hướng chính"
        >
          <NavLink
            to="/jobs"
            className={({ isActive }) =>
              `${styles.navLink} ${
                isActive
                  ? styles.navLinkActive
                  : ""
              }`
            }
          >
            Việc làm
          </NavLink>

          <NavLink
            to="/companies"
            className={({ isActive }) =>
              `${styles.navLink} ${
                isActive
                  ? styles.navLinkActive
                  : ""
              }`
            }
          >
            Công ty
          </NavLink>

          <NavLink
            to="/cv"
            className={({ isActive }) =>
              `${styles.navLink} ${
                styles.cvLink
              } ${
                isActive
                  ? styles.navLinkActive
                  : ""
              }`
            }
          >
            Tạo CV
          </NavLink>

          <NavLink
            to="/career"
            className={({ isActive }) =>
              `${styles.navLink} ${
                isActive
                  ? styles.navLinkActive
                  : ""
              }`
            }
          >
            Khám phá nghề nghiệp
          </NavLink>
        </nav>

        {/* DESKTOP ACTIONS */}
        <div className={styles.actions}>
          {/* LANGUAGE */}
          <div className={styles.dropdown}>
            <button
              type="button"
              className={styles.languageButton}
              aria-expanded={isLanguageOpen}
              onClick={() => {
                setIsLanguageOpen(
                  (current) => !current,
                );

                setIsEmployerOpen(false);
              }}
            >
              <span className={styles.languageGlobe}>
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
                  isLanguageOpen
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

            {isLanguageOpen && (
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
                    handleLanguageChange("VI")
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
                    handleLanguageChange("EN")
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

          {/* EMPLOYER */}
          <div className={styles.dropdown}>
            <button
              type="button"
              className={styles.employerButton}
              aria-expanded={isEmployerOpen}
              onClick={() => {
                setIsEmployerOpen(
                  (current) => !current,
                );

                setIsLanguageOpen(false);
              }}
            >
              <span>
                Dành cho nhà tuyển dụng
              </span>

              <span
                className={`${styles.chevron} ${
                  isEmployerOpen
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

            {isEmployerOpen && (
              <div
                className={`${styles.dropdownMenu} ${styles.employerMenu}`}
              >
                <div
                  className={styles.employerIntro}
                >
                  <span
                    className={styles.dropdownEyebrow}
                  >
                    FINDWORK FOR BUSINESS
                  </span>

                  <strong>
                    Tuyển đúng người, nhanh hơn.
                  </strong>

                  <p>
                    Quản lý tin tuyển dụng và
                    ứng viên trong một workspace.
                  </p>
                </div>

                <div className={styles.menuDivider} />

                <Link
                  to="/employer/login"
                  className={styles.employerMenuItem}
                  onClick={closeMenus}
                >
                  <span
                    className={styles.menuItemIcon}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M9 11V7a3 3 0 0 1 6 0v4" />
                      <rect
                        x="5"
                        y="11"
                        width="14"
                        height="9"
                        rx="2"
                      />
                    </svg>
                  </span>

                  <span>
                    <strong>
                      Đăng nhập nhà tuyển dụng
                    </strong>

                    <small>
                      Truy cập workspace tuyển dụng
                    </small>
                  </span>
                </Link>

                <Link
                  to="/employer/register"
                  className={styles.employerMenuItem}
                  onClick={closeMenus}
                >
                  <span
                    className={styles.menuItemIcon}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M4 20V8l8-4 8 4v12" />
                      <path d="M9 20v-5h6v5" />
                      <path d="M8 10h.01M12 10h.01M16 10h.01" />
                    </svg>
                  </span>

                  <span>
                    <strong>
                      Đăng ký doanh nghiệp
                    </strong>

                    <small>
                      Tạo hồ sơ và bắt đầu tuyển dụng
                    </small>
                  </span>
                </Link>

                <Link
                  to="/employer/jobs/create"
                  className={styles.employerMenuItem}
                  onClick={closeMenus}
                >
                  <span
                    className={styles.menuItemIcon}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <rect
                        x="4"
                        y="5"
                        width="16"
                        height="15"
                        rx="2"
                      />

                      <path d="M8 3v4M16 3v4M8 11h8M8 15h5" />
                    </svg>
                  </span>

                  <span>
                    <strong>
                      Đăng tin tuyển dụng
                    </strong>

                    <small>
                      Tạo cơ hội việc làm mới
                    </small>
                  </span>
                </Link>
              </div>
            )}
          </div>

          <span className={styles.actionDivider} />

          <Link
            to="/login"
            className={styles.loginLink}
            onClick={closeMenus}
          >
            Đăng nhập
          </Link>

          <Link
            to="/register"
            className={styles.registerLink}
            onClick={closeMenus}
          >
            <Button size="small">
              Đăng ký
            </Button>
          </Link>
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          type="button"
          className={styles.mobileMenuButton}
          aria-label="Mở menu"
          aria-expanded={isMobileOpen}
          onClick={() => {
            setIsMobileOpen(
              (current) => !current,
            );

            setIsLanguageOpen(false);
            setIsEmployerOpen(false);
          }}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* MOBILE NAV */}
      {isMobileOpen && (
        <div className={styles.mobilePanel}>
          <div
            className={`container ${styles.mobilePanelInner}`}
          >
            <nav className={styles.mobileNav}>
              <NavLink
                to="/jobs"
                className={styles.mobileNavLink}
                onClick={closeMenus}
              >
                Việc làm
              </NavLink>

              <NavLink
                to="/companies"
                className={styles.mobileNavLink}
                onClick={closeMenus}
              >
                Công ty
              </NavLink>

              <NavLink
                to="/cv"
                className={styles.mobileNavLink}
                onClick={closeMenus}
              >
                Tạo CV
              </NavLink>

              <NavLink
                to="/career"
                className={styles.mobileNavLink}
                onClick={closeMenus}
              >
                Khám phá nghề nghiệp
              </NavLink>
            </nav>

            <div className={styles.mobileSection}>
              <span className={styles.mobileLabel}>
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
                    handleLanguageChange("VI")
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
                    handleLanguageChange("EN")
                  }
                >
                  EN
                </button>
              </div>
            </div>

            <div className={styles.mobileSection}>
              <span className={styles.mobileLabel}>
                Nhà tuyển dụng
              </span>

              <Link
                to="/employer/login"
                className={styles.mobileActionLink}
                onClick={closeMenus}
              >
                Đăng nhập nhà tuyển dụng
              </Link>

              <Link
                to="/employer/register"
                className={styles.mobileActionLink}
                onClick={closeMenus}
              >
                Đăng ký doanh nghiệp
              </Link>
            </div>

            <div className={styles.mobileAuth}>
              <Link
                to="/login"
                className={styles.mobileLogin}
                onClick={closeMenus}
              >
                Đăng nhập
              </Link>

              <Link
                to="/register"
                className={styles.mobileRegister}
                onClick={closeMenus}
              >
                Đăng ký
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;