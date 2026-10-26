import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Sparkles,
  CreditCard,
  Send,
  Trash2,
  X,
  AlertCircle,
  Bot,
  User,
  Maximize2,
  Minimize2,
  Paperclip,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RefreshCw,
  Plus,
  MessageSquare,
  ShieldCheck,
  Info,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import {
  type ChatMessage,
  type AiConversation,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  createAiConversation,
  listAiConversations,
  getAiConversationMessages,
  deleteAiConversation,
  sendAiMessage,
  transcribeAudio,
  getStoredGuestSession,
  getOrCreateGuestSession,
  AiProviderUnavailableError,
  AiRateLimitError,
  AiInputBlockedError,
} from "./aiChatApi";
import { encodeWav, resampleTo16kMono } from "./audioUtils";
import { useI18n } from "../../i18n/i18nStore";
import { AiMarkdownMessage } from "./components/AiMarkdownMessage";
import styles from "./AiAssistantModal.module.css";
import {
  VI_CATEGORIES,
  EN_CATEGORIES,
  type PromptCategory,
  type CategoryMeta,
} from "./aiCategories";

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextHint?: string;
  defaultPrompt?: string;
}

export const AiAssistantModal = ({
  isOpen,
  onClose,
  contextHint,
  defaultPrompt,
}: AiAssistantModalProps) => {
  const { user } = useAuthStore();
  const isAuthenticated = Boolean(user);
  const t = useI18n((s) => s.t);
  const locale = useI18n((s) => s.locale);
  const categories: CategoryMeta[] = locale === "en" ? EN_CATEGORIES : VI_CATEGORIES;

  // Layout & UI mode
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PromptCategory>("ALL");

  // Chat conversation state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [input, setInput] = useState(defaultPrompt || "");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Vision / Image state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioTranscribing, setAudioTranscribing] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const audioSamplesRef = useRef<Float32Array[]>([]);

  // Speech synthesis
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Scroll & focus refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load / init on open
  useEffect(() => {
    if (!isOpen) return;

    if (defaultPrompt) {
      setInput(defaultPrompt);
    }

    // Initialize or re-fetch conversations
    const initChat = async () => {
      try {
        if (!isAuthenticated) {
          await getOrCreateGuestSession();
        }
        const list = await listAiConversations();
        setConversations(list);

        if (list.length > 0 && !conversationId) {
          // Select newest conversation
          const newest = list[0];
          setConversationId(newest.id);
          const backendMsgs = await getAiConversationMessages(newest.id);
          if (backendMsgs.length > 0) {
            setMessages(
              backendMsgs.map((m) => ({
                id: m.id,
                role: m.role === "USER" ? "user" : "assistant",
                content: m.content,
                timestamp: new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                status: "sent",
              }))
            );
            return;
          }
        } else if (list.length === 0 && !conversationId) {
          // Automatically create initial conversation
          try {
            const conv = await createAiConversation();
            setConversationId(conv.id);
            setConversations([conv]);
          } catch {
            // Backend AI may be offline or unconfigured; fallback to local history
          }
        }
      } catch {
        // Fallback to local storage
      }
      setMessages(loadChatHistory());
    };

    initChat();
    setTimeout(() => textareaRef.current?.focus(), 150);
  }, [isOpen, isAuthenticated]);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, loading]);

  // Clean image preview URL on unmount/change
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Stop recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isRecording) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose, isRecording]);

  /* =========================================================================
   * Actions: Start New Conversation & History
   * ========================================================================= */
  const handleStartNewConversation = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const conv = await createAiConversation();
      setConversationId(conv.id);
      setConversations((prev) => [conv, ...prev]);
      setMessages([]);
      clearChatHistory();
    } catch (err: any) {
      // Offline fallback: reset local state
      setConversationId(null);
      setMessages([]);
      clearChatHistory();
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleSelectConversation = async (conv: AiConversation) => {
    setConversationId(conv.id);
    setLoading(true);
    setErrorMessage(null);
    try {
      const backendMsgs = await getAiConversationMessages(conv.id);
      setMessages(
        backendMsgs.map((m) => ({
          id: m.id,
          role: m.role === "USER" ? "user" : "assistant",
          content: m.content,
          timestamp: new Date(m.createdAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "sent",
        }))
      );
      setShowHistorySidebar(false);
    } catch (err: any) {
      setErrorMessage("Không thể tải tin nhắn của cuộc trò chuyện đã chọn.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteAiConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (conversationId === convId) {
        if (remaining.length > 0) {
          handleSelectConversation(remaining[0]);
        } else {
          setConversationId(null);
          setMessages([]);
          clearChatHistory();
        }
      }
    } catch {
      // Ignore
    }
  };

  /* =========================================================================
   * Actions: Send Message
   * ========================================================================= */
  const handleSend = async (textToSend?: string) => {
    const content = (textToSend ?? input).trim();
    if ((!content && !selectedImage) || loading) return;

    const currentImage = selectedImage;
    const currentImageUrl = imagePreviewUrl;

    // Reset composer state immediately
    setInput("");
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setErrorMessage(null);

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: content || "(Đã đính kèm ảnh)",
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      status: "sending",
      imageUrl: currentImageUrl || undefined,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    saveChatHistory(nextMessages);
    setLoading(true);

    try {
      let activeConvId = conversationId;
      if (!activeConvId) {
        try {
          const conv = await createAiConversation();
          activeConvId = conv.id;
          setConversationId(conv.id);
          setConversations((prev) => [conv, ...prev]);
        } catch {
          // Cannot create conversation, throw to error handling
          throw new AiProviderUnavailableError();
        }
      }

      const res = await sendAiMessage(activeConvId, content, currentImage);

      const assistantMsg: ChatMessage = {
        id: res.assistant.id || `ast-${Date.now()}`,
        role: "assistant",
        content: res.assistant.content,
        timestamp: new Date(res.assistant.createdAt || Date.now()).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "sent",
      };

      const finalMsgs = [...nextMessages.filter((m) => m.id !== userMsg.id), { ...userMsg, status: "sent" as const }, assistantMsg];
      setMessages(finalMsgs);
      saveChatHistory(finalMsgs);
    } catch (err: unknown) {
      const updatedUserMsg: ChatMessage = {
        ...userMsg,
        status: "error",
      };
      setMessages([...nextMessages.filter((m) => m.id !== userMsg.id), updatedUserMsg]);

      if (err instanceof AiProviderUnavailableError) {
        setErrorMessage(err.message);
      } else if (err instanceof AiRateLimitError) {
        setErrorMessage(err.message);
      } else if (err instanceof AiInputBlockedError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          (err as Error)?.message ||
            "Dịch vụ AI chưa thể xử lý yêu cầu lúc này. Vui lòng kiểm tra kết nối mạng và thử lại."
        );
      }
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleRetryMessage = (msg: ChatMessage) => {
    const remaining = messages.filter((m) => m.id !== msg.id);
    setMessages(remaining);
    saveChatHistory(remaining);
    void handleSend(msg.content);
  };

  /* =========================================================================
   * Actions: Image Handling
   * ========================================================================= */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMessage("Chỉ hỗ trợ file ảnh định dạng JPEG, PNG hoặc WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Dung lượng ảnh đính kèm không được vượt quá 2MB.");
      return;
    }

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    const url = URL.createObjectURL(file);
    setSelectedImage(file);
    setImagePreviewUrl(url);
    setErrorMessage(null);
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* =========================================================================
   * Actions: Audio Recording & Transcription
   * ========================================================================= */
  const handleToggleRecord = async () => {
    if (isRecording) {
      stopRecordingAndTranscribe();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      mediaStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      // Use standard ScriptProcessor or AudioWorklet fallback for Float32 PCM capturing
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      audioSamplesRef.current = [];

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioSamplesRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 58) {
            // Auto stop at max 60 seconds
            stopRecordingAndTranscribe();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMessage(
        "Không thể truy cập microphone. Vui lòng cấp quyền cho trình duyệt trong phần Cài đặt quyền riêng tư."
      );
    }
  };

  const stopRecordingAndTranscribe = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    // Combine audio samples
    const chunks = audioSamplesRef.current;
    if (chunks.length === 0) return;

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const combinedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combinedSamples.set(chunk, offset);
      offset += chunk.length;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }

    try {
      setAudioTranscribing(true);
      const wavBlob = encodeWav(combinedSamples, 16000);
      const { text } = await transcribeAudio(wavBlob);
      if (text) {
        setInput((prev) => (prev ? `${prev} ${text.trim()}` : text.trim()));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Không thể nhận diện giọng nói.");
    } finally {
      setAudioTranscribing(false);
      textareaRef.current?.focus();
    }
  };

  /* =========================================================================
   * Actions: Text-to-Speech & Copy
   * ========================================================================= */
  const handleSpeak = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setErrorMessage("Trình duyệt hiện tại không hỗ trợ phát âm thanh qua Web Speech API.");
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyText = (msgId: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (!isOpen) return null;

  const activeCategoryMeta = categories.find((c) => c.key === activeCategory) || categories[0];
  const guestSession = !isAuthenticated ? getStoredGuestSession() : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-assistant-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`${styles.overlay} ${isExpanded ? styles.overlayExpanded : styles.overlayFloating}`}
    >
      <div
        className={`${styles.container} ${isExpanded ? styles.containerExpanded : styles.containerFloating}`}
      >
        {/* ================= HEADER ================= */}
        <header
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.4)",
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2
                  id="ai-assistant-title"
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {user?.accountType === "EMPLOYER"
                    ? "BUSINESS AI"
                    : user?.accountType === "CANDIDATE"
                    ? "CANDIDATE PRO AI"
                    : "FINDWORK AI"}
                </h2>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 999,
                    backgroundColor: user?.accountType === "EMPLOYER" ? "rgba(99, 102, 241, 0.25)" : "rgba(14, 165, 233, 0.2)",
                    color: user?.accountType === "EMPLOYER" ? "#a5b4fc" : "#38bdf8",
                    border: user?.accountType === "EMPLOYER" ? "1px solid rgba(165, 180, 252, 0.3)" : "1px solid rgba(56, 189, 248, 0.3)",
                  }}
                >
                  {user?.accountType === "EMPLOYER"
                    ? "Doanh nghiệp (Company-scoped)"
                    : user?.accountType === "CANDIDATE"
                    ? "Ứng viên (Candidate Pro)"
                    : "Gói Miễn Phí"}
                </span>
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: "#94a3b8",
                  margin: "2px 0 0",
                }}
              >
                {user?.accountType === "EMPLOYER"
                  ? `Không gian tuyển dụng doanh nghiệp (${user?.email})`
                  : user?.accountType === "CANDIDATE"
                  ? `Trợ lý sự nghiệp & CV cá nhân (${user?.email})`
                  : "Chế độ Khách (Guest Session — Không bắt buộc tài khoản)"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Pricing / Product Tier Button */}
            <button
              type="button"
              onClick={() => setShowPricingModal((prev) => !prev)}
              title="Xem thông tin các gói sản phẩm AI & lộ trình"
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                backgroundColor: showPricingModal ? "rgba(14, 165, 233, 0.3)" : "rgba(255, 255, 255, 0.08)",
                color: "#f8fafc",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <CreditCard size={14} />
              <span>Gói AI</span>
            </button>

            {/* New Conversation Button */}
            <button
              type="button"
              onClick={handleStartNewConversation}
              disabled={loading}
              title="Cuộc trò chuyện mới"
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                color: "#f8fafc",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <Plus size={14} />
              <span>Mới</span>
            </button>

            {/* History Toggle */}
            <button
              type="button"
              onClick={() => setShowHistorySidebar((prev) => !prev)}
              title="Lịch sử cuộc trò chuyện"
              style={{
                padding: 6,
                borderRadius: 6,
                border: "none",
                backgroundColor: showHistorySidebar ? "rgba(255, 255, 255, 0.2)" : "transparent",
                color: "#cbd5e1",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageSquare size={16} />
            </button>

            {/* Expand / Minimize Toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              title={isExpanded ? "Thu nhỏ lại góc màn hình" : "Mở rộng toàn màn hình"}
              style={{
                padding: 6,
                borderRadius: 6,
                border: "none",
                backgroundColor: "transparent",
                color: "#cbd5e1",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Đóng trợ lý AI"
              style={{
                padding: 6,
                borderRadius: 6,
                border: "none",
                backgroundColor: "transparent",
                color: "#cbd5e1",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ================= SUB-BANNER FOR GUEST / CONTEXT ================= */}
        {!isAuthenticated && (
          <div
            style={{
              padding: "6px 12px",
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #f1f5f9",
              fontSize: 11,
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={13} color="#059669" />
              <span>Phiên khách bảo mật — Dữ liệu phiên không gắn với danh tính tài khoản</span>
            </div>
            {guestSession && (
              <span style={{ fontSize: 10, color: "#94a3b8" }}>
                Hạn phiên: {new Date(guestSession.expiresAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        )}

        {/* ================= PRICING / PRODUCT ROADMAP VIEW ================= */}
        {showPricingModal && (
          <div
            style={{
              padding: "16px 20px",
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              overflowY: "auto",
              maxHeight: "60vh",
              zIndex: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                  Bảng giá & Phân biệt Sản phẩm AI FINDWORK
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                  Minh bạch tuyệt đối: Thanh toán trực tuyến đang trong lộ trình phát triển.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPricingModal(false)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Đóng
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              {/* Free Plan */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Gói Cơ Bản (Free)</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 999, backgroundColor: "#dcfce7", color: "#15803d" }}>
                    Khả dụng
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>0đ</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
                  <li>Tra cứu thông tin tuyển dụng FINDWORK</li>
                  <li>Cẩm nang gợi ý phỏng vấn chung</li>
                  <li>Dành cho cả tài khoản Khách & Đăng ký</li>
                </ul>
                <div style={{ marginTop: "auto", paddingTop: 8 }}>
                  <button
                    type="button"
                    disabled
                    style={{
                      width: "100%",
                      padding: "6px 0",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    Đang áp dụng
                  </button>
                </div>
              </div>

              {/* Candidate AI Pro */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #bae6fd",
                  backgroundColor: "#f0f9ff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0369a1" }}>Candidate AI Pro</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 999, backgroundColor: "#e0f2fe", color: "#0284c7" }}>
                    Lộ trình P1
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0369a1" }}>Sắp ra mắt <span style={{ fontSize: 11, fontWeight: 400, color: "#0284c7" }}>(Mức giá dự kiến chưa phê duyệt)</span></div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#0369a1", lineHeight: 1.6 }}>
                  <li>Tối ưu bố cục CV theo chuẩn ATS</li>
                  <li>Phân tích mức độ phù hợp với JD</li>
                  <li>Luyện phỏng vấn chuyên sâu cá nhân hóa</li>
                  <li>Không áp dụng cho tài khoản Doanh nghiệp</li>
                </ul>
                <div style={{ marginTop: "auto", paddingTop: 8 }}>
                  <button
                    type="button"
                    disabled
                    title="Cổng thanh toán chưa kích hoạt"
                    style={{
                      width: "100%",
                      padding: "6px 0",
                      borderRadius: 6,
                      border: "1px dashed #7dd3fc",
                      backgroundColor: "#e0f2fe",
                      color: "#0369a1",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "not-allowed",
                    }}
                  >
                    Chưa mở bán (Thanh toán chưa khả dụng)
                  </button>
                </div>
              </div>

              {/* Employer Business AI */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #c7d2fe",
                  backgroundColor: "#eef2ff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#4338ca" }}>Employer Business AI</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 999, backgroundColor: "#e0e7ff", color: "#4f46e5" }}>
                    Lộ trình P1
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#4338ca" }}>Sắp ra mắt <span style={{ fontSize: 11, fontWeight: 400, color: "#6366f1" }}>(Mức giá dự kiến chưa phê duyệt)</span></div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#4338ca", lineHeight: 1.6 }}>
                  <li>Tự động soạn thảo JD chuẩn ngành</li>
                  <li>Sinh bộ câu hỏi sàng lọc ứng viên</li>
                  <li>Phân quyền theo tổ chức doanh nghiệp</li>
                  <li>Độc lập, không dùng chung với gói Ứng viên</li>
                </ul>
                <div style={{ marginTop: "auto", paddingTop: 8 }}>
                  <button
                    type="button"
                    disabled
                    title="Cổng thanh toán chưa kích hoạt"
                    style={{
                      width: "100%",
                      padding: "6px 0",
                      borderRadius: 6,
                      border: "1px dashed #a5b4fc",
                      backgroundColor: "#e0e7ff",
                      color: "#4338ca",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "not-allowed",
                    }}
                  >
                    Chưa mở bán (Thanh toán chưa khả dụng)
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, backgroundColor: "#fffbeb", border: "1px solid #fde68a", fontSize: 11, color: "#92400e" }}>
              <strong>Lưu ý minh bạch:</strong> Bảng giá trên chỉ mang tính chất minh họa theo đề xuất lộ trình P1 và CHƯA được ban hành chính thức. FINDWORK không kích hoạt cổng thanh toán hay tạo giao dịch giả mạo khi chưa có phê duyệt chính thức.
            </div>
          </div>
        )}

        {/* ================= MAIN CONTENT (CHAT + OPTIONAL HISTORY) ================= */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
          {/* History Sidebar */}
          {showHistorySidebar && (
            <div
              style={{
                width: 240,
                borderRight: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#475569",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                Các phiên trò chuyện
              </div>
              {conversations.length === 0 ? (
                <div style={{ padding: 16, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
                  Chưa có phiên trò chuyện nào được lưu.
                </div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c)}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: conversationId === c.id ? "#e2e8f0" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: conversationId === c.id ? 600 : 400,
                          color: "#1e293b",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        Hội thoại {c.id.slice(0, 8)}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>
                        {new Date(c.updatedAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      title="Xóa phiên này"
                      style={{
                        padding: 4,
                        border: "none",
                        backgroundColor: "transparent",
                        color: "#94a3b8",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Chat Messages + Prompts */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              backgroundColor: "#ffffff",
            }}
          >
            {/* Category Pills */}
            <div className={styles.categoryPillsScroll}>
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={styles.categoryPill}
                  style={{
                    fontWeight: activeCategory === cat.key ? 600 : 500,
                    border: "1px solid",
                    borderColor: activeCategory === cat.key ? "#0ea5e9" : "#e2e8f0",
                    backgroundColor: activeCategory === cat.key ? "#f0f9ff" : "#ffffff",
                    color: activeCategory === cat.key ? "#0369a1" : "#64748b",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Message Scroll Area */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    margin: "auto 0",
                    textAlign: "center",
                    padding: "24px 16px",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      backgroundColor: "#f0f9ff",
                      color: "#0ea5e9",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Sparkles size={28} />
                  </div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#0f172a",
                      margin: "0 0 6px",
                    }}
                  >
                    Xin chào! Tôi có thể giúp gì cho bạn hôm nay?
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#64748b",
                      maxWidth: 420,
                      margin: "0 auto 16px",
                      lineHeight: 1.5,
                    }}
                  >
                    Hỗ trợ tối ưu CV, câu hỏi phỏng vấn, tư vấn nghề nghiệp, viết thư ứng tuyển hoặc giải đáp quy trình nhà tuyển dụng trên FINDWORK.
                  </p>

                  {/* Suggested Prompts Grid */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      maxWidth: 440,
                      margin: "0 auto",
                      textAlign: "left",
                    }}
                  >
                    {activeCategoryMeta.prompts.map((prompt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f8fafc",
                          color: "#1e293b",
                          fontSize: 12.5,
                          lineHeight: 1.4,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f0f9ff";
                          e.currentTarget.style.borderColor = "#bae6fd";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#f8fafc";
                          e.currentTarget.style.borderColor = "#e2e8f0";
                        }}
                      >
                        <span>{prompt}</span>
                        <Send size={12} color="#0ea5e9" style={{ flexShrink: 0, marginLeft: 8 }} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isUser ? "flex-end" : "flex-start",
                        gap: 4,
                      }}
                    >
                      <div
                        className={styles.messageBubbleContainer}
                        style={{
                          flexDirection: isUser ? "row-reverse" : "row",
                        }}
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            backgroundColor: isUser ? "#0284c7" : "#0f172a",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {isUser ? <User size={15} /> : <Sparkles size={15} />}
                        </div>

                        {/* Bubble */}
                        <div className={isUser ? styles.userBubble : styles.assistantBubble}>
                          {/* Attached image preview */}
                          {m.imageUrl && (
                            <div style={{ marginBottom: 8, borderRadius: 8, overflow: "hidden" }}>
                              <img
                                src={m.imageUrl}
                                alt="Đính kèm"
                                style={{ maxWidth: "100%", maxHeight: 200, display: "block" }}
                              />
                            </div>
                          )}

                          {isUser ? (
                            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                              {m.content}
                            </div>
                          ) : (
                            <AiMarkdownMessage content={m.content} isUser={false} />
                          )}
                        </div>
                      </div>

                      {/* Message Actions / Meta */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 10,
                          color: "#94a3b8",
                          marginRight: isUser ? 36 : 0,
                          marginLeft: isUser ? 0 : 36,
                        }}
                      >
                        <span>{m.timestamp}</span>
                        {m.status === "sending" && <span>• Đang gửi...</span>}
                        {m.status === "error" && (
                          <>
                            <span style={{ color: "#ef4444" }}>• Chưa gửi được</span>
                            <button
                              type="button"
                              className={styles.retryBtn}
                              onClick={() => handleRetryMessage(m)}
                              title="Thử gửi lại tin nhắn này"
                            >
                              <RefreshCw size={10} />
                              Thử lại
                            </button>
                          </>
                        )}

                        {!isUser && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSpeak(m.id, m.content)}
                              title="Nghe câu trả lời"
                              style={{
                                border: "none",
                                background: "none",
                                color: speakingMessageId === m.id ? "#0284c7" : "#94a3b8",
                                cursor: "pointer",
                                padding: 2,
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              {speakingMessageId === m.id ? (
                                <VolumeX size={12} />
                              ) : (
                                <Volume2 size={12} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyText(m.id, m.content)}
                              title="Sao chép nội dung"
                              style={{
                                border: "none",
                                background: "none",
                                color: copiedId === m.id ? "#059669" : "#94a3b8",
                                cursor: "pointer",
                                padding: 2,
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              {copiedId === m.id ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Loading Indicator */}
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 36 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: "#0f172a",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Sparkles size={14} />
                  </div>
                  <div
                    style={{
                      padding: "8px 14px",
                      borderRadius: "16px 16px 16px 4px",
                      backgroundColor: "#f1f5f9",
                      fontSize: 12,
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <RefreshCw size={12} className="animate-spin" />
                    <span>FINDWORK AI đang xử lý câu trả lời...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error / Provider Notice Banner */}
            {errorMessage && (
              <div
                style={{
                  margin: "0 12px 8px",
                  padding: "10px 12px",
                  borderRadius: 8,
                  backgroundColor: "#fff7ed",
                  border: "1px solid #fed7aa",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 12,
                  color: "#9a3412",
                  lineHeight: 1.4,
                }}
              >
                <AlertCircle size={16} color="#ea580c" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>{errorMessage}</div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  style={{
                    border: "none",
                    background: "none",
                    color: "#9a3412",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Audio Recording Live State */}
            {isRecording && (
              <div
                style={{
                  margin: "0 12px 8px",
                  padding: "8px 12px",
                  borderRadius: 8,
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#991b1b",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#ef4444",
                      boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.2)",
                    }}
                  />
                  <span>Đang ghi âm: {recordingSeconds}s / 60s (WAV 16kHz)</span>
                </div>
                <button
                  type="button"
                  onClick={stopRecordingAndTranscribe}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    backgroundColor: "#ef4444",
                    color: "#ffffff",
                    border: "none",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Dừng & Chuyển thành chữ
                </button>
              </div>
            )}

            {/* Audio Transcription In-Progress */}
            {audioTranscribing && (
              <div
                style={{
                  margin: "0 12px 8px",
                  padding: "8px 12px",
                  borderRadius: 8,
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "#1e40af",
                }}
              >
                <RefreshCw size={13} className="animate-spin" />
                <span>Đang gửi file âm thanh tới Backend nhận dạng (POST /ai/transcriptions)...</span>
              </div>
            )}

            {/* Image Preview before sending */}
            {imagePreviewUrl && (
              <div
                style={{
                  margin: "0 12px 8px",
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <img
                  src={imagePreviewUrl}
                  alt="Ảnh xem trước"
                  style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#1e293b",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {selectedImage?.name}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>
                    {selectedImage ? `${(selectedImage.size / 1024).toFixed(0)} KB` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  title="Hủy đính kèm ảnh"
                  style={{
                    padding: 4,
                    border: "none",
                    backgroundColor: "transparent",
                    color: "#94a3b8",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* ================= COMPOSER ================= */}
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                handleSend();
              }}
              style={{
                padding: "8px 12px 12px",
                borderTop: "1px solid #f1f5f9",
                backgroundColor: "#ffffff",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 6,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  padding: "6px 8px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                {/* Hidden File Input for Image */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handleImageSelect}
                />

                {/* Attach Image Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Đính kèm ảnh (JPEG, PNG, WebP <= 2MB)"
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    border: "none",
                    backgroundColor: selectedImage ? "#e0f2fe" : "transparent",
                    color: selectedImage ? "#0284c7" : "#64748b",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Paperclip size={16} />
                </button>

                {/* Microphone Record Button */}
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  title={isRecording ? "Dừng ghi âm" : "Nói để nhập văn bản (Mic)"}
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    border: "none",
                    backgroundColor: isRecording ? "#fef2f2" : "transparent",
                    color: isRecording ? "#ef4444" : "#64748b",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                  placeholder={
                    locale === "en"
                      ? "Type your question or request... (Shift + Enter for new line)"
                      : "Nhập câu hỏi của bạn... (Shift + Enter để xuống dòng)"
                  }
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    resize: "none",
                    fontSize: 13,
                    lineHeight: 1.4,
                    color: "#0f172a",
                    padding: "4px 2px",
                    fontFamily: "inherit",
                  }}
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={loading || (!input.trim() && !selectedImage)}
                  title={t.ai.send}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    backgroundColor:
                      loading || (!input.trim() && !selectedImage) ? "#e2e8f0" : "#0284c7",
                    color: loading || (!input.trim() && !selectedImage) ? "#94a3b8" : "#ffffff",
                    cursor:
                      loading || (!input.trim() && !selectedImage) ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Send size={15} />
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "#94a3b8",
                  padding: "0 2px",
                }}
              >
                <span>AI có thể tạo thông tin không chuẩn xác. Hãy kiểm tra các quy chuẩn pháp lý.</span>
                <span>{input.length}/4000</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
