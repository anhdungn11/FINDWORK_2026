import type { RefObject } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Menu, Globe } from "lucide-react";
import { useI18n } from "@/i18n/i18nStore";
import { CandidateAccountMenu } from "./CandidateAccountMenu";
import styles from "../styles/CandidateWorkspace.module.css";

interface CandidateHeaderProps {
  hamburgerButtonRef?: RefObject<HTMLButtonElement | null>;
  isMobileDrawerOpen: boolean;
  onToggleMobileDrawer: () => void;
}

export const CandidateHeader = ({
  hamburgerButtonRef,
  isMobileDrawerOpen,
  onToggleMobileDrawer,
}: CandidateHeaderProps) => {
  const { locale, toggleLocale } = useI18n();
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button
          ref={hamburgerButtonRef}
          type="button"
          className={styles.hamburgerButton}
          onClick={onToggleMobileDrawer}
          aria-label={isMobileDrawerOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
          aria-expanded={isMobileDrawerOpen}
          aria-controls="candidate-mobile-drawer"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <Link to="/candidate" className={styles.brandLink}>
          <span className={styles.brandText}>FINDWORK</span>
          <span className={styles.workspaceBadge}>Candidate</span>
        </Link>
      </div>

      <div className={styles.headerRight}>
        <Link
          to="/jobs"
          className={styles.quickJobLink}
          aria-label="Tìm việc làm mới nhất trên sàn FINDWORK"
        >
          <Briefcase size={15} aria-hidden="true" />
          <span className={styles.quickJobText}>Tìm việc làm</span>
        </Link>

        <button
          type="button"
          onClick={toggleLocale}
          title={locale === "vi" ? "Chuyển sang Tiếng Anh (EN)" : "Switch to Vietnamese (VI)"}
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: "1px solid var(--color-border, #cbd5e1)",
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.8125rem",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Globe size={14} />
          <span>{locale.toUpperCase()}</span>
        </button>

        <CandidateAccountMenu />
      </div>
    </header>
  );
};
