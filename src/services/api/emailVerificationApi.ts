import { apiClient } from "../http/apiClient";
import { toApiFailure } from "./apiFailure";

export const emailVerificationApi = {
  /**
   * Xác nhận token xác minh email từ liên kết gửi về hộp thư.
   * Gửi POST /auth/email-verification/confirm với { token }.
   */
  async confirm(token: string, signal?: AbortSignal): Promise<void> {
    try {
      await apiClient.post("/auth/email-verification/confirm", { token }, { signal });
    } catch (error) {
      throw toApiFailure(error);
    }
  },

  /**
   * Yêu cầu gửi lại email xác minh cho tài khoản đang đăng nhập.
   * Gửi POST /auth/email-verification/request.
   * Yêu cầu người dùng đã đăng nhập (Authorization Bearer).
   */
  async request(signal?: AbortSignal): Promise<void> {
    try {
      await apiClient.post("/auth/email-verification/request", {}, { signal });
    } catch (error) {
      throw toApiFailure(error);
    }
  },
};
