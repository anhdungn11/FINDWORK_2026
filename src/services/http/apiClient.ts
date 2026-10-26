import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { getLocalizedApiError } from "../../i18n/errorCodes";
import { getCurrentLocale } from "../../i18n/i18nStore";

let inMemoryAccessToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  inMemoryAccessToken = token;
};

export const getAuthToken = (): string | null => {
  return inMemoryAccessToken;
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
  const token = getAuthToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
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
