/**
 * Chính sách truy cập phía giao diện (UX guard).
 * KHÔNG thay thế phân quyền Backend: mọi API vẫn tự kiểm tra quyền; guard này chỉ
 * tránh hiển thị khung quản trị cho người không phù hợp.
 */
import type { AuthState } from "@/store/authStore";

export type WorkspaceKind = "admin" | "employer";
export type WorkspaceAccess = "loading" | "allowed" | "unauthenticated" | "forbidden";

/** Tên vai trò hệ thống được coi là quản trị nền tảng. Backend vẫn là nguồn quyết định cuối cùng. */
const ADMIN_ROLE_NAMES = new Set(["ADMIN", "SYSTEM_ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"]);

export const isAdminRole = (role: string | null | undefined): boolean =>
  typeof role === "string" && ADMIN_ROLE_NAMES.has(role.trim().toUpperCase());

export function resolveWorkspaceAccess(
  kind: WorkspaceKind,
  status: AuthState["status"],
  user: { role?: string } | null,
  accessToken: string | null,
): WorkspaceAccess {
  if (status === "idle" || status === "loading" || status === "loggingOut") return "loading";
  if (status !== "authenticated" || !user || !accessToken) return "unauthenticated";
  if (kind === "admin") return isAdminRole(user.role) ? "allowed" : "forbidden";
  // Company workspace: quyền thực tế dựa trên membership (GET /companies/me) và RBAC Backend.
  return "allowed";
}
