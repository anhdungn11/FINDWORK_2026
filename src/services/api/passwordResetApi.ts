import { apiClient } from "../http/apiClient";
import { toApiFailure } from "./apiFailure";

export const passwordResetApi = {
  /**
   * Yêu cầu gửi email đặt lại mật khẩu cho tài khoản.
   * Gửi POST /auth/password-reset/request với { email }.
   * Trả về HTTP 204 No Content khi hệ thống tiếp nhận.
   */
  async request(email: string, signal?: AbortSignal): Promise<void> {
    try {
      await apiClient.post("/auth/password-reset/request", { email: email.trim().toLowerCase() }, { signal });
    } catch (error) {
      throw toApiFailure(error);
    }
  },

  /**
   * Xác nhận đặt lại mật khẩu với mã token từ liên kết email.
   * Gửi POST /auth/password-reset/confirm với { token, password }.
   * Trả về HTTP 204 No Content khi đổi mật khẩu thành công.
   */
  async confirm(token: string, password: string, signal?: AbortSignal): Promise<void> {
    try {
      await apiClient.post("/auth/password-reset/confirm", { token, password }, { signal });
    } catch (error) {
      throw toApiFailure(error);
    }
  },
};
