export interface SystemRoleSeed {
  systemCode: string;
  name: string;
  isProtected: boolean;
  permissions: Array<{
    code: string;
    scope: "OWN" | "ASSIGNED" | "COMPANY" | "SYSTEM";
  }>;
}

const candidateOwnPermissions = [
  "profile.view",
  "profile.update",
  "resume.view",
  "resume.create",
  "resume.update",
  "resume.delete",
  "application.create",
  "application.view",
  "application.withdraw",
  "interview.view",
  "interview.respond",
  "notification.view",
  "notification.manage",
  "saved_job.manage",
];

export const SYSTEM_ROLES: SystemRoleSeed[] = [
  {
    systemCode: "CANDIDATE",
    name: "Candidate",
    isProtected: true,
    permissions: candidateOwnPermissions.map((code) => ({ code, scope: "OWN" })),
  },
  {
    systemCode: "SUPPORT_ADMIN",
    name: "Support Admin",
    isProtected: true,
    permissions: [
      { code: "user.view", scope: "SYSTEM" },
      { code: "company.view", scope: "SYSTEM" },
      { code: "job.view", scope: "SYSTEM" },
    ],
  },
  {
    systemCode: "VERIFICATION_ADMIN",
    name: "Verification Admin",
    isProtected: true,
    permissions: [
      { code: "company.view", scope: "SYSTEM" },
      { code: "company.verify", scope: "SYSTEM" },
      { code: "company.suspend", scope: "SYSTEM" },
    ],
  },
  {
    systemCode: "MODERATION_ADMIN",
    name: "Moderation Admin",
    isProtected: true,
    permissions: [
      { code: "company.view", scope: "SYSTEM" },
      { code: "job.view", scope: "SYSTEM" },
      { code: "job.moderate", scope: "SYSTEM" },
    ],
  },
];
