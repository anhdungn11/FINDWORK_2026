import type { AuthState, AuthUser } from "@/store/authStore";

export type HeaderAuthView = "checking" | "anonymous" | "authenticated" | "loggingOut";

export const shouldCheckAuth = (status: AuthState["status"]): boolean => status === "idle";

export const shouldRecheckAuth = (
  status: AuthState["status"],
  isVisible: boolean,
  elapsedMs: number,
): boolean => status === "authenticated" && isVisible && elapsedMs >= 60_000;

export const getHeaderAuthView = (
  status: AuthState["status"],
  user: AuthUser | null,
  accessToken: string | null,
): HeaderAuthView => {
  if (status === "loggingOut") return "loggingOut";
  if (status === "unauthenticated") return "anonymous";
  if (status === "authenticated" && user && accessToken) return "authenticated";
  return "checking";
};

export const getAccountName = (user: AuthUser): string => {
  const fullName = typeof user.fullName === "string" ? user.fullName.trim() : "";
  return fullName.slice(0, 64) || "Tài khoản";
};

export const getAccountInitials = (user: AuthUser): string => {
  const words = getAccountName(user).split(/\s+/);
  const first = Array.from(words[0])[0] || "T";
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : Array.from(words[0])[1];
  return (first + (last || "")).toLocaleUpperCase("vi-VN");
};
