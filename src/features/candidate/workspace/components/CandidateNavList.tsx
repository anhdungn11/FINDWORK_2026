import { NavLink } from "react-router-dom";
import {
  ArrowUpRight,
  Bookmark,
  Briefcase,
  FileText,
  Layers,
  LayoutDashboard,
  Send,
  User,
} from "lucide-react";
import { useSavedJobs } from "@/features/candidate/savedJobs/useSavedJobs";
import type { WorkspaceNavItem } from "../types/workspace.types";
import styles from "../styles/CandidateWorkspace.module.css";

const PRIMARY_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    id: "dashboard",
    label: "Bảng điều khiển",
    to: "/candidate",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    id: "profile",
    label: "Hồ sơ cá nhân",
    to: "/candidate/profile",
    icon: User,
    badge: "Đang hoàn thiện",
    badgeType: "warning",
    ariaLabel: "Hồ sơ cá nhân: Đang hoàn thiện",
  },
  {
    id: "onboarding",
    label: "Tiến độ hồ sơ",
    to: "/candidate/onboarding",
    icon: Layers,
    badge: "7 bước",
    badgeType: "neutral",
  },
];

const DISCOVERY_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    id: "cv-center",
    label: "CV Center",
    to: "/cv",
    icon: FileText,
    isExternal: true,
    ariaLabel: "CV Center (chuyển ngữ cảnh sang trang quản lý CV)",
  },
  {
    id: "jobs",
    label: "Tìm việc làm",
    to: "/jobs",
    icon: Briefcase,
    isExternal: true,
    ariaLabel: "Tìm việc làm (chuyển ngữ cảnh sang danh sách tin tuyển dụng)",
  },
];

interface CandidateNavListProps {
  onNavigate?: () => void;
}

export const CandidateNavList = ({ onNavigate }: CandidateNavListProps) => {
  const { savedCount } = useSavedJobs();

  const activityNavItems: WorkspaceNavItem[] = [
    {
      id: "saved-jobs",
      label: "Việc làm đã lưu",
      to: "/candidate/saved-jobs",
      icon: Bookmark,
      badge: savedCount > 0 ? String(savedCount) : undefined,
      badgeType: "neutral",
      ariaLabel: `Việc làm đã lưu${savedCount > 0 ? `: ${savedCount} tin` : ""}`,
    },
    {
      id: "applications",
      label: "Lịch sử ứng tuyển",
      to: "/candidate/applications",
      icon: Send,
      ariaLabel: "Lịch sử các đơn đã nộp",
    },
  ];

  const renderItem = (item: WorkspaceNavItem) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.id}
        to={item.to}
        end={item.exact}
        onClick={onNavigate}
        className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
        }
        aria-label={item.ariaLabel}
      >
        <span className={styles.navLinkContent}>
          <Icon size={18} aria-hidden="true" className={styles.navLinkIcon} />
          <span>{item.label}</span>
        </span>

        {item.badge ? (
          <span
            className={`${styles.navBadge} ${
              item.badgeType === "warning"
                ? styles.navBadgeWarning
                : styles.navBadgeNeutral
            }`}
          >
            {item.badge}
          </span>
        ) : item.isExternal ? (
          <ArrowUpRight
            size={14}
            aria-hidden="true"
            style={{ opacity: 0.6 }}
          />
        ) : null}
      </NavLink>
    );
  };

  return (
    <nav aria-label="Điều hướng chính ứng viên">
      <div className={styles.navGroup}>
        <span className={styles.navGroupLabel}>Không gian làm việc</span>
        {PRIMARY_NAV_ITEMS.map(renderItem)}
      </div>

      <div className={styles.navGroup}>
        <span className={styles.navGroupLabel}>Hoạt động tìm việc</span>
        {activityNavItems.map(renderItem)}
      </div>

      <div className={styles.navGroup}>
        <span className={styles.navGroupLabel}>Khám phá & Ứng tuyển</span>
        {DISCOVERY_NAV_ITEMS.map(renderItem)}
      </div>
    </nav>
  );
};
