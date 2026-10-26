import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import styles from "./WorkspaceShell.module.css";

export interface WorkspaceNavItem {
  to: string;
  label: string;
  end?: boolean;
  icon?: ReactNode;
}

interface Props {
  tag: string;
  navLabel: string;
  items: WorkspaceNavItem[];
}

const WorkspaceShell = ({ tag, navLabel, items }: Props) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleLogout = async () => {
    if (await logout()) navigate("/", { replace: true });
  };

  return (
    <div className={styles.layout}>
      <a href="#workspace-main" className={styles.skip}>Chuyển đến nội dung chính</a>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuBtn}
          aria-label={open ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
          aria-expanded={open}
          aria-controls="workspace-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "✕" : "☰"}
        </button>
        <Link to="/" className={styles.brand}>FINDWORK</Link>
        <span className={styles.brandTag}>{tag}</span>
        <span className={styles.spacer} />
        {user && <span className={styles.account} title={user.email}>{user.email}</span>}
        <button type="button" className={styles.menuBtn} style={{ display: "inline-flex", padding: "0 12px" }} onClick={handleLogout}>
          Đăng xuất
        </button>
      </header>
      <div className={styles.body}>
        <aside id="workspace-nav" className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
          <nav aria-label={navLabel}>
            <ul className={styles.nav}>
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main id="workspace-main" className={styles.main} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default WorkspaceShell;
