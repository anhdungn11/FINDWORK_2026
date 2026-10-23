import { apiClient } from "../../services/http/apiClient";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  status?: "sent" | "error" | "mock_preview";
  errorMessage?: string;
}

const STORAGE_KEY = "findwork.aiAssistant.history";

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

export class AiProviderUnavailableError extends Error {
  readonly code = "AI_PROVIDER_UNCONFIGURED";
  readonly status = 503;

  constructor() {
    super(
      "Dịch vụ AI Assistant chưa được kết nối với nhà cung cấp (Gemini / OpenAI API) trên máy chủ Backend. " +
      "Hệ thống hiển thị giao diện xem trước và bảo toàn lịch sử trò chuyện trên trình duyệt của bạn."
    );
    this.name = "AiProviderUnavailableError";
  }
}

/**
 * Gửi tin nhắn tới API AI Provider nếu Backend hỗ trợ.
 * Khi chưa có API thật hoặc lỗi 404/501/503, ném AiProviderUnavailableError
 * để UI hiển thị trạng thái trung thực (không bịa kết quả giả).
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
    // If backend endpoint is missing (404) or unconfigured (503/501), throw honest unconfigured error
    throw new AiProviderUnavailableError();
  }
};
