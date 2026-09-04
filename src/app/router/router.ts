export const ROUTES = {
    HOME: "/",

    // PUBLIC
    JOBS: "jobs",
    JOB_DETAIL: "jobs/:id",
    COMPANIES: "companies",
    COMPANY_DETAIL: "companies/:id",
    CV: "cv",
    CAREER: "career",

    // AUTH
    LOGIN: "login",
    REGISTER: "register",
    FORGOT_PASSWORD: "forgot-password",
    RESET_PASSWORD: "reset-password",
    VERIFY_EMAIL: "verify-email",
    // CANDIDATE
    CANDIDATE: "candidate",
    CANDIDATE_ONBOARDING: "onboarding",

    // EMPLOYER
    EMPLOYER: "employer",
    EMPLOYER_LOGIN: "employer/login",
    EMPLOYER_REGISTER: "employer/register",
    EMPLOYER_CREATE_JOB: "jobs/create",

    // ADMIN
    ADMIN: "admin",
} as const;