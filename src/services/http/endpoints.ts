export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
  },
  CANDIDATE: {
    BOOTSTRAP: "/candidate/bootstrap",
    PROFILE: "/candidate/profile",
    IMPORT_ONBOARDING: "/candidate/profile/import-onboarding",
    EDUCATION: "/candidate/education",
    EDUCATION_ITEM: (id: string) => `/candidate/education/${id}`,
    EXPERIENCE: "/candidate/experience",
    EXPERIENCE_ITEM: (id: string) => `/candidate/experience/${id}`,
    SKILLS: "/candidate/skills",
    SKILL_ITEM: (id: string) => `/candidate/skills/${id}`,
    LANGUAGES: "/candidate/languages",
    LANGUAGE_ITEM: (id: string) => `/candidate/languages/${id}`,
    LANGUAGE_CERTIFICATES: (languageId: string) =>
      `/candidate/languages/${languageId}/certificates`,
    LANGUAGE_CERTIFICATE_ITEM: (languageId: string, certificateId: string) =>
      `/candidate/languages/${languageId}/certificates/${certificateId}`,
    CAREER_PREFERENCE: "/candidate/career-preference",
    PRIVACY: "/candidate/privacy",
    ONBOARDING_DRAFT: "/candidate/onboarding-draft",
  },
  COMPANY_INVITATIONS: {
    ACCEPT: "/company-invitations/accept",
    LIST: (companyId: string) => `/companies/${companyId}/invitations`,
    CREATE: (companyId: string) => `/companies/${companyId}/invitations`,
    REVOKE: (companyId: string, invitationId: string) =>
      `/companies/${companyId}/invitations/${invitationId}/revoke`,
  },
} as const;
