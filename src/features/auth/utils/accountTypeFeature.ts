/**
 * Feature gate for backend accountType contract.
 *
 * Baseline: Codex's Backend currently validates `RegisterDto` strictly with
 * `class-validator` (only `email` and `password` allowed). Sending `accountType`
 * will be rejected with HTTP 400 until the backend enum migration and cutover is merged.
 *
 * When VITE_ENABLE_ACCOUNT_TYPE_CONTRACT is "true", or during automated tests with
 * __FINDWORK_ACCOUNT_TYPE_CONTRACT__ = true, the registration wire payload
 * will include `accountType`.
 */
export const isAccountTypeContractEnabled = (): boolean => {
  const scope =
    typeof window !== "undefined"
      ? (window as unknown as { __FINDWORK_ACCOUNT_TYPE_CONTRACT__?: boolean })
      : typeof globalThis !== "undefined"
      ? (globalThis as unknown as { __FINDWORK_ACCOUNT_TYPE_CONTRACT__?: boolean })
      : null;

  if (scope && scope.__FINDWORK_ACCOUNT_TYPE_CONTRACT__ !== undefined) {
    return Boolean(scope.__FINDWORK_ACCOUNT_TYPE_CONTRACT__);
  }
  return typeof import.meta !== "undefined" && import.meta.env?.VITE_ENABLE_ACCOUNT_TYPE_CONTRACT === "true";
};
