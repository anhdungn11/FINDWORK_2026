import { apiClient, getAuthToken, extractApiErrorMessage } from "../../services/http/apiClient";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  status?: "sent" | "error" | "mock_preview" | "sending";
  errorMessage?: string;
  imageUrl?: string;
}

export interface AiGuestSession {
  id: string;
  expiresAt: string;
  token: string;
}

export interface AiConversation {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiBackendMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

export interface AiSendMessageResponse {
  user: AiBackendMessage;
  assistant: AiBackendMessage;
  usage: {
    totalTokens: number;
    estimatedCostMicros: number;
  };
}

const STORAGE_KEY = "findwork.aiAssistant.history";
const GUEST_SESSION_KEY = "findwork.aiGuestSession";

/* =========================================================================
 * Client-side Storage for Local Preview / Fallback
 * ========================================================================= */

export const loadChatHistory = (): ChatMessage[] => {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveChatHistory = (messages: ChatMessage[]): void => {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  } catch {
    // Storage quota or privacy restriction
  }
};

export const clearChatHistory = (): void => {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
};

/* =========================================================================
 * Error Hierarchy
 * ========================================================================= */

export class AiProviderUnavailableError extends Error {
  readonly code = "AI_PROVIDER_UNCONFIGURED";
  readonly status = 503;

  constructor(message?: string) {
    super(
      message ||
        "Dịch vụ AI Assistant chưa được kết nối với nhà cung cấp (Gemini / OpenAI API) trên máy chủ Backend. " +
        "Hệ thống hiển thị giao diện xem trước và bảo toàn lịch sử trò chuyện trên trình duyệt của bạn."
    );
    this.name = "AiProviderUnavailableError";
  }
}

export class AiPermissionError extends Error {
  readonly code = "AI_FORBIDDEN";
  readonly status = 403;

  constructor(message?: string) {
    super(
      message ||
        "Tài khoản không có quyền sử dụng tính năng AI này (HTTP 403 Forbidden)."
    );
    this.name = "AiPermissionError";
  }
}

export class AiRateLimitError extends Error {
  readonly code: string;
  readonly status = 429;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AiRateLimitError";
    this.code = code;
  }
}

export class AiInputBlockedError extends Error {
  readonly code: string;
  readonly status = 400;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AiInputBlockedError";
    this.code = code;
  }
}

/* =========================================================================
 * Guest Session Management (Privacy-preserving, session-scoped)
 * ========================================================================= */

export const getStoredGuestSession = (): AiGuestSession | null => {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const raw = sessionStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return null;
    const parsed: AiGuestSession = JSON.parse(raw);
    if (!parsed.token || !parsed.expiresAt) return null;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const getOrCreateGuestSession = async (): Promise<AiGuestSession> => {
  const existing = getStoredGuestSession();
  if (existing) return existing;

  const res = await apiClient.post<AiGuestSession>("/ai/guest-sessions");
  const session = res.data;
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore session storage error
  }
  return session;
};

export const clearGuestSession = (): void => {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
    }
  } catch {
    // Ignore
  }
};

/**
 * Returns header config for AI endpoints:
 * If authenticated, user Bearer token is automatically attached by apiClient.
 * If guest (unauthenticated), attaches `x-findwork-guest-token`.
 */
const getAiRequestHeaders = async (): Promise<Record<string, string>> => {
  if (getAuthToken()) {
    return {};
  }
  const session = await getOrCreateGuestSession();
  return {
    "x-findwork-guest-token": session.token,
  };
};

/* =========================================================================
 * Real Backend AI Endpoints
 * ========================================================================= */

/**
 * Tạo cuộc hội thoại AI mới trên Backend
 */
export const createAiConversation = async (): Promise<AiConversation> => {
  const headers = await getAiRequestHeaders();
  try {
    const res = await apiClient.post<AiConversation>("/ai/conversations", {}, { headers });
    return res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const msg = extractApiErrorMessage(err);
    if (status === 403) {
      throw new AiPermissionError(msg || "Tài khoản không có quyền tạo cuộc hội thoại AI (HTTP 403 Forbidden).");
    }
    if (status === 503) {
      throw new AiProviderUnavailableError();
    }
    throw err;
  }
};

/**
 * Danh sách cuộc hội thoại của User (hoặc Guest Session hiện tại)
 */
export const listAiConversations = async (): Promise<AiConversation[]> => {
  try {
    const headers = await getAiRequestHeaders();
    const res = await apiClient.get<AiConversation[]>("/ai/conversations", { headers });
    return res.data || [];
  } catch {
    return [];
  }
};

/**
 * Lấy lịch sử tin nhắn của một cuộc hội thoại cụ thể
 */
export const getAiConversationMessages = async (
  conversationId: string
): Promise<AiBackendMessage[]> => {
  const headers = await getAiRequestHeaders();
  const res = await apiClient.get<AiBackendMessage[]>(
    `/ai/conversations/${encodeURIComponent(conversationId)}/messages`,
    { headers }
  );
  return res.data || [];
};

/**
 * Xóa một cuộc hội thoại
 */
export const deleteAiConversation = async (conversationId: string): Promise<boolean> => {
  try {
    const headers = await getAiRequestHeaders();
    await apiClient.delete(`/ai/conversations/${encodeURIComponent(conversationId)}`, { headers });
    return true;
  } catch {
    return false;
  }
};

/**
 * Gửi tin nhắn tới FINDWORK AI (kèm ảnh tùy chọn)
 */
export const sendAiMessage = async (
  conversationId: string,
  content: string,
  imageFile?: File | null
): Promise<AiSendMessageResponse> => {
  const headers = await getAiRequestHeaders();

  let body: FormData | { content: string };
  if (imageFile) {
    const fd = new FormData();
    fd.append("content", content);
    fd.append("image", imageFile);
    body = fd;
  } else {
    body = { content };
  }

  try {
    const res = await apiClient.post<AiSendMessageResponse>(
      `/ai/conversations/${encodeURIComponent(conversationId)}/messages`,
      body,
      { headers }
    );
    return res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const code = err?.response?.data?.code;
    const msg = extractApiErrorMessage(err);

    if (status === 403 || code === "AI_FORBIDDEN" || code === "FORBIDDEN") {
      throw new AiPermissionError(
        msg || "Tài khoản không có quyền sử dụng tính năng trò chuyện AI (HTTP 403 Forbidden)."
      );
    }
    if (status === 503 || code === "AI_PROVIDER_NOT_CONFIGURED" || code === "AI_PROVIDER_UNAVAILABLE") {
      throw new AiProviderUnavailableError(
        "Dịch vụ AI Provider chưa được cấu hình API Key trên máy chủ (HTTP 503). FINDWORK ghi nhận câu hỏi an toàn và sẽ xử lý khi nhà cung cấp kết nối."
      );
    }
    if (status === 429 || code === "AI_DAILY_BUDGET_EXCEEDED" || code === "AI_CONVERSATION_LIMIT" || code === "AI_GUEST_SESSION_LIMIT") {
      throw new AiRateLimitError(
        code || "AI_RATE_LIMIT",
        "Bạn đã đạt giới hạn hội thoại AI trong ngày. Vui lòng thử lại vào ngày mai hoặc đăng nhập để nhận thêm hạn mức."
      );
    }
    if (code === "AI_SENSITIVE_INPUT_BLOCKED") {
      throw new AiInputBlockedError(
        code,
        "Yêu cầu chứa thông tin bảo mật nhạy cảm (mật khẩu, thông tin thẻ tín dụng) và đã bị chặn bởi bộ lọc an toàn."
      );
    }
    if (code === "AI_IMAGE_INVALID") {
      throw new AiInputBlockedError(code, "Hình ảnh đính kèm không đúng định dạng JPEG/PNG/WebP hoặc vượt quá 2MB.");
    }
    throw new Error(msg || "Không thể gửi tin nhắn tới AI Assistant.");
  }
};

/**
 * Chuyển đổi giọng nói thành văn bản qua Backend (POST /ai/transcriptions)
 */
export const transcribeAudio = async (audioWavBlob: Blob): Promise<{ text: string }> => {
  const headers = await getAiRequestHeaders();
  const fd = new FormData();
  fd.append("file", audioWavBlob, "speech.wav");

  try {
    const res = await apiClient.post<{ text: string }>("/ai/transcriptions", fd, { headers });
    return res.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const code = err?.response?.data?.code;
    if (status === 503 || code === "AI_TRANSCRIPTION_BUDGET_NOT_CONFIGURED" || code === "AI_PROVIDER_NOT_CONFIGURED") {
      throw new AiProviderUnavailableError(
        "Dịch vụ nhận dạng giọng nói AI chưa được kích hoạt hạn mức trên Backend (HTTP 503)."
      );
    }
    if (code === "AI_AUDIO_INVALID" || code === "AI_AUDIO_DURATION_INVALID") {
      throw new AiInputBlockedError(
        code,
        "Đoạn âm thanh không đúng định dạng WAV 16-bit PCM hoặc vượt quá giới hạn 60 giây."
      );
    }
    throw new Error(extractApiErrorMessage(err, "Không thể chuyển đổi âm thanh sang văn bản."));
  }
};

/**
 * Gửi tin nhắn - Backward compatibility function for existing tests and legacy call sites
 */
export const sendChatMessage = async (
  messages: Array<{ role: string; content: string }>
): Promise<{ reply: string }> => {
  try {
    const res = await apiClient.post<{ reply?: string; message?: string }>("/ai/chat", {
      messages,
      stream: false,
    });
    const text = res.data?.reply || res.data?.message;
    if (!text) throw new AiProviderUnavailableError();
    return { reply: text };
  } catch (err: unknown) {
    throw new AiProviderUnavailableError();
  }
};
