import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { getLocalizedApiError } from "../../i18n/errorCodes";
import { getCurrentLocale } from "../../i18n/i18nStore";

declare module "axios" {
  export interface AxiosRequestConfig {
    originatingSessionId?: number | null;
    originatingUserId?: string | null;
    originatingToken?: string | null;
  }
  export interface InternalAxiosRequestConfig {
    originatingSessionId?: number | null;
    originatingUserId?: string | null;
    originatingToken?: string | null;
  }
}

let inMemoryAccessToken: string | null = null;
let inMemoryAuthUserId: string | null = null;
let inMemoryAuthSessionId = 0;

export const setAuthToken = (token: string | null, userId?: string | null): void => {
  inMemoryAccessToken = token;
  inMemoryAuthUserId = userId ?? null;
  inMemoryAuthSessionId += 1;
};

export const getAuthToken = (): string | null => {
  return inMemoryAccessToken;
};

export const getAuthUserId = (): string | null => {
  return inMemoryAuthUserId;
};

export const getAuthSessionId = (): number => {
  return inMemoryAuthSessionId;
};

export interface ApiErrorResponse {
  code?: string;
  message?: string | string[];
  statusCode?: number;
  error?: string;
}

export const getApiBaseUrl = (): string => {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return "/api/v1";
};

export const resolveApiUrl = (pathOrUrl: string | null | undefined): string | null => {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const baseUrl = getApiBaseUrl();
  if (/^https?:\/\//i.test(baseUrl)) {
    try {
      const origin = new URL(baseUrl).origin;
      return `${origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
    } catch {
      return pathOrUrl;
    }
  }
  return pathOrUrl;
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 10000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const currentToken = getAuthToken();
  const currentUserId = getAuthUserId();
  const currentSessionId = getAuthSessionId();

  // If this request is bound to an originating session or user, verify that
  // the session has not changed or been invalidated prior to dispatch.
  if (config.originatingToken !== undefined && config.originatingToken !== currentToken) {
    return Promise.reject(
      new axios.CanceledError(
        "Request cancelled: auth session token changed before dispatch"
      )
    );
  }

  if (
    config.originatingUserId !== undefined &&
    config.originatingUserId !== null &&
    currentUserId !== config.originatingUserId
  ) {
    return Promise.reject(
      new axios.CanceledError(
        "Request cancelled: auth session user changed before dispatch"
      )
    );
  }

  if (
    config.originatingSessionId !== undefined &&
    config.originatingSessionId !== null &&
    currentSessionId !== config.originatingSessionId
  ) {
    return Promise.reject(
      new axios.CanceledError(
        "Request cancelled: auth session revision changed before dispatch"
      )
    );
  }

  if (currentToken) {
    config.headers.set("Authorization", `Bearer ${currentToken}`);
  }
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    // Clear Content-Type to let browser and Axios adapter generate multipart boundary
    if (config.headers && typeof config.headers.delete === "function") {
      config.headers.delete("Content-Type");
    } else if (config.headers) {
      delete config.headers["Content-Type"];
    }
  }
  return config;
});

export function extractApiErrorMessage(error: unknown, fallbackMessage?: string): string {
  const locale = getCurrentLocale();
  const defaultFallback = fallbackMessage || (locale === "en" ? "An unexpected error occurred" : "Đã có lỗi xảy ra");

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse & { details?: unknown }>;
    const data = axiosError.response?.data;
    const code = data?.code;

    if (Array.isArray(data?.details) && data.details.length > 0) {
      return data.details.filter((d): d is string => typeof d === "string").join(", ");
    }

    let rawMessage: string | undefined;
    if (data?.message) {
      if (Array.isArray(data.message)) {
        rawMessage = data.message.join(", ");
      } else {
        rawMessage = data.message;
      }
    }

    return getLocalizedApiError(code, rawMessage || defaultFallback, locale);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultFallback;
}
