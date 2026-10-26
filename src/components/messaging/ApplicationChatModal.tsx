import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageSquare, Send, X, RefreshCw, CheckCheck, User, Building2 } from "lucide-react";
import {
  messagingApi,
  type ApplicationMessageDto,
} from "@/services/api/messagingApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { LoadingBlock, ui } from "@/components/ui";

interface ApplicationChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  side: "CANDIDATE" | "COMPANY";
  companyId?: string;
  title: string;
  subtitle?: string;
}

export const ApplicationChatModal = ({
  isOpen,
  onClose,
  applicationId,
  side,
  companyId,
  title,
  subtitle,
}: ApplicationChatModalProps) => {
  const [messages, setMessages] = useState<ApplicationMessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    if (!applicationId) return;
    setLoading(true);
    setError(null);
    try {
      const res =
        side === "COMPANY" && companyId
          ? await messagingApi.getCompanyMessages(companyId, applicationId, { pageSize: 100 })
          : await messagingApi.getCandidateMessages(applicationId, { pageSize: 100 });

      setMessages(res.data);

      // Auto mark read if there are unread messages
      if (res.unreadCount > 0) {
        if (side === "COMPANY" && companyId) {
          void messagingApi.markCompanyRead(companyId, applicationId);
        } else {
          void messagingApi.markCandidateRead(applicationId);
        }
      }
    } catch (err) {
      setError(toApiFailure(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchMessages();
    } else {
      setMessages([]);
      setInputText("");
      setError(null);
    }
  }, [isOpen, applicationId, side, companyId]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loading]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const body = inputText.trim();
    if (!body || sending) return;

    setSending(true);
    setError(null);
    try {
      const newMessage =
        side === "COMPANY" && companyId
          ? await messagingApi.sendCompanyMessage(companyId, applicationId, body)
          : await messagingApi.sendCandidateMessage(applicationId, body);

      setMessages((prev) => [...prev, newMessage]);
      setInputText("");
    } catch (err) {
      setError(toApiFailure(err).message);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "600px",
          height: "85vh",
          maxHeight: "720px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: side === "COMPANY" ? "#e0f2fe" : "#f0fdf4",
                color: side === "COMPANY" ? "#0284c7" : "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {side === "COMPANY" ? <User size={20} /> : <Building2 size={20} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2
                id="chat-modal-title"
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {title}
              </h2>
              {subtitle && (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "#64748b",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={fetchMessages}
              disabled={loading}
              title="Tải lại tin nhắn"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                color: "#64748b",
                borderRadius: "8px",
              }}
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Đóng hội thoại"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                color: "#64748b",
                borderRadius: "8px",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Message Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            background: "#fafafa",
          }}
        >
          {loading ? (
            <div style={{ padding: "40px 0" }}>
              <LoadingBlock rows={3} label="Đang tải tin nhắn trao đổi..." />
            </div>
          ) : error ? (
            <div
              style={{
                padding: "16px",
                backgroundColor: "#fef2f2",
                color: "#991b1b",
                borderRadius: "10px",
                fontSize: "0.9rem",
              }}
              role="alert"
            >
              {error}
            </div>
          ) : messages.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 16px",
                color: "#64748b",
              }}
            >
              <MessageSquare size={36} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
              <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Chưa có tin nhắn nào</p>
              <p style={{ margin: 0, fontSize: "0.85rem" }}>
                Hãy bắt đầu trao đổi về hồ sơ ứng tuyển này.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine =
                (side === "CANDIDATE" && m.senderRole === "CANDIDATE") ||
                (side === "COMPANY" && m.senderRole === "COMPANY");

              const isReadByOther =
                side === "CANDIDATE" ? Boolean(m.companyReadAt) : Boolean(m.candidateReadAt);

              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isMine ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    alignSelf: isMine ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: isMine
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                      backgroundColor: isMine ? "#0284c7" : "#ffffff",
                      color: isMine ? "#ffffff" : "#0f172a",
                      boxShadow: isMine
                        ? "0 2px 4px rgba(2, 132, 199, 0.2)"
                        : "0 1px 3px rgba(0, 0, 0, 0.08)",
                      border: isMine ? "none" : "1px solid #e2e8f0",
                      wordBreak: "break-word",
                      fontSize: "0.95rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {m.body}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "4px",
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                      padding: "0 4px",
                    }}
                  >
                    <span>
                      {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isMine && (
                      <span
                        title={isReadByOther ? "Đã xem" : "Đã gửi"}
                        style={{ display: "inline-flex", alignItems: "center" }}
                      >
                        <CheckCheck
                          size={14}
                          color={isReadByOther ? "#0284c7" : "#94a3b8"}
                        />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer */}
        <form
          onSubmit={handleSend}
          style={{
            padding: "14px 16px",
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            className={ui.input}
            placeholder={
              side === "COMPANY"
                ? "Nhập tin nhắn trao đổi với ứng viên..."
                : "Nhập tin nhắn gửi nhà tuyển dụng..."
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
            maxLength={4000}
            style={{ flex: 1, margin: 0, borderRadius: "24px", padding: "10px 18px" }}
          />
          <button
            type="submit"
            className={`${ui.btn} ${ui.btnPrimary}`}
            disabled={!inputText.trim() || sending}
            style={{
              borderRadius: "50%",
              width: "42px",
              height: "42px",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            title="Gửi tin nhắn"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApplicationChatModal;
