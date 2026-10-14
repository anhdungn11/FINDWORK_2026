import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { UserProfileWidget } from "./UserProfileWidget";
import { CandidateNavList } from "./CandidateNavList";
import styles from "../styles/CandidateWorkspace.module.css";

export interface DrawerCloseOptions {
  restoreFocus?: boolean;
}

interface CandidateMobileDrawerProps {
  isOpen: boolean;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  onClose: (options?: DrawerCloseOptions) => void;
}

export const CandidateMobileDrawer = ({
  isOpen,
  triggerRef,
  onClose,
}: CandidateMobileDrawerProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isPendingLogout = isLoggingOut || status === "loggingOut";

  // Retain DOM node during slide-out animation (250ms), then unmount completely
  const [isMounted, setIsMounted] = useState(isOpen);

  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus restoration intent tracker
  const wasOpenRef = useRef(isOpen);
  const shouldRestoreFocusRef = useRef(false);

  // Body scroll overflow backup
  const previousOverflowRef = useRef<string | null>(null);

  const handleClose = useCallback(
    (options?: DrawerCloseOptions) => {
      // Record whether focus restoration is requested before triggering close
      shouldRestoreFocusRef.current = options?.restoreFocus ?? true;
      onClose(options);
    },
    [onClose]
  );

  // Mount/unmount lifecycle with animation coordination
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
    } else {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const delay = prefersReducedMotion ? 0 : 250;

      const timer = setTimeout(() => {
        setIsMounted(false);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scrolling when drawer is open, cleanly restore previous overflow when closed or unmounted
  useEffect(() => {
    if (isOpen) {
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else if (previousOverflowRef.current !== null) {
      document.body.style.overflow = previousOverflowRef.current;
      previousOverflowRef.current = null;
    }

    return () => {
      if (previousOverflowRef.current !== null) {
        document.body.style.overflow = previousOverflowRef.current;
        previousOverflowRef.current = null;
      }
    };
  }, [isOpen]);

  // Clean up if resized to desktop (>= 1024px) while drawer is open
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleBreakpointChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches && isOpen) {
        handleClose({ restoreFocus: false });
      }
    };

    if (mediaQuery.matches && isOpen) {
      handleClose({ restoreFocus: false });
    }

    mediaQuery.addEventListener("change", handleBreakpointChange);
    return () => {
      mediaQuery.removeEventListener("change", handleBreakpointChange);
    };
  }, [isOpen, handleClose]);

  // Focus close button on open, handle Escape key and Tab focus trap
  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose({ restoreFocus: true });
        return;
      }

      if (event.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (
            document.activeElement === firstElement ||
            !drawerRef.current.contains(document.activeElement)
          ) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (
            document.activeElement === lastElement ||
            !drawerRef.current.contains(document.activeElement)
          ) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    // Prevent focus from leaking out if clicked elsewhere while open
    const handleFocusIn = (event: FocusEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        closeButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [isOpen, handleClose]);

  // Restore focus to Hamburger trigger AFTER React has committed the closed state and removed the focus trap
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      if (shouldRestoreFocusRef.current) {
        shouldRestoreFocusRef.current = false;
        if (triggerRef?.current && triggerRef.current.offsetParent !== null) {
          triggerRef.current.focus();
        }
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, triggerRef]);

  const handleDrawerLogout = async () => {
    if (isPendingLogout) return;
    setIsLoggingOut(true);
    try {
      const success = await logout();
      if (success) {
        handleClose({ restoreFocus: false });
        navigate("/login", { replace: true });
      } else {
        setIsLoggingOut(false);
      }
    } catch {
      setIsLoggingOut(false);
    }
  };

  // When completely unmounted, nothing is in the DOM (tab order & accessibility tree are 100% clean)
  if (!isMounted) {
    return null;
  }

  return (
    <>
      <div
        className={`${styles.drawerBackdrop} ${
          isOpen ? styles.drawerBackdropOpen : ""
        }`}
        onClick={() => handleClose({ restoreFocus: true })}
        aria-hidden="true"
      />

      <div
        ref={drawerRef}
        id="candidate-mobile-drawer"
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? "true" : undefined}
        aria-label={isOpen ? "Menu điều hướng ứng viên" : undefined}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={`${styles.drawerPanel} ${
          isOpen ? styles.drawerPanelOpen : ""
        }`}
      >
        <div className={styles.drawerHeader}>
          <div className={styles.brandLink}>
            <span className={styles.brandText}>FINDWORK</span>
            <span className={styles.workspaceBadge}>Candidate</span>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className={styles.drawerCloseButton}
            onClick={() => handleClose({ restoreFocus: true })}
            aria-label="Đóng menu điều hướng"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.drawerBody}>
          <div style={{ padding: "0 1rem 1rem" }}>
            <UserProfileWidget user={user} />
          </div>

          <CandidateNavList onNavigate={() => handleClose({ restoreFocus: false })} />
        </div>

        <div className={styles.drawerFooter}>
          <button
            type="button"
            className={styles.sidebarLogoutButton}
            onClick={() => void handleDrawerLogout()}
            disabled={isPendingLogout}
          >
            <LogOut size={16} aria-hidden="true" />
            <span>{isPendingLogout ? "Đang đăng xuất..." : "Đăng xuất"}</span>
          </button>
        </div>
      </div>
    </>
  );
};
