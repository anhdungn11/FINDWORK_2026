export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
  },
  CANDIDATE: { ONBOARDING_DRAFT: "/candidate/onboarding-draft" },
  COMPANY_INVITATIONS: {
    ACCEPT: "/company-invitations/accept",
    LIST: (companyId: string) => `/companies/${companyId}/invitations`,
    CREATE: (companyId: string) => `/companies/${companyId}/invitations`,
    REVOKE: (companyId: string, invitationId: string) =>
      `/companies/${companyId}/invitations/${invitationId}/revoke`,
  },
} as const;
