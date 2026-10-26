import axios from "axios";
import { getLocalizedApiError } from "../../i18n/errorCodes";
import { getCurrentLocale } from "../../i18n/i18nStore";

export type ApiFailureKind =
  | "unauthenticated" // 401
  | "forbidden" // 403
  | "not_found" // 404
  | "conflict" // 409
  | "validation" // 400/422
  | "unavailable" // 503 / 5xx
  | "network" // không tới được máy chủ
  | "write_blocked" // cổng ghi đang tắt (không gửi request)
  | "unknown";

export class ApiFailure extends Error {
  readonly kind: ApiFailureKind;
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(kind: ApiFailureKind, status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiFailure";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const MESSAGES: Record<ApiFailureKind, string> = {
  unauthenticated: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  forbidden: "Bạn không có quyền thực hiện thao tác hoặc xem dữ liệu này.",
  not_found: "Không tìm thấy dữ liệu yêu cầu.",
  conflict: "Dữ liệu đã thay đổi hoặc không còn hợp lệ ở trạng thái hiện tại. Hãy tải lại rồi thử lại.",
  validation: "Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại các trường.",
  unavailable: "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.",
  network: "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.",
  write_blocked: "Thao tác ghi dữ liệu đang tắt. Chưa có yêu cầu nào được gửi tới máy chủ.",
  unknown: "Đã có lỗi không xác định xảy ra.",
};

export const kindFromStatus = (status: number): ApiFailureKind => {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 400 || status === 422) return "validation";
  if (status === 503 || status >= 500) return "unavailable";
  return "unknown";
};

/** Chuẩn hóa mọi lỗi HTTP/mạng thành ApiFailure với phân loại chính xác và thông điệp đa ngữ. */
export function toApiFailure(error: unknown): ApiFailure {
  if (error instanceof ApiFailure) return error;
  if (axios.isAxiosError(error)) {
    if (!error.response) return new ApiFailure("network", 0, "NETWORK_ERROR", MESSAGES.network);
    const status = error.response.status;
    const data = error.response.data as { code?: unknown; message?: unknown; details?: unknown } | undefined;
    const code = typeof data?.code === "string" ? data.code : kindFromStatus(status).toUpperCase();
    const kind = kindFromStatus(status);

    let serverMessage = "";
    if (Array.isArray(data?.details) && data.details.length > 0) {
      serverMessage = data.details.filter((d): d is string => typeof d === "string").join(", ");
    } else if (Array.isArray(data?.message) && data.message.length > 0) {
      serverMessage = data.message.filter((m): m is string => typeof m === "string").join(", ");
    } else if (typeof data?.message === "string" && data.message.trim()) {
      serverMessage = data.message.trim();
    }

    const locale = getCurrentLocale();
    const localized = getLocalizedApiError(typeof data?.code === "string" ? data.code : undefined, serverMessage, locale);
    const message = localized || MESSAGES[kind];
    return new ApiFailure(kind, status, code, message, data?.details);
  }
  return new ApiFailure("unknown", 0, "UNKNOWN", MESSAGES.unknown);
}

export const writeBlockedFailure = (operation: string): ApiFailure =>
  new ApiFailure("write_blocked", 403, "WRITE_GATE_BLOCKED", `${MESSAGES.write_blocked} (${operation})`);
