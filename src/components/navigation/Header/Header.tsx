import { Link, NavLink } from "react-router-dom";

import Button from "@/components/common/Button";

import styles from "./Header.module.css";

const Header = () => {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.logo}>
          FINDWORK
        </Link>

        <nav className={styles.nav}>
          <NavLink to="/jobs" className={styles.navLink}>
            Việc làm
          </NavLink>

          <NavLink to="/companies" className={styles.navLink}>
            Công ty
          </NavLink>
        </nav>

        <div className={styles.actions}>
          <Link to="/login" className={styles.loginLink}>
            Đăng nhập
          </Link>

          <Link to="/register">
            <Button size="small">
              Đăng ký
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;