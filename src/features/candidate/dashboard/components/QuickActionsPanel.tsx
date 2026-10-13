import { Link } from "react-router-dom";
import { ArrowUpRight, Briefcase, FileText, Layers, User } from "lucide-react";
import styles from "../styles/CandidateDashboard.module.css";

const QUICK_ACTIONS = [
  {
    title: "Tiếp tục Onboarding",
    description: "Cập nhật và lưu bản nháp 7 bước thông tin hồ sơ ứng viên trong cơ sở dữ liệu.",
    href: "/candidate/onboarding",
    icon: Layers,
    badge: "7 bước",
  },
  {
    title: "Quản lý hồ sơ",
    description: "Xem và quản lý trang hồ sơ cá nhân của tài khoản.",
    href: "/candidate/profile",
    icon: User,
    badge: "Cá nhân",
  },
  {
    title: "CV Center",
    description: "Quản lý kho CV, thiết kế mẫu CV chuẩn hoặc tải lên tệp PDF từ máy.",
    href: "/cv",
    icon: FileText,
    badge: "Tối đa 10 CV",
  },
  {
    title: "Tìm việc làm",
    description: "Khám phá các vị trí tuyển dụng mới nhất phù hợp với năng lực và định hướng.",
    href: "/jobs",
    icon: Briefcase,
    badge: "Đa ngành",
  },
];

export const QuickActionsPanel = () => {
  return (
    <section aria-labelledby="quick-actions-heading">
      <h2 id="quick-actions-heading" style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--color-text-primary, #1e293b)" }}>
        Thao tác nhanh
      </h2>

      <div className={styles.quickActionsGrid}>
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              to={action.href}
              className={styles.actionTile}
              aria-label={`${action.title}: ${action.description}`}
            >
              <div className={styles.actionTileIcon}>
                <Icon size={20} aria-hidden="true" />
              </div>

              <div className={styles.actionTileTitle}>
                <span>{action.title}</span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </div>

              <p className={styles.actionTileDesc}>{action.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
