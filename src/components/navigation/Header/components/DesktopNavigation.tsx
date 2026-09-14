import {
  NavLink,
} from "react-router-dom";

import styles from "../styles/HeaderNavigation.module.css";

const DesktopNavigation = () => {
  return (
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
  );
};

export default DesktopNavigation;
