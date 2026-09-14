import DesktopActions from "./components/DesktopActions";
import DesktopNavigation from "./components/DesktopNavigation";
import HeaderLogo from "./components/HeaderLogo";
import MobileMenuButton from "./components/MobileMenuButton";
import MobilePanel from "./components/MobilePanel";

import useHeaderControls from "./hooks/useHeaderControls";

import styles from "./styles/HeaderLayout.module.css";

const Header = () => {
  const {
    isLanguageOpen,
    isEmployerOpen,
    isMobileOpen,
    language,
    closeMenus,
    changeLanguage,
    toggleLanguage,
    toggleEmployer,
    toggleMobile,
  } = useHeaderControls();

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
          onLanguageToggle={toggleLanguage}
          onEmployerToggle={toggleEmployer}
          onLanguageChange={changeLanguage}
          onClose={closeMenus}
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
      />
    </header>
  );
};

export default Header;
