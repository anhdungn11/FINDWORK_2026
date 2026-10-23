import { NavLink } from "react-router-dom";
import { useI18n } from "../../../../i18n/i18nStore";
import styles from "../styles/HeaderNavigation.module.css";

const DesktopNavigation = () => {
  const t = useI18n((s) => s.t);

  return (
    <nav className={styles.nav} aria-label={t.nav.home}>
      <NavLink
        to="/jobs"
        className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
        }
      >
        {t.nav.jobs}
      </NavLink>

      <NavLink
        to="/companies"
        className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
        }
      >
        {t.nav.companies}
      </NavLink>

      <NavLink
        to="/cv"
        className={({ isActive }) =>
          `${styles.navLink} ${styles.cvLink} ${isActive ? styles.navLinkActive : ""}`
        }
      >
        {t.nav.createCv}
      </NavLink>

      <NavLink
        to="/career"
        className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
        }
      >
        {t.nav.career}
      </NavLink>
    </nav>
  );
};

export default DesktopNavigation;
