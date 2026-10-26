/**
 * Chính sách truy cập phía giao diện (UX guard).
 * KHÔNG thay thế phân quyền Backend: mọi API vẫn tự kiểm tra quyền; guard này chỉ
 * tránh hiển thị khung quản trị cho người không phù hợp.
 */
import type { AuthState } from "@/store/authStore";

export type WorkspaceKind = "admin" | "employer";
export type WorkspaceAccess = "loading" | "allowed" | "unauthenticated" | "forbidden";

/**
 * Danh sách mã vai trò hệ thống cấp nền tảng (SYSTEM-level roles trong Prisma seed và authorization module):
 * - SUPER_ADMIN: Toàn quyền hệ thống
 * - SUPPORT_ADMIN: user.view, company.view, job.view (Dashboard, User list, Company list, Job list)
 * - VERIFICATION_ADMIN: company.view, company.verify, company.suspend
 * - MODERATION_ADMIN: company.view, job.view, job.moderate
 * LƯU Ý BẢO MẬT: Quyền quản trị công ty (Company ADMIN) KHÔNG BAO GIỜ là System Admin.
 * Backend AccessTokenGuard + PermissionGuard (scope: "SYSTEM") là nguồn quyết định cuối cùng.
 */
const SYSTEM_ADMIN_ROLE_CODES = new Set([
  "SUPER_ADMIN",
  "SUPPORT_ADMIN",
  "VERIFICATION_ADMIN",
  "MODERATION_ADMIN",
]);

export const isAdminRole = (role: string | null | undefined): boolean =>
  typeof role === "string" && SYSTEM_ADMIN_ROLE_CODES.has(role.trim().toUpperCase());

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
