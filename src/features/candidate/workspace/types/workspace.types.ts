import type { LucideIcon } from "lucide-react";

export interface WorkspaceNavItem {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
  badgeType?: "info" | "neutral" | "warning";
  exact?: boolean;
  isExternal?: boolean;
  ariaLabel?: string;
}

export interface CandidateDisplayIdentity {
  displayName: string;
  initials: string;
  email: string;
  roleLabel: string;
  statusLabel: string | null;
  isActive: boolean;
}
