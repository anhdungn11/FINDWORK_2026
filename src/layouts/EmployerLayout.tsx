import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Building2,
  ShieldCheck,
  MapPin,
  UserCheck,
  Mail,
  Plus,
  ExternalLink,
  LogOut,
  Menu,
  X,
  User,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { canManageJobs } from "@/features/company/companyWorkspacePermissions";
import { Badge } from "@/components/ui";
import { AiAssistantModal } from "@/features/ai/AiAssistantModal";
import styles from "./EmployerLayout.module.css";

const ROLE_LABEL: Record<string, string> = {
  COMPANY_OWNER: "Chủ sở hữu",
  ADMIN: "Quản trị viên",
  HR_MANAGER: "Trưởng phòng nhân sự",
  RECRUITER: "Chuyên viên tuyển dụng",
  HIRING_MANAGER: "Quản lý tuyển dụng",
  VIEWER: "Người xem",
};

const EmployerLayout = () => {
  const [open, setOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { companies, active, setActiveId } = useCompanyWorkspace();

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleLogout = async () => {
    if (await logout()) navigate("/", { replace: true });
  };

  const isLegalTab = location.pathname === "/employer/profile" && location.search.includes("tab=legal");
  const isProfileTab = location.pathname === "/employer/profile" && !location.search.includes("tab=legal");
  const isInvitationsTab = location.pathname === "/employer/members" && location.search.includes("tab=invitations");
  const isMembersTab = location.pathname === "/employer/members" && !location.search.includes("tab=invitations");
  const isJobsActive = location.pathname.startsWith("/employer/jobs");

  const companyInitials = (active?.name || "DN")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const primaryRole = active?.memberRoleNames?.[0]
    ? ROLE_LABEL[active.memberRoleNames[0]] || active.memberRoleNames[0].replace(/_/g, " ")
    : "Nhà tuyển dụng";

  return (
    <div className={styles.layout}>
      <a href="#workspace-main" className={styles.skip}>
        Chuyển đến nội dung chính
      </a>

      {/* TOPBAR */}
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuBtn}
          aria-label={open ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
          aria-expanded={open}
          aria-controls="employer-sidebar"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className={styles.brandGroup}>
          <Link to="/" className={styles.brand}>
            FINDWORK
          </Link>
          <span className={styles.brandTag}>Nhà tuyển dụng</span>
        </div>

        {/* ACTIVE COMPANY SWITCHER */}
        {companies.length > 1 ? (
          <div className={styles.companySelector}>
            <Building2 size={16} color="var(--color-primary, #4f6ef7)" />
            <select
              aria-label="Chọn doanh nghiệp đang quản lý"
              className={styles.companySelectorSelect}
              value={active.id}
              onChange={(e) => setActiveId(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.verificationStatus === "VERIFIED" ? "✓" : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className={styles.companySelector} title={active.name}>
            <Building2 size={16} color="var(--color-primary, #4f6ef7)" />
            <span className={styles.companyNameStatic}>{active.name}</span>
            <Badge tone={active.verificationStatus === "VERIFIED" ? "success" : "neutral"}>
              {active.verificationStatus === "VERIFIED" ? "Đã xác minh" : "Chưa xác minh"}
            </Badge>
          </div>
        )}

        <Link
          to={`/companies/${active.id}`}
          className={styles.viewPublicLink}
          target="_blank"
          rel="noopener noreferrer"
          title="Xem trang hiển thị công khai của doanh nghiệp đối với ứng viên"
        >
          <span>Trang công khai</span>
          <ExternalLink size={13} />
        </Link>

        <Link
          to="/candidate"
          className={styles.viewPublicLink}
          title="Chuyển sang không gian tìm việc (Ứng viên)"
        >
          <User size={14} />
          <span>Không gian ứng viên</span>
        </Link>

        <span className={styles.spacer} />

        {/* RIGHT ACTIONS */}
        <div className={styles.topbarRight}>
          <button
            type="button"
            className={styles.aiAssistantBtn}
            onClick={() => setAiModalOpen(true)}
            title="Mở Trợ lý tuyển dụng AI"
          >
            <Sparkles size={16} />
            <span>Trợ lý AI</span>
          </button>

          {canManageJobs(active?.memberRoleNames) && (
            <Link to="/employer/jobs/new" className={styles.postJobBtn}>
              <Plus size={16} />
              <span>Đăng tin mới</span>
            </Link>
          )}

          {user && (
            <div className={styles.accountInfo}>
              <span className={styles.accountEmail} title={user.email}>
                {user.email}
              </span>
              <span className={styles.accountRole}>{primaryRole}</span>
            </div>
          )}

          <button
            type="button"
            className={styles.logoutBtn}
            onClick={handleLogout}
            title="Đăng xuất khỏi tài khoản"
          >
            <LogOut size={15} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* MOBILE BACKDROP */}
      {open && <div className={styles.backdrop} onClick={() => setOpen(false)} aria-hidden="true" />}

      {/* BODY */}
      <div className={styles.body}>
        <aside
          id="employer-sidebar"
          className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}
          aria-label="Điều hướng không gian nhà tuyển dụng"
        >
          {/* COMPANY MINI CARD */}
          <div className={styles.sidebarCompanyCard}>
            <div className={styles.companyAvatar}>{companyInitials}</div>
            <div className={styles.companyDetails}>
              <div className={styles.companyTitle} title={active.name}>
                {active.name}
              </div>
              <div className={styles.companyRoleTag}>{primaryRole}</div>
            </div>
          </div>

          {/* SIDEBAR COMPANY SELECTOR FOR MULTI-COMPANY USERS */}
          {companies.length > 1 && (
            <div className={styles.sidebarCompanySelector}>
              <select
                aria-label="Chuyển đổi doanh nghiệp"
                className={styles.sidebarSelect}
                value={active.id}
                onChange={(e) => setActiveId(e.target.value)}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.verificationStatus === "VERIFIED" ? "✓" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* GROUP 1: MAIN WORKSPACE */}
          <div className={styles.navSection}>
            <div className={styles.sectionTitle}>Quy trình tuyển dụng</div>
            <ul className={styles.navList}>
              <li>
                <NavLink
                  to="/employer"
                  end
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
                  }
                >
                  <span className={styles.navIcon}>
                    <LayoutDashboard size={18} />
                  </span>
                  <span>Tổng quan</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/employer/jobs"
                  className={() =>
                    `${styles.navLink} ${isJobsActive ? styles.navLinkActive : ""}`
                  }
                >
                  <span className={styles.navIcon}>
                    <Briefcase size={18} />
                  </span>
                  <span>Tin tuyển dụng</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/employer/applicants"
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
                  }
                >
                  <span className={styles.navIcon}>
                    <Users size={18} />
                  </span>
                  <span>Hồ sơ ứng viên</span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* GROUP 2: COMPANY MANAGEMENT */}
          <div className={styles.navSection}>
            <div className={styles.sectionTitle}>Quản trị doanh nghiệp</div>
            <ul className={styles.navList}>
              <li>
                <NavLink
                  to="/employer/profile"
                  className={() =>
                    `${styles.navLink} ${isProfileTab ? styles.navLinkActive : ""}`
                  }
                >
                  <span className={styles.navIcon}>
                    <Building2 size={18} />
                  </span>
                  <span>Hồ sơ thương hiệu</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/employer/profile?tab=legal"
                  className={() =>
                    `${styles.navLink} ${isLegalTab ? styles.navLinkActive : ""}`
                  }
                >
                  <span className={styles.navIcon}>
                    <ShieldCheck size={18} />
                  </span>
                  <span>Xác minh pháp lý</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/employer/locations"
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
                  }
                >
                  <span className={styles.navIcon}>
                    <MapPin size={18} />
                  </span>
                  <span>Địa điểm làm việc</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/employer/members"
                  className={() =>
                    `${styles.navLink} ${isMembersTab ? styles.navLinkActive : ""}`
                  }
                >
                  <span className={styles.navIcon}>
                    <UserCheck size={18} />
                  </span>
                  <span>Thành viên nội bộ</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/employer/members?tab=invitations"
                  className={() =>
                    `${styles.navLink} ${isInvitationsTab ? styles.navLinkActive : ""}`
                  }
                >
                  <span className={styles.navIcon}>
                    <Mail size={18} />
                  </span>
                  <span>Lời mời nội bộ</span>
                </NavLink>
              </li>
            </ul>
          </div>

          {/* CANDIDATE WORKSPACE SWITCHER */}
          <div className={styles.navSection} style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--color-border, #e2e8f0)" }}>
            <Link to="/candidate" className={styles.navLink} title="Chuyển sang không gian tìm việc (Ứng viên)">
              <span className={styles.navIcon}>
                <User size={18} />
              </span>
              <span>Không gian ứng viên</span>
            </Link>
          </div>
        </aside>

        <main id="workspace-main" className={styles.main} tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <AiAssistantModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        contextHint={active?.name ? `Doanh nghiệp: ${active.name}` : undefined}
      />
    </div>
  );
};

export default EmployerLayout;
