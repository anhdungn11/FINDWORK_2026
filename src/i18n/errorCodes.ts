import type { Locale } from "./types";

export const LOCALIZED_API_ERRORS: Record<string, { vi: string; en: string }> = {
  AUTHORIZATION_FORBIDDEN: {
    vi: "Bạn không có quyền thực hiện thao tác hoặc truy cập khu vực này.",
    en: "You do not have permission to perform this action or access this area.",
  },
  AUTH_ACCESS_TOKEN_REQUIRED: {
    vi: "Yêu cầu phiên đăng nhập hợp lệ.",
    en: "Valid authentication session is required.",
  },
  AUTH_ACCESS_TOKEN_INVALID: {
    vi: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    en: "Authentication session is invalid or expired.",
  },
  AUTH_INVALID_CREDENTIALS: {
    vi: "Email hoặc mật khẩu không chính xác.",
    en: "Invalid email or password.",
  },
  AUTH_EMAIL_ALREADY_REGISTERED: {
    vi: "Địa chỉ email này đã được đăng ký tài khoản.",
    en: "An account with this email address already exists.",
  },
  AUTH_EMAIL_VERIFICATION_DELIVERY_UNAVAILABLE: {
    vi: "Dịch vụ gửi email xác minh hiện chưa được cấu hình nhà cung cấp dịch vụ trên máy chủ (HTTP 503).",
    en: "Email verification delivery service is not configured on the server (HTTP 503).",
  },
  AUTH_PASSWORD_RESET_DELIVERY_UNAVAILABLE: {
    vi: "Dịch vụ gửi email đặt lại mật khẩu hiện chưa được cấu hình nhà cung cấp dịch vụ trên máy chủ (HTTP 503).",
    en: "Password reset delivery service is not configured on the server (HTTP 503).",
  },
  AUTH_PASSWORD_RESET_TOKEN_INVALID: {
    vi: "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
    en: "Password reset token is invalid or expired.",
  },
  COMPANY_INVITATION_DELIVERY_UNAVAILABLE: {
    vi: "Dịch vụ gửi email lời mời hiện chưa được cấu hình nhà cung cấp dịch vụ trên máy chủ (HTTP 503).",
    en: "Company invitation delivery service is not configured on the server (HTTP 503).",
  },
  CONVERSATION_NOT_FOUND: {
    vi: "Không tìm thấy hội thoại trao đổi cho đơn ứng tuyển này.",
    en: "Conversation not found for this application.",
  },
  AUTH_SESSION_INVALID: {
    vi: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    en: "Session is invalid or expired. Please sign in again.",
  },
  VALIDATION_ERROR: {
    vi: "Dữ liệu yêu cầu chưa hợp lệ. Vui lòng kiểm tra lại thông tin.",
    en: "Validation failed. Please verify the submitted information.",
  },
  NOT_FOUND: {
    vi: "Không tìm thấy dữ liệu hoặc trang yêu cầu.",
    en: "The requested resource could not be found.",
  },
  COMPANY_NOT_FOUND: {
    vi: "Không tìm thấy thông tin doanh nghiệp.",
    en: "Company not found.",
  },
  JOB_NOT_FOUND: {
    vi: "Không tìm thấy thông tin tin tuyển dụng.",
    en: "Job posting not found.",
  },
  WRITE_GATE_BLOCKED: {
    vi: "Thao tác ghi dữ liệu đang tạm tắt trong chế độ kiểm thử.",
    en: "Write operations are temporarily disabled in test mode.",
  },
  AI_PROVIDER_UNCONFIGURED: {
    vi: "Dịch vụ AI Assistant chưa được kết nối với nhà cung cấp trên máy chủ.",
    en: "AI Assistant is not connected to a backend AI provider.",
  },
  AI_GUEST_SESSION_LIMIT: {
    vi: "Bạn đã đạt giới hạn yêu cầu phiên khách. Vui lòng thử lại sau.",
    en: "Too many guest requests. Please try again later.",
  },
  AI_RATE_LIMIT: {
    vi: "Đã vượt quá tần suất yêu cầu AI. Vui lòng đợi trong giây lát.",
    en: "AI rate limit exceeded. Please wait a moment before trying again.",
  },
  NETWORK_ERROR: {
    vi: "Không thể kết nối tới máy chủ. Vui lòng kiểm tra đường truyền mạng.",
    en: "Unable to connect to the server. Please check your network connection.",
  },
};

/**
 * Normalizes backend error code or message into localized text according to active locale.
 */
export function getLocalizedApiError(
  code: string | undefined,
  serverMessage: string | undefined,
  locale: Locale = "vi"
): string {
  if (code && LOCALIZED_API_ERRORS[code]) {
    return LOCALIZED_API_ERRORS[code][locale];
  }

  // If serverMessage is known English phrase, map it
  if (serverMessage) {
    const trimmed = serverMessage.trim();
    if (trimmed.includes("You do not have permission") || trimmed.includes("permission to perform this action")) {
      return locale === "en"
        ? "You do not have permission to perform this action."
        : "Bạn không có quyền thực hiện thao tác hoặc truy cập khu vực này.";
    }
    if (trimmed.includes("Invalid email or password")) {
      return locale === "en" ? "Invalid email or password." : "Email hoặc mật khẩu không chính xác.";
    }
    if (trimmed.includes("already registered") || trimmed.includes("already exists")) {
      return locale === "en" ? "An account with this email already exists." : "Email này đã được đăng ký tài khoản.";
    }
    if (trimmed.includes("Validation failed") || trimmed.includes("validation failed")) {
      return locale === "en" ? "Validation failed. Please verify your information." : "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.";
    }
    if (trimmed.includes("Too many requests")) {
      return locale === "en" ? "Too many requests. Please try again later." : "Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.";
    }
  }

  return serverMessage || (locale === "en" ? "An unexpected error occurred." : "Đã có lỗi xảy ra. Vui lòng thử lại.");
}
