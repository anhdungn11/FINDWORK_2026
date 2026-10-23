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

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("open-findwork-ai"))}
        title="Mở trợ lý thông minh FINDWORK AI"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 8,
          background: "linear-gradient(135deg, #0284c7 0%, #6366f1 100%)",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 13,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(14, 165, 233, 0.35)",
          marginLeft: 6,
        }}
      >
        <span style={{ display: "inline-flex" }}>✨</span>
        <span>FINDWORK AI</span>
      </button>
    </nav>
  );
};

export default DesktopNavigation;
