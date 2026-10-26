/**
 * FINDWORK CP8C — LOAD ERROR CLASSIFIER & IMPORT AVAILABILITY
 *
 * Hàm thuần (pure) để phân loại lỗi đọc dữ liệu hồ sơ và khả năng import,
 * tách khỏi React hook để có thể kiểm thử độc lập.
 */

import { CandidateServiceError } from "../services/candidateProfileService";

export interface ClassifiedLoadError {
  state: "eligibility_unknown" | "forbidden" | "not_created_no_draft" | "network_error";
  status: number;
  code: string;
  message: string | null;
}

/** Phân loại chính xác lỗi đọc: 401 != 403 != 404 != 503/5xx != mất kết nối */
export function classifyCandidateLoadError(err: unknown): ClassifiedLoadError {
  if (err instanceof CandidateServiceError) {
    if (err.status === 401) {
      return {
        state: "eligibility_unknown",
        status: 401,
        code: err.code,
        message: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.",
      };
    }
    if (err.status === 403) {
      return {
        state: "forbidden",
        status: 403,
        code: err.code,
        message: "Bạn không có quyền xem hồ sơ ứng viên này.",
      };
    }
    if (err.status === 404 && err.code === "CANDIDATE_PROFILE_NOT_FOUND") {
      return { state: "not_created_no_draft", status: 404, code: err.code, message: null };
    }
    return { state: "network_error", status: err.status, code: err.code, message: err.message };
  }
  return {
    state: "network_error",
    status: 0,
    code: "NETWORK_ERROR",
    message: "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.",
  };
}

/**
 * Khả năng import theo chế độ:
 * - Demo: luôn là mô phỏng trong bộ nhớ (không gọi endpoint thật).
 * - Thật: chỉ khả dụng khi Backend mở ghi (ENABLE_LIVE_WRITES).
 */
export function resolveImportAvailability(params: { isPreview: boolean; isLiveWritesEnabled: boolean }): {
  mode: "simulation" | "real" | "blocked";
  canSubmit: boolean;
} {
  if (params.isPreview) return { mode: "simulation", canSubmit: true };
  if (params.isLiveWritesEnabled) return { mode: "real", canSubmit: true };
  return { mode: "blocked", canSubmit: false };
}
