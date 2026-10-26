/**
 * FINDWORK CP8B — ACCESSIBLE MODAL HOOK (WCAG AA & PRO MAX STANDARDS)
 *
 * Provides:
 * 1. Focus trap: circular Tab & Shift+Tab within container.
 * 2. Escape key listener to close modal.
 * 3. Initial focus on designated element or first focusable element.
 * 4. Focus restoration to previous active element upon close.
 * 5. Body scroll lock and clean restoration.
 */

import { useEffect, useRef, type RefObject } from "react";

interface UseModalAccessibilityOptions {
  isOpen: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  triggerRef?: RefObject<HTMLElement | null>;
  disableBodyScroll?: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalAccessibility({
  isOpen,
  onClose,
  containerRef,
  initialFocusRef,
  triggerRef,
  disableBodyScroll = true,
}: UseModalAccessibilityOptions) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(isOpen);
  const previousOverflowRef = useRef<string | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (!disableBodyScroll) return;

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
  }, [isOpen, disableBodyScroll]);

  // Capture active element before opening, manage focus trap and escape key
  useEffect(() => {
    if (!isOpen) return;

    // Record the element that had focus before the modal opened
    if (triggerRef?.current) {
      previouslyFocusedRef.current = triggerRef.current;
    } else if (document.activeElement instanceof HTMLElement) {
      previouslyFocusedRef.current = document.activeElement;
    }

    // Set initial focus
    const timer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (containerRef.current) {
        const firstFocusable = containerRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          containerRef.current.focus();
        }
      }
    }, 30);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab" && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (
            document.activeElement === firstElement ||
            !containerRef.current.contains(document.activeElement)
          ) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (
            document.activeElement === lastElement ||
            !containerRef.current.contains(document.activeElement)
          ) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        event.preventDefault();
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        } else {
          containerRef.current.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [isOpen, onClose, containerRef, initialFocusRef, triggerRef]);

  // Restore focus on close
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      const target = triggerRef?.current || previouslyFocusedRef.current;
      if (target && typeof target.focus === "function") {
        // Small delay to ensure modal DOM is unmounted or hidden
        setTimeout(() => {
          target.focus();
        }, 10);
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, triggerRef]);
}
