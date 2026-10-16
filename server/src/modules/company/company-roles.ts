/** Company-scoped bootstrap grants. Application review is limited to recruiting roles. */
export const DEFAULT_COMPANY_ROLES = [
  {
    name: "OWNER",
    isProtected: true,
    permissions: [
      "company.view",
      "company.update",
      "company.member.view",
      "company.member.invite",
      "company.member.update",
      "company.member.remove",
      "company.role.view",
      "company.role.manage",
      "company.audit.view",
      "company.ownership.transfer",
      "application.view",
      "application.review",
    ],
  },
  {
    name: "ADMIN",
    isProtected: false,
    permissions: [
      "company.view",
      "company.update",
      "company.member.view",
      "company.member.invite",
      "company.member.update",
      "company.member.remove",
      "company.role.view",
      "company.role.manage",
      "application.view",
      "application.review",
    ],
  },
  {
    name: "HR_MANAGER",
    isProtected: false,
    permissions: [
      "company.view",
      "company.member.view",
      "company.member.invite",
      "company.role.view",
      "application.view",
      "application.review",
    ],
  },
  { name: "RECRUITER", isProtected: false, permissions: ["company.view", "application.view", "application.review"] },
  { name: "HIRING_MANAGER", isProtected: false, permissions: ["company.view"] },
  { name: "VIEWER", isProtected: false, permissions: ["company.view"] },
] as const;

export type DefaultCompanyRoleName =
  (typeof DEFAULT_COMPANY_ROLES)[number]["name"];

export const DEFAULT_COMPANY_PERMISSION_CODES: readonly string[] = [
  ...new Set(DEFAULT_COMPANY_ROLES.flatMap((role) => [...role.permissions])),
];
