import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { AiAssistantModal } from "./AiAssistantModal";
import { useI18n } from "../../i18n/i18nStore";

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
      {/* Floating Action Button - Fixed bottom-right */}
      {!isOpen && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={t.ai.openChat}
          title={t.ai.widgetSubtitle}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          data-testid="findwork-ai-floating-trigger"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 990,
            width: 54,
            height: 54,
            borderRadius: 27,
            background: "linear-gradient(135deg, #0284c7 0%, #6366f1 100%)",
            color: "#ffffff",
            border: "none",
            boxShadow: "0 8px 24px rgba(14, 165, 233, 0.4), 0 2px 6px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
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
