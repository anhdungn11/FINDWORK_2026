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

// Recruitment analytics remains unavailable. Business AI is implemented
// with company RBAC, platform capability checks, quotas, and provider failures.
export const IMPLEMENTED_PLATFORM_CAPABILITIES: readonly PlatformCapabilityCode[] = [
  "job.draft.create", "job.draft.edit", "job.publish", "job.close",
  "application.view", "application.pipeline.manage", "interview.schedule", "team.invite",
  "ai.business.access",
];

export function isPlatformCapabilityCode(code: string): code is PlatformCapabilityCode {
  return (PLATFORM_CAPABILITIES as readonly string[]).includes(code);
}
