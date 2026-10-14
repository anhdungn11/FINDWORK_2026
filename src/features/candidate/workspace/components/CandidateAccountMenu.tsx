import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ChevronDown,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { resolveCandidateIdentity } from "../utils/workspaceIdentity";
import styles from "../styles/CandidateWorkspace.module.css";

export const CandidateAccountMenu = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const identity = resolveCandidateIdentity(user);
  const isPendingLogout = isLoggingOut || status === "loggingOut";

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key press and return focus to trigger (Disclosure Pattern)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    if (isPendingLogout) return;
    setIsLoggingOut(true);
    setErrorMessage(null);

    try {
      const success = await logout();
      if (success) {
        setIsOpen(false);
        navigate("/login", { replace: true });
      } else {
        // Server rejected or network failed during logout
        setIsLoggingOut(false);
        setErrorMessage("Không thể xác nhận đăng xuất với máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.");
      }
    } catch {
      setIsLoggingOut(false);
      setErrorMessage("Đã xảy ra lỗi không mong muốn khi đăng xuất. Vui lòng thử lại.");
    }
  };

  return (
    <div className={styles.accountMenuContainer} ref={menuRef}>
      {/* Disclosure Pattern trigger: aria-expanded and aria-controls */}
      <button
        ref={triggerRef}
        type="button"
        className={styles.accountTrigger}
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-controls="candidate-account-dropdown"
        aria-label={`Tài khoản: ${identity.displayName}`}
      >
        <div className={styles.avatarCircle} aria-hidden="true">
          {identity.initials}
        </div>
        <span className={styles.triggerName}>{identity.displayName}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`${styles.triggerChevron} ${
            isOpen ? styles.triggerChevronOpen : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          id="candidate-account-dropdown"
          className={styles.dropdownPanel}
        >
          <div className={styles.dropdownUserCard}>
            <p className={styles.dropdownUserName}>{identity.displayName}</p>
            {identity.email && (
              <p className={styles.dropdownUserEmail}>{identity.email}</p>
            )}

            <div className={styles.dropdownBadges}>
              {identity.roleLabel && (
                <span className={styles.dropdownRoleBadge}>
                  {identity.roleLabel}
                </span>
              )}
              {identity.statusLabel && (
                <span
                  className={`${styles.dropdownStatusBadge} ${
                    identity.isActive ? styles.dropdownStatusActive : ""
                  }`}
                >
                  {identity.statusLabel}
                </span>
              )}
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              style={{
                margin: "0 8px 8px",
                padding: "8px",
                fontSize: "12px",
                borderRadius: "6px",
                backgroundColor: "var(--color-danger-soft, #fee2e2)",
                color: "var(--color-danger, #ef4444)",
                lineHeight: 1.4,
              }}
            >
              {errorMessage}
            </div>
          )}

          <div className={styles.dropdownSection}>
            <Link
              to="/candidate"
              className={styles.dropdownItem}
              onClick={() => setIsOpen(false)}
            >
              <span className={styles.dropdownItemContent}>
                <LayoutDashboard size={16} aria-hidden="true" />
                <span>Bảng điều khiển</span>
              </span>
            </Link>

            <Link
              to="/candidate/profile"
              className={styles.dropdownItem}
              onClick={() => setIsOpen(false)}
              aria-label="Hồ sơ cá nhân (Chức năng đang hoàn thiện)"
            >
              <span className={styles.dropdownItemContent}>
                <UserIcon size={16} aria-hidden="true" />
                <span>Hồ sơ cá nhân</span>
              </span>
              <span className={`${styles.navBadge} ${styles.navBadgeWarning}`}>
                Đang hoàn thiện
              </span>
            </Link>

            <Link
              to="/candidate/onboarding"
              className={styles.dropdownItem}
              onClick={() => setIsOpen(false)}
            >
              <span className={styles.dropdownItemContent}>
                <Layers size={16} aria-hidden="true" />
                <span>Tiến độ hồ sơ (7 bước)</span>
              </span>
            </Link>

            <Link
              to="/cv"
              className={styles.dropdownItem}
              onClick={() => setIsOpen(false)}
            >
              <span className={styles.dropdownItemContent}>
                <FileText size={16} aria-hidden="true" />
                <span>CV của tôi</span>
              </span>
              <ArrowUpRight size={14} aria-hidden="true" style={{ opacity: 0.6 }} />
            </Link>
          </div>

          <div className={styles.dropdownDivider} />

          <div className={styles.dropdownSection}>
            <button
              type="button"
              className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
              onClick={() => void handleLogout()}
              disabled={isPendingLogout}
            >
              <span className={styles.dropdownItemContent}>
                <LogOut size={16} aria-hidden="true" />
                <span>{isPendingLogout ? "Đang đăng xuất..." : "Đăng xuất"}</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
