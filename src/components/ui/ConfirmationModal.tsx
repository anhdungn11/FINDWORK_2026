import { useEffect, type ReactNode } from "react";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { ui } from "./index";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary" | "warning";
  loading?: boolean;
  disabled?: boolean;
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy bỏ",
  tone = "primary",
  loading = false,
  disabled = false,
}: ConfirmationModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const toneIcon =
    tone === "danger" ? (
      <AlertTriangle size={24} color="var(--color-danger, #ef4444)" />
    ) : tone === "warning" ? (
      <AlertCircle size={24} color="var(--color-warning, #f59e0b)" />
    ) : (
      <Info size={24} color="var(--color-primary, #4f6ef7)" />
    );

  const confirmBtnClass =
    tone === "danger"
      ? `${ui.btn} ${ui.btnDanger || ""}`
      : `${ui.btn} ${ui.btnPrimary || ""}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(2px)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        style={{
          background: "var(--color-surface, #ffffff)",
          borderRadius: 12,
          maxWidth: 480,
          width: "100%",
          padding: 24,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Đóng hộp thoại"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            color: "var(--color-text-secondary, #64748b)",
            padding: 4,
            display: "inline-flex",
            borderRadius: 6,
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ flexShrink: 0, marginTop: 2 }}>{toneIcon}</div>
          <div style={{ flex: 1 }}>
            <h3
              id="confirm-modal-title"
              style={{
                margin: "0 0 8px",
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "var(--color-text-primary, #1e293b)",
              }}
            >
              {title}
            </h3>
            <div
              style={{
                fontSize: "0.875rem",
                lineHeight: 1.55,
                color: "var(--color-text-secondary, #475569)",
              }}
            >
              {description}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid var(--color-border, #e2e8f0)",
          }}
        >
          <button
            type="button"
            className={ui.btn}
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmBtnClass}
            style={tone === "danger" ? { background: "#dc2626", color: "#ffffff", borderColor: "#dc2626" } : undefined}
            onClick={onConfirm}
            disabled={loading || disabled}
          >
            {loading ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
