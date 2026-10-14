import type { AuthUser } from "@/store/authStore";
import type { CandidateDisplayIdentity } from "../types/workspace.types";

/**
 * Derives display initials from a full name or email without throwing or hardcoding.
 * Supports Vietnamese unicode names, single words, and multi-word names.
 */
export function getCandidateInitials(name?: string | null): string {
  if (!name) return "UV";
  const trimmed = name.trim();
  if (!trimmed) return "UV";

  // If input looks like an email, take up to 2 characters before the @
  if (trimmed.includes("@")) {
    const handle = trimmed.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
    if (!handle) return "UV";
    return handle.slice(0, 2).toUpperCase();
  }

  // Multi-word name handling (takes first char of first word & first char of last word)
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0);
  if (parts.length === 1) {
    return Array.from(parts[0])[0].toUpperCase();
  }
  const first = Array.from(parts[0])[0].toUpperCase();
  const last = Array.from(parts[parts.length - 1])[0].toUpperCase();
  return `${first}${last}`;
}

/**
 * Formats user role reliably across all platform roles without guessing.
 */
export function formatCandidateRole(role?: string | null): string {
  if (!role) return "";
  const normalized = role.trim().toUpperCase();
  switch (normalized) {
    case "CANDIDATE":
      return "Ứng viên";
    case "EMPLOYER":
      return "Nhà tuyển dụng";
    case "ADMIN":
      return "Quản trị viên";
    default:
      return role.trim();
  }
}

/**
 * Formats account status safely without assuming active state.
 */
export function formatCandidateStatus(status?: string | null): { label: string; isActive: boolean } | null {
  if (!status) return null;
  const normalized = status.trim().toUpperCase();
  switch (normalized) {
    case "ACTIVE":
      return { label: "Đang hoạt động", isActive: true };
    case "INACTIVE":
      return { label: "Tạm dừng", isActive: false };
    case "PENDING":
    case "PENDING_VERIFICATION":
      return { label: "Chờ xác thực", isActive: false };
    case "SUSPENDED":
    case "BLOCKED":
      return { label: "Tài khoản bị khóa", isActive: false };
    default:
      return { label: status.trim(), isActive: false };
  }
}

/**
 * Resolves complete display identity for Candidate Workspace without hardcoding.
 */
export function resolveCandidateIdentity(user: AuthUser | null | undefined): CandidateDisplayIdentity {
  if (!user) {
    return {
      displayName: "Khách",
      initials: "K",
      email: "",
      roleLabel: "",
      statusLabel: null,
      isActive: false,
    };
  }

  const rawFullName = (user.fullName ?? "").trim();
  const rawEmail = (user.email ?? "").trim();

  let displayName = "Ứng viên FINDWORK";
  if (rawFullName) {
    displayName = rawFullName;
  } else if (rawEmail) {
    const handle = rawEmail.split("@")[0].trim();
    if (handle) displayName = handle;
  }

  const initials = getCandidateInitials(rawFullName || rawEmail);
  const roleLabel = formatCandidateRole(user.role);
  const statusInfo = formatCandidateStatus(user.status);

  return {
    displayName,
    initials,
    email: rawEmail,
    roleLabel,
    statusLabel: statusInfo ? statusInfo.label : null,
    isActive: statusInfo ? statusInfo.isActive : false,
  };
}
