import { create } from "zustand";
import { apiClient, extractApiErrorMessage, setAuthToken } from "../services/http/apiClient";
import { API_ENDPOINTS } from "../services/http/endpoints";

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
  status?: string;
}

interface LoginResponse {
  accessToken: string;
  accessTokenExpiresInSeconds?: number;
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  error: string | null;
  setAuth: (user: AuthUser, accessToken: string) => void;
  clearAuth: () => void;
  checkAuth: () => Promise<AuthUser | null>;
  login: (credentials: { email: string; password: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

// A stale /auth/me or /auth/refresh response must never resurrect a session
// after logout or overwrite the account selected by a later login.
let authRevision = 0;
let pendingCheck: { revision: number; promise: Promise<AuthUser | null> } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  status: "idle",
  error: null,

  setAuth: (user: AuthUser, accessToken: string) => {
    authRevision += 1;
    setAuthToken(accessToken);
    set({ user, accessToken, status: "authenticated", error: null });
  },

  clearAuth: () => {
    authRevision += 1;
    setAuthToken(null);
    set({ user: null, accessToken: null, status: "unauthenticated", error: null });
  },

  checkAuth: () => {
    const revision = authRevision;
    if (pendingCheck?.revision === revision) return pendingCheck.promise;
    set({ status: "loading" });

    const run = async (): Promise<AuthUser | null> => {
      const token = get().accessToken;
      if (token) {
        try {
          const response = await apiClient.get<AuthUser>(API_ENDPOINTS.AUTH.ME, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (authRevision === revision) get().setAuth(response.data, token);
          return get().user;
        } catch {
          // Token may be expired; try the httpOnly refresh cookie.
        }
      }

      if (authRevision !== revision) return get().user;

      try {
        const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.REFRESH);
        if (authRevision === revision) {
          get().setAuth(response.data.user, response.data.accessToken);
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
    pendingCheck = { revision, promise };
    return promise;
  },

  login: async ({ email, password }) => {
    // A new login invalidates any older async session check/login request.
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
      get().setAuth(response.data.user, response.data.accessToken);
      return response.data.user;
    } catch (err) {
      const message = extractApiErrorMessage(err, "Đăng nhập thất bại. Vui lòng thử lại.");
      if (authRevision === revision) {
        get().clearAuth();
        set({ error: message });
      }
      throw new Error(message);
    }
  },

  logout: async () => {
    // Clear immediately: a pending refresh must not re-authenticate the UI
    // while the best-effort server-side logout request is in flight.
    get().clearAuth();
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch {
      // Local session is already cleared; server logout is best-effort.
    }
  },
}));
