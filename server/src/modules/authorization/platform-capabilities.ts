export const PLATFORM_CAPABILITIES = [
  "job.draft.create", "job.draft.edit", "job.publish", "job.close",
  "application.view", "application.pipeline.manage", "interview.schedule",
  "team.invite", "recruitment.analytics.view", "ai.business.access",
] as const;

export type PlatformCapabilityCode = (typeof PLATFORM_CAPABILITIES)[number];

// These starter grants allow a new employer to prepare a workspace before approval.
// Every capability still requires an explicit database row and member RBAC.
export const NEW_COMPANY_STARTER_CAPABILITIES: readonly PlatformCapabilityCode[] = [
  "job.draft.create", "job.draft.edit", "job.close", "application.view",
];

// No business analytics or business AI endpoint exists yet. Grants to them are
// rejected; an admin may still revoke a legacy row safely.
export const IMPLEMENTED_PLATFORM_CAPABILITIES: readonly PlatformCapabilityCode[] = [
  "job.draft.create", "job.draft.edit", "job.publish", "job.close",
  "application.view", "application.pipeline.manage", "interview.schedule", "team.invite",
];

export function isPlatformCapabilityCode(code: string): code is PlatformCapabilityCode {
  return (PLATFORM_CAPABILITIES as readonly string[]).includes(code);
}
