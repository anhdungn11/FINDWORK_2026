/** Phase 4.3C.2B. Change these only with a matching review of tests and policy. */
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_COOLDOWN_MS = 60 * 1000;
export const EMAIL_VERIFICATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
