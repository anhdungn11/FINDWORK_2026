import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { AiAssistantModal } from "./AiAssistantModal";
import { useI18n } from "../../i18n/i18nStore";
import styles from "./FindworkAiFloatingWidget.module.css";

interface FindworkAiFloatingWidgetProps {
  contextHint?: string;
  defaultPrompt?: string;
}

export const FindworkAiFloatingWidget = ({
  contextHint,
  defaultPrompt,
}: FindworkAiFloatingWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const t = useI18n((s) => s.t);

  // Allow opening via global custom event: window.dispatchEvent(new CustomEvent("open-findwork-ai"))
  useEffect(() => {
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener("open-findwork-ai", handleOpenEvent);
    return () => window.removeEventListener("open-findwork-ai", handleOpenEvent);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Return focus to the floating trigger
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 50);
  };

  return (
    <>
      {/* Floating Action Button - Fixed bottom-right with subtle ripple/pulse animation */}
      {!isOpen && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          className={styles.floatingButton}
          aria-label={t.ai.openChat || "Trợ lý FINDWORK AI - Mở hộp thoại hỗ trợ trực tuyến"}
          title={t.ai.widgetSubtitle || "Trợ lý AI FINDWORK"}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          data-testid="findwork-ai-floating-trigger"
        >
          <Sparkles size={24} aria-hidden="true" />
        </button>
      )}

      {/* AI Assistant Modal Popup */}
      <AiAssistantModal
        isOpen={isOpen}
        onClose={handleClose}
        contextHint={contextHint}
        defaultPrompt={defaultPrompt}
      />
    </>
  );
};

export default FindworkAiFloatingWidget;
