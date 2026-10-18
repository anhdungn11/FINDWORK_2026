import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

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

export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (inMemoryAccessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

export function extractApiErrorMessage(error: unknown, fallbackMessage = "Đã có lỗi xảy ra"): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const data = axiosError.response?.data;
    if (data?.message) {
      if (Array.isArray(data.message)) {
        return data.message.join(", ");
      }
      return data.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}
