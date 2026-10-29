import { create } from "zustand";
import { parseAuthResponse } from "../services/http/authResponse";
import { apiClient, extractApiErrorMessage, setAuthToken } from "../services/http/apiClient";
import { API_ENDPOINTS } from "../services/http/endpoints";

export type AccountType = "CANDIDATE" | "EMPLOYER" | "LEGACY_UNCLASSIFIED";

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
  status?: string;
  accountType?: AccountType;
  emailVerified?: boolean;
}

interface LoginResponse {
  accessToken: string;
  accessTokenExpiresInSeconds?: number;
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated" | "loggingOut";
  error: string | null;
  logoutError: string | null;
  setAuth: (user: AuthUser, accessToken: string) => void;
  clearAuth: () => void;
  checkAuth: () => Promise<AuthUser | null>;
  login: (credentials: { email: string; password: string }) => Promise<AuthUser>;
  logout: () => Promise<boolean>;
}

// A stale /auth/me or /auth/refresh response must never resurrect a session
// after logout or overwrite the account selected by a later login.
let authRevision = 0;
let pendingCheck: { revision: number; controller: AbortController; promise: Promise<AuthUser | null> } | null = null;
let pendingLogout: Promise<boolean> | null = null;
const LOGOUT_PENDING_KEY = "findwork.logoutPending";
let logoutPendingInMemory = false;

const isLogoutPending = () => {
  if (logoutPendingInMemory) return true;
  try { return typeof sessionStorage !== "undefined" && sessionStorage.getItem(LOGOUT_PENDING_KEY) === "1"; }
  catch { return false; }
};

const setLogoutPending = (pending: boolean) => {
  logoutPendingInMemory = pending;
  try {
    if (typeof sessionStorage === "undefined") return;
    if (pending) sessionStorage.setItem(LOGOUT_PENDING_KEY, "1");
    else sessionStorage.removeItem(LOGOUT_PENDING_KEY);
  } catch { /* Storage may be disabled by the browser. */ }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  status: isLogoutPending() ? "unauthenticated" : "idle",
  error: null,
  logoutError: isLogoutPending() ? "Đăng xuất chưa được xác nhận với máy chủ. Vui lòng thử lại khi có mạng." : null,

  setAuth: (user: AuthUser, accessToken: string) => {
    authRevision += 1;
    setLogoutPending(false);
    setAuthToken(accessToken, user.id);
    set({ user, accessToken, status: "authenticated", error: null, logoutError: null });
  },

  clearAuth: () => {
    authRevision += 1;
    setAuthToken(null, null);
    set({ user: null, accessToken: null, status: "unauthenticated", error: null });
  },

  checkAuth: () => {
    if (isLogoutPending()) {
      get().clearAuth();
      return Promise.resolve(null);
    }
    const revision = authRevision;
    if (pendingCheck?.revision === revision) return pendingCheck.promise;
    const controller = new AbortController();
    set({ status: "loading" });

    const run = async (): Promise<AuthUser | null> => {
      const token = get().accessToken;
      if (token) {
        try {
          const response = await apiClient.get<AuthUser>(API_ENDPOINTS.AUTH.ME, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          if (authRevision === revision) get().setAuth(response.data, token);
          return get().user;
        } catch {
          // Token may be expired; try the httpOnly refresh cookie.
        }
      }

      if (authRevision !== revision) return get().user;

      try {
        const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.REFRESH, undefined, {
          signal: controller.signal,
        });
        if (authRevision === revision) {
          const session = parseAuthResponse(response.data);
          get().setAuth(session.user, session.accessToken);
        }
        return get().user;
      } catch {
        if (authRevision === revision) get().clearAuth();
        return get().user;
      }
    };

    const promise = run().finally(() => {
      if (pendingCheck?.promise === promise) pendingCheck = null;
    });
    pendingCheck = { revision, controller, promise };
    return promise;
  },

  login: async ({ email, password }) => {
    if (pendingLogout) await pendingLogout;
    // A new login invalidates any older async session check/login request.
    pendingCheck?.controller.abort();
    get().clearAuth();
    const revision = authRevision;
    set({ status: "loading", error: null });
    try {
      const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, {
        email: email.trim().toLowerCase(),
        password,
      });
      if (authRevision !== revision) {
        throw new Error("Phiên đăng nhập đã thay đổi. Vui lòng thử lại.");
      }
      const session = parseAuthResponse(response.data);
      get().setAuth(session.user, session.accessToken);
      return session.user;
    } catch (err) {
      const message = extractApiErrorMessage(err, "Đăng nhập thất bại. Vui lòng thử lại.");
      if (authRevision === revision) {
        get().clearAuth();
        set({ error: message });
      }
      throw new Error(message);
    }
  },

  logout: () => {
    if (pendingLogout) return pendingLogout;
    // Block refresh immediately, including after a page reload if the server is offline.
    setLogoutPending(true);
    pendingCheck?.controller.abort();
    get().clearAuth();
    set({ status: "loggingOut", logoutError: null });
    const promise = (async () => {
      try {
        await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
        setLogoutPending(false);
        return true;
      } catch {
        set({ logoutError: "Không thể xác nhận đăng xuất với máy chủ. Vui lòng thử lại khi có mạng." });
        return false;
      }
    })().finally(() => {
      if (get().status === "loggingOut") set({ status: "unauthenticated" });
      if (pendingLogout === promise) pendingLogout = null;
    });
    pendingLogout = promise;
    return promise;
  },
}));

if (typeof window !== "undefined" && import.meta.env?.DEV) {
  (window as unknown as { __FINDWORK_AUTH_STORE__?: unknown }).__FINDWORK_AUTH_STORE__ = useAuthStore;
}
