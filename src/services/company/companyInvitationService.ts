import axios, { type AxiosError } from "axios";
import { apiClient, type ApiErrorResponse } from "../http/apiClient";
import { API_ENDPOINTS } from "../http/endpoints";

export const INVITATION_TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;

export type TokenExtractionStatus = "VALID" | "MISSING" | "INVALID_FORMAT";

export interface TokenExtractionResult {
  token: string | null;
  status: TokenExtractionStatus;
}

export interface AcceptCompanyInvitationSuccess {
  companyId: string;
  companyMemberId: string;
  role: "VIEWER";
}

export type AcceptInvitationErrorCode =
  | "INVALID_TOKEN_FORMAT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND_OR_REVOKED"
  | "ALREADY_MEMBER"
  | "VIEWER_ROLE_UNAVAILABLE"
  | "EXPIRED"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export class CompanyInvitationError extends Error {
  public readonly code: AcceptInvitationErrorCode;
  public readonly statusCode?: number;

  constructor(
    code: AcceptInvitationErrorCode,
    message: string,
    statusCode?: number,
  ) {
    super(message);
    this.name = "CompanyInvitationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Validates whether a token matches the 43-character base64url specification.
 */
export function validateInvitationToken(token: unknown): token is string {
  return typeof token === "string" && INVITATION_TOKEN_REGEX.test(token);
}

/**
 * Safely extracts the invitation token from URL fragment (hash).
 * Supports both #token=<secret> and raw #<secret>.
 * Never logs the token plaintext.
 */
export function extractTokenFromHash(hashString?: string): TokenExtractionResult {
  const raw = (hashString ?? (typeof window !== "undefined" ? window.location.hash : ""))
    .replace(/^#/, "")
    .trim();

  if (!raw) {
    return { token: null, status: "MISSING" };
  }

  let candidate: string | null = null;
  if (raw.includes("=")) {
    try {
      const params = new URLSearchParams(raw);
      candidate = params.get("token");
    } catch {
      return { token: null, status: "INVALID_FORMAT" };
    }
  } else {
    candidate = raw;
  }

  if (!candidate) {
    return { token: null, status: "MISSING" };
  }

  if (validateInvitationToken(candidate)) {
    return { token: candidate, status: "VALID" };
  }

  return { token: null, status: "INVALID_FORMAT" };
}

/**
 * Strips hash from browser URL without page reload.
 * Protects token from remaining visible in address bar or browser history.
 */
export function sanitizeHashFromUrl(): void {
  if (typeof window === "undefined" || !window.location.hash) return;

  if (window.history && typeof window.history.replaceState === "function") {
    const cleanUrl = window.location.pathname + window.location.search;
    window.history.replaceState(window.history.state, "", cleanUrl);
  }
}

/**
 * Accepts a company invitation by calling POST /api/v1/company-invitations/accept.
 * Maps backend error responses to explicit domain error codes.
 */
export async function acceptCompanyInvitation(
  token: string,
  accessToken?: string | null,
): Promise<AcceptCompanyInvitationSuccess> {
  if (!validateInvitationToken(token)) {
    throw new CompanyInvitationError(
      "INVALID_TOKEN_FORMAT",
      "Mã bảo mật lời mời không đúng định dạng.",
      400,
    );
  }

  try {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await apiClient.post<AcceptCompanyInvitationSuccess>(
      API_ENDPOINTS.COMPANY_INVITATIONS.ACCEPT,
      { token },
      { headers },
    );

    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      const status = axiosError.response?.status;
      const apiCode = axiosError.response?.data?.code;

      if (status === 401) {
        throw new CompanyInvitationError(
          "UNAUTHORIZED",
          "Vui lòng đăng nhập để chấp nhận lời mời.",
          401,
        );
      }

      if (status === 403) {
        throw new CompanyInvitationError(
          "FORBIDDEN",
          "Không thể chấp nhận lời mời: email không khớp, tài khoản hoặc công ty không hoạt động.",
          403,
        );
      }

      if (status === 404) {
        throw new CompanyInvitationError(
          "NOT_FOUND_OR_REVOKED",
          "Lời mời không tồn tại, đã được chấp nhận trước đó hoặc đã bị thu hồi.",
          404,
        );
      }

      if (status === 409) {
        if (apiCode === "COMPANY_INVITATION_ALREADY_MEMBER") {
          throw new CompanyInvitationError(
            "ALREADY_MEMBER",
            "Tài khoản đã là thành viên của công ty này.",
            409,
          );
        }
        if (apiCode === "COMPANY_INVITATION_VIEWER_ROLE_UNAVAILABLE") {
          throw new CompanyInvitationError(
            "VIEWER_ROLE_UNAVAILABLE",
            "Vai trò Người xem (VIEWER) hiện chưa khả dụng tại công ty này.",
            409,
          );
        }
        throw new CompanyInvitationError(
          "UNKNOWN_ERROR",
          "Xung đột dữ liệu thành viên công ty.",
          409,
        );
      }

      if (status === 410) {
        throw new CompanyInvitationError(
          "EXPIRED",
          "Lời mời tham gia công ty đã hết hạn (sau 7 ngày).",
          410,
        );
      }

      if (status === 400) {
        throw new CompanyInvitationError(
          "INVALID_TOKEN_FORMAT",
          "Mã bảo mật lời mời không hợp lệ.",
          400,
        );
      }

      if (!status) {
        throw new CompanyInvitationError(
          "NETWORK_ERROR",
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền mạng.",
        );
      }
    }

    if (err instanceof CompanyInvitationError) {
      throw err;
    }

    throw new CompanyInvitationError(
      "UNKNOWN_ERROR",
      "Đã có lỗi xảy ra trong quá trình chấp nhận lời mời.",
    );
  }
}
