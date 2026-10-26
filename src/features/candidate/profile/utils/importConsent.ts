import type { ImportOnboardingPayload } from "../types/candidateProfile.types";

export interface ImportConsentInput {
  version: number;
  confirmPrivacy: boolean;
  confirmPrivacyDifferences: boolean;
  confirmOmitUnsupportedAssets: boolean;
  hasPrivacyDifferences: boolean;
  hasUnsupportedAssets: boolean;
}

export type ImportPreparation =
  | { ok: false; missing: "privacy" | "differences" | "assets" }
  | { ok: true; payload: ImportOnboardingPayload };

/** Build the import DTO only from the corresponding explicit acknowledgements. */
export function prepareImportRequest(input: ImportConsentInput): ImportPreparation {
  if (!input.confirmPrivacy) return { ok: false, missing: "privacy" };
  if (input.hasPrivacyDifferences && !input.confirmPrivacyDifferences) return { ok: false, missing: "differences" };
  if (input.hasUnsupportedAssets && !input.confirmOmitUnsupportedAssets) return { ok: false, missing: "assets" };
  return {
    ok: true,
    payload: {
      version: input.version,
      confirmPrivacy: true,
      ...(input.hasPrivacyDifferences ? { confirmPrivacyDifferences: true } : {}),
      ...(input.hasUnsupportedAssets ? { confirmOmitUnsupportedAssets: true } : {}),
    },
  };
}
