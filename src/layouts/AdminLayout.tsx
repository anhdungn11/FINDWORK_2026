import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  BarChart3,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import styles from "./AdminLayout.module.css";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Tổng quan & Báo cáo",
    items: [
      { to: "/admin", label: "Tổng quan nền tảng", icon: LayoutDashboard, end: true },
      { to: "/admin/reports", label: "Báo cáo tiến độ & Vận hành", icon: BarChart3 },
    ],
  },
  {
    title: "Vận hành & Kiểm duyệt",
    items: [
      { to: "/admin/users", label: "Quản lý người dùng", icon: Users },
      { to: "/admin/companies", label: "Doanh nghiệp & Xét duyệt", icon: Building2 },
      { to: "/admin/jobs", label: "Kiểm duyệt tin tuyển dụng", icon: Briefcase },
    ],
  },
  {
    title: "An toàn & Hệ thống",
    items: [
      { to: "/admin/system", label: "Nhật ký Audit & Cấu hình", icon: ShieldCheck },
    ],
  },
];

const AdminLayout = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleLogout = async () => {
    if (await logout()) {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className={styles.layout}>
      <a href="#admin-main" className={styles.skip}>
        Chuyển đến nội dung chính
      </a>

      {/* TOPBAR */}
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuBtn}
          aria-label={open ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
          aria-expanded={open}
          aria-controls="admin-sidebar"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className={styles.brandGroup}>
          <Link to="/" className={styles.brand}>
            <span>FINDWORK</span>
          </Link>
          <span className={styles.brandTag}>Enterprise Admin</span>
        </div>

        <div className={styles.platformPill}>
          <span className={styles.platformDot} />
          <span>Core Services Online</span>
        </div>

        <span className={styles.spacer} />

        <div className={styles.userCluster}>
          <div className={styles.adminBadge}>
            <ShieldAlert size={15} color="var(--color-primary, #4f6ef7)" />
            <span className={styles.adminEmail} title={user?.email || "Super Admin"}>
              {user?.email || "admin@findwork.vn"}
            </span>
            <span className={styles.roleTag}>{user?.role || "ADMIN"}</span>
          </div>

          <button
            type="button"
            className={styles.logoutBtn}
            onClick={handleLogout}
            title="Đăng xuất khỏi phiên quản trị"
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className={styles.body}>
        {open && <div className={styles.backdrop} onClick={() => setOpen(false)} />}

        <aside
          id="admin-sidebar"
          className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}
        >
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarTitle}>FINDWORK CONTROL PLANE</div>
            <div className={styles.sidebarSubtitle}>Trung tâm Quản trị Nền tảng</div>
          </div>

          <nav aria-label="Điều hướng quản trị hệ thống">
            {SECTIONS.map((sec) => (
              <div key={sec.title} className={styles.navGroup}>
                <div className={styles.groupLabel}>{sec.title}</div>
                <ul className={styles.navList}>
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) =>
                            `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
                          }
                        >
                          <span className={styles.navIcon}>
                            <Icon size={18} />
                          </span>
                          <span>{item.label}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main id="admin-main" className={styles.main} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
