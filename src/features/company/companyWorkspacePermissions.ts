/**
 * Phân quyền thao tác trong Không gian doanh nghiệp (Company Workspace).
 * Tuân thủ RBAC Backend (server/src/modules/company/company-roles.ts & permissions.ts).
 */

export const JOB_MANAGING_ROLES = new Set([
  "OWNER",
  "COMPANY_OWNER",
  "ADMIN",
  "HR_MANAGER",
  "RECRUITER",
]);

export function canManageJobs(roles: string[] | undefined | null): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => JOB_MANAGING_ROLES.has(role.trim().toUpperCase()));
}

export const APPLICATION_REVIEWING_ROLES = new Set([
  "OWNER",
  "COMPANY_OWNER",
  "ADMIN",
  "HR_MANAGER",
  "RECRUITER",
]);

export function canReviewApplications(roles: string[] | undefined | null): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => APPLICATION_REVIEWING_ROLES.has(role.trim().toUpperCase()));
}

export const COMPANY_UPDATING_ROLES = new Set([
  "OWNER",
  "COMPANY_OWNER",
  "ADMIN",
]);

export function canUpdateCompany(roles: string[] | undefined | null): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => COMPANY_UPDATING_ROLES.has(role.trim().toUpperCase()));
}

export const MEMBER_MANAGING_ROLES = new Set([
  "OWNER",
  "COMPANY_OWNER",
  "ADMIN",
]);

export function canManageMembers(roles: string[] | undefined | null): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => MEMBER_MANAGING_ROLES.has(role.trim().toUpperCase()));
}

export const MEMBER_INVITING_ROLES = new Set([
  "OWNER",
  "COMPANY_OWNER",
  "ADMIN",
  "HR_MANAGER",
]);

export function canInviteMembers(roles: string[] | undefined | null): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => MEMBER_INVITING_ROLES.has(role.trim().toUpperCase()));
}

export const COMPANY_ROLE_LABELS: Record<string, string> = {
  OWNER: "Chủ sở hữu",
  COMPANY_OWNER: "Chủ sở hữu",
  ADMIN: "Quản trị viên",
  HR_MANAGER: "Trưởng phòng nhân sự",
  RECRUITER: "Chuyên viên tuyển dụng",
  HIRING_MANAGER: "Quản lý tuyển dụng",
  VIEWER: "Người xem",
};

export function formatCompanyRole(role: string): string {
  const normalized = role.trim().toUpperCase();
  return COMPANY_ROLE_LABELS[normalized] || role.replace(/_/g, " ");
}
