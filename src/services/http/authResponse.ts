import type { AuthUser } from "../../store/authStore";

export interface AuthSessionResponse {
  accessToken: string;
  user: AuthUser;
}

// Defensive validation: a misconfigured Vite proxy might return index.html with HTTP 200.
// Never treat an arbitrary successful HTTP response as an authenticated session.
export function parseAuthResponse(value: unknown): AuthSessionResponse {
  if (!value || typeof value !== "object") {
    throw new Error("API xác thực trả về dữ liệu không hợp lệ. Kiểm tra kết nối backend.");
  }
  const data = value as Record<string, unknown>;
  const user = data.user;
  if (
    typeof data.accessToken !== "string" || data.accessToken.length === 0 ||
    !user || typeof user !== "object" ||
    typeof (user as Record<string, unknown>).id !== "string" ||
    typeof (user as Record<string, unknown>).email !== "string"
  ) {
    throw new Error("API xác thực trả về dữ liệu không hợp lệ. Kiểm tra kết nối backend.");
  }
  return { accessToken: data.accessToken, user: user as AuthUser };
}
