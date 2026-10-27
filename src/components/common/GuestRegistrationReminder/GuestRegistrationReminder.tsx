import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import styles from "./GuestRegistrationReminder.module.css";

export const GUEST_REMINDER_SESSION_KEY = "findwork_guest_reminder_dismissed";

const EXCLUDED_PATH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/company-invitations",
  "/employer/login",
  "/employer/register",
  "/candidate",
  "/employer",
  "/admin",
  "/cv",
];

export interface GuestRegistrationReminderProps {
  /**
   * Delay in milliseconds before triggering the reminder.
   * Defaults to 45000 (45 seconds of browsing).
   */
  delayMs?: number;
}

export const GuestRegistrationReminder = ({
  delayMs = 45000,
}: GuestRegistrationReminderProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();

  const primaryBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Check whether current route is excluded from reminder
  const isExcludedRoute = useCallback((path: string): boolean => {
    if (EXCLUDED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return true;
    }
    // Also exclude job application step paths
    if (path.includes("/apply")) {
      return true;
    }
    return false;
  }, []);

  // Check if session has already dismissed the prompt
  const isSessionDismissed = useCallback((): boolean => {
    try {
      return sessionStorage.getItem(GUEST_REMINDER_SESSION_KEY) === "true";
    } catch {
      return false;
    }
  }, []);

  const handleDismiss = useCallback(() => {
    try {
      sessionStorage.setItem(GUEST_REMINDER_SESSION_KEY, "true");
    } catch {
      // Ignore sessionStorage exceptions
    }
    setIsVisible(false);
  }, []);

  const handleRegister = useCallback(() => {
    handleDismiss();
    navigate("/register");
  }, [handleDismiss, navigate]);

  const handleLogin = useCallback(() => {
    handleDismiss();
    navigate("/login");
  }, [handleDismiss, navigate]);

  // Main timer to show reminder
  useEffect(() => {
    // If authenticated or user already exists, never show
    if (authStatus === "authenticated" || Boolean(user)) {
      setIsVisible(false);
      return;
    }

    // If dismissed in this session or on excluded route, never schedule
    if (isSessionDismissed() || isExcludedRoute(location.pathname)) {
      setIsVisible(false);
      return;
    }

    let checkTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleCheck = (delay: number) => {
      checkTimer = setTimeout(() => {
        // Re-check conditions at moment of trigger
        if (
          useAuthStore.getState().status === "authenticated" ||
          Boolean(useAuthStore.getState().user) ||
          isSessionDismissed() ||
          isExcludedRoute(window.location.pathname)
        ) {
          return;
        }

        // Safety check 1: Do not interrupt if user has an active input/textarea focus
        const activeEl = document.activeElement;
        const isFormEditing =
          activeEl &&
          (activeEl.tagName === "INPUT" ||
            activeEl.tagName === "TEXTAREA" ||
            activeEl.tagName === "SELECT" ||
            (activeEl as HTMLElement).isContentEditable);

        // Safety check 2: Do not interrupt if any modal dialog is already open
        const hasOpenModal = Boolean(
          document.querySelector('[role="dialog"], [aria-modal="true"]')
        );

        if (isFormEditing || hasOpenModal) {
          // Defer checking by 10 seconds to avoid interrupting user activity
          scheduleCheck(10000);
          return;
        }

        setIsVisible(true);
      }, delay);
    };

    scheduleCheck(delayMs);

    return () => {
      if (checkTimer) clearTimeout(checkTimer);
    };
  }, [authStatus, user, location.pathname, delayMs, isExcludedRoute, isSessionDismissed]);

  // Manage focus and Escape key when visible
  useEffect(() => {
    if (!isVisible) return;

    // Focus primary action button smoothly
    const timer = setTimeout(() => {
      primaryBtnRef.current?.focus();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, handleDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      className={styles.overlay}
      aria-label="Nhắc nhở đăng ký tài khoản"
      data-testid="guest-registration-reminder"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="guest-reminder-title"
        aria-describedby="guest-reminder-desc"
        tabIndex={-1}
        className={styles.card}
      >
        <button
          type="button"
          onClick={handleDismiss}
          className={styles.closeBtn}
          aria-label="Đóng thông báo"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className={styles.headerRow}>
          <div className={styles.iconWrapper}>
            <Sparkles size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 id="guest-reminder-title" className={styles.title}>
              Khoan đã! Bạn đã đăng ký FINDWORK chưa?
            </h2>
            <p id="guest-reminder-desc" className={styles.description}>
              Tạo tài khoản để lưu việc làm, xây dựng CV và nhận những gợi ý phù hợp hơn.
            </p>
          </div>
        </div>

        <div className={styles.actionsRow}>
          <button
            ref={primaryBtnRef}
            type="button"
            onClick={handleRegister}
            className={styles.primaryBtn}
          >
            <span>Đăng ký</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleLogin}
            className={styles.secondaryBtn}
          >
            Đăng nhập
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className={styles.dismissBtn}
          >
            Để sau
          </button>
        </div>
      </div>
    </aside>
  );
};

export default GuestRegistrationReminder;
