import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

import DesktopActions from "./components/DesktopActions";
import DesktopNavigation from "./components/DesktopNavigation";
import HeaderLogo from "./components/HeaderLogo";
import MobileMenuButton from "./components/MobileMenuButton";
import MobilePanel from "./components/MobilePanel";

import useHeaderControls from "./hooks/useHeaderControls";
import useHeaderAuth from "./hooks/useHeaderAuth";

import styles from "./styles/HeaderLayout.module.css";

const Header = () => {
  const navigate = useNavigate();
  const { view, user, logoutError, logout } = useHeaderAuth();
  const {
    isLanguageOpen,
    isEmployerOpen,
    isMobileOpen,
    isAccountOpen,
    language,
    closeMenus,
    closeAccount,
    changeLanguage,
    toggleLanguage,
    toggleEmployer,
    toggleMobile,
    toggleAccount,
  } = useHeaderControls();

  useEffect(() => {
    if (view !== "authenticated") closeMenus();
  }, [view, closeMenus]);

  useEffect(() => {
    const breakpoint = window.matchMedia("(max-width: 1024px)");
    breakpoint.addEventListener("change", closeMenus);
    return () => breakpoint.removeEventListener("change", closeMenus);
  }, [closeMenus]);

  const handleLogout = async () => {
    const confirmed = await logout();
    if (confirmed && useAuthStore.getState().status === "unauthenticated") {
      closeMenus();
      navigate("/", { replace: true });
    }
  };

  return (
    <header className={styles.header}>
      <div
        className={`container ${styles.inner}`}
      >
        <HeaderLogo
          onClick={closeMenus}
        />

        <DesktopNavigation />

        <DesktopActions
          language={language}
          isLanguageOpen={isLanguageOpen}
          isEmployerOpen={isEmployerOpen}
          isAccountOpen={isAccountOpen && !isMobileOpen}
          authView={view}
          user={user}
          onLanguageToggle={toggleLanguage}
          onEmployerToggle={toggleEmployer}
          onLanguageChange={changeLanguage}
          onClose={closeMenus}
          onAccountToggle={toggleAccount}
          onAccountClose={closeAccount}
          onLogout={handleLogout}
        />

        <MobileMenuButton
          isOpen={isMobileOpen}
          onToggle={toggleMobile}
        />
      </div>

      <MobilePanel
        isOpen={isMobileOpen}
        language={language}
        onLanguageChange={changeLanguage}
        onClose={closeMenus}
        isAccountOpen={isAccountOpen}
        authView={view}
        user={user}
        onAccountToggle={toggleAccount}
        onAccountClose={closeAccount}
        onLogout={handleLogout}
      />
      {logoutError && view !== "loggingOut" && (
        <div className={styles.logoutNotice} role="alert">
          <span>{logoutError}</span>
          <button type="button" onClick={handleLogout}>Thử đăng xuất lại</button>
        </div>
      )}
    </header>
  );
};

export default Header;
