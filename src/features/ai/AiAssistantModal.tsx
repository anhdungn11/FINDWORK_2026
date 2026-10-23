import { useEffect, useRef, useState, type FormEvent } from "react";
import { Sparkles, Send, Trash2, X, AlertCircle, Bot, User } from "lucide-react";
import { ui } from "../../components/ui";
import {
  type ChatMessage,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  sendChatMessage,
  AiProviderUnavailableError,
} from "./aiChatApi";

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextHint?: string;
}

const SUGGESTED_PROMPTS = [
  "Gợi ý 5 câu hỏi phỏng vấn vị trí Senior React Developer",
  "Cách cấu trúc bản mô tả công việc (JD) thu hút ứng viên",
  "Quy chuẩn quy trình xét duyệt ứng viên từ Sơ tuyển tới Offer",
];

export const AiAssistantModal = ({ isOpen, onClose, contextHint }: AiAssistantModalProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [providerNotice, setProviderNotice] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMessages(loadChatHistory());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleSend = async (textToSend?: string) => {
    const content = (textToSend ?? input).trim();
    if (!content || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    saveChatHistory(nextMessages);
    setInput("");
    setLoading(true);
    setProviderNotice(null);

    try {
      const { reply } = await sendChatMessage(
        nextMessages.map((m) => ({ role: m.role, content: m.content }))
      );
      const assistantMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        status: "sent",
      };
      const finalMsgs = [...nextMessages, assistantMsg];
      setMessages(finalMsgs);
      saveChatHistory(finalMsgs);
    } catch (err: unknown) {
      if (err instanceof AiProviderUnavailableError) {
        setProviderNotice(
          "Dịch vụ AI Provider chưa được kích hoạt trên Backend (HTTP 503). Tin nhắn đã lưu vào lịch sử cục bộ."
        );
      } else {
        setProviderNotice("Không thể kết nối dịch vụ AI. Vui lòng kiểm tra lại mạng.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    clearChatHistory();
    setMessages([]);
    setProviderNotice(null);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-assistant-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          height: "100%",
          backgroundColor: "#ffffff",
          boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.12)",
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: "var(--color-primary, #4f6ef7)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h2 id="ai-assistant-title" style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                Trợ lý tuyển dụng AI
              </h2>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary, #64748b)" }}>
                Hỗ trợ viết JD, gợi ý câu hỏi & phân tích hồ sơ
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {messages.length > 0 && (
              <button
                type="button"
                className={ui.btn}
                style={{ padding: "6px 8px", fontSize: "0.75rem" }}
                title="Xóa lịch sử trò chuyện"
                onClick={handleClear}
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="button"
              className={ui.btn}
              style={{ padding: "6px 8px" }}
              aria-label="Đóng trợ lý AI"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Honest Integration Notice */}
        <div
          style={{
            padding: "10px 16px",
            backgroundColor: "#fffbeb",
            borderBottom: "1px solid #fef3c7",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            fontSize: "0.8rem",
            color: "#92400e",
          }}
          role="note"
        >
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Chế độ xem trước giao diện:</strong> Dịch vụ LLM API từ nhà cung cấp (Gemini/OpenAI) đang chuẩn bị tích hợp trên máy chủ Backend. Lịch sử hội thoại được bảo toàn cục bộ trên trình duyệt.
          </span>
        </div>

        {/* Context Hint */}
        {contextHint && (
          <div style={{ padding: "6px 16px", background: "#f8fafc", fontSize: "0.75rem", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>
            Ngữ cảnh: <strong>{contextHint}</strong>
          </div>
        )}

        {/* Message Thread */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {messages.length === 0 ? (
            <div style={{ margin: "auto 0", textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: "#eff6ff",
                  color: "var(--color-primary, #4f6ef7)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Bot size={28} />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: "0.9375rem", fontWeight: 600 }}>
                Tôi có thể giúp gì cho tuyển dụng hôm nay?
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: "0.8125rem", color: "#64748b", maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
                Chọn một câu hỏi gợi ý bên dưới hoặc nhập câu hỏi trực tiếp vào khung chat.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "#334155",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-primary, #4f6ef7)";
                      e.currentTarget.style.backgroundColor = "#f4f7ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                    }}
                    onClick={() => handleSend(prompt)}
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 8,
                      maxWidth: "85%",
                      flexDirection: isUser ? "row-reverse" : "row",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        backgroundColor: isUser ? "#e2e8f0" : "var(--color-primary, #4f6ef7)",
                        color: isUser ? "#475569" : "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: "0.75rem",
                      }}
                    >
                      {isUser ? <User size={14} /> : <Bot size={14} />}
                    </div>

                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        backgroundColor: isUser ? "var(--color-primary, #4f6ef7)" : "#f1f5f9",
                        color: isUser ? "#ffffff" : "#1e293b",
                        fontSize: "0.875rem",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "#94a3b8",
                      marginTop: 4,
                      paddingLeft: isUser ? 0 : 34,
                      paddingRight: isUser ? 34 : 0,
                    }}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              );
            })
          )}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: "0.8125rem" }}>
              <Bot size={16} />
              <span>Đang kết nối tới mô hình AI...</span>
            </div>
          )}

          {providerNotice && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                backgroundColor: "#fef2f2",
                border: "1px solid #fee2e2",
                color: "#b91c1c",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              role="alert"
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{providerNotice}</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid var(--color-border, #e2e8f0)",
            backgroundColor: "#ffffff",
          }}
        >
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: "flex", gap: 8, alignItems: "flex-end" }}
          >
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              placeholder="Nhập yêu cầu trợ giúp (Shift + Enter để xuống dòng)..."
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-border, #cbd5e1)",
                fontSize: "0.875rem",
                resize: "none",
                fontFamily: "inherit",
                lineHeight: 1.4,
              }}
            />
            <button
              type="submit"
              className={`${ui.btn} ${ui.btnPrimary}`}
              disabled={!input.trim() || loading}
              style={{ height: 42, padding: "0 14px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <Send size={15} />
            </button>
          </form>
          <span style={{ display: "block", marginTop: 6, fontSize: "0.7rem", color: "#94a3b8" }}>
            Nhấn Enter để gửi tin. FINDWORK AI không lưu trữ bí mật kinh doanh nhạy cảm.
          </span>
        </div>
      </div>
    </div>
  );
};
