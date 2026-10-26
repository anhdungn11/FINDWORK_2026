import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prepareImportRequest, type ImportConsentInput } from "../utils/importConsent";

const base: ImportConsentInput = {
  version: 73,
  confirmPrivacy: false,
  confirmPrivacyDifferences: false,
  confirmOmitUnsupportedAssets: false,
  hasPrivacyDifferences: true,
  hasUnsupportedAssets: true,
};

describe("onboarding import consent", () => {
  it("requires separate explicit acknowledgements for initial privacy, differences, and omitted assets", () => {
    assert.deepEqual(prepareImportRequest(base), { ok: false, missing: "privacy" });
    assert.deepEqual(prepareImportRequest({ ...base, confirmPrivacy: true }), { ok: false, missing: "differences" });
    assert.deepEqual(prepareImportRequest({ ...base, confirmPrivacy: true, confirmPrivacyDifferences: true }), { ok: false, missing: "assets" });
  });

  it("uses the current draft version and includes each consent only after it is given", () => {
    assert.deepEqual(prepareImportRequest({ ...base, confirmPrivacy: true, confirmPrivacyDifferences: true, confirmOmitUnsupportedAssets: true }), {
      ok: true,
      payload: { version: 73, confirmPrivacy: true, confirmPrivacyDifferences: true, confirmOmitUnsupportedAssets: true },
    });
  });

  it("does not claim consent for differences or assets absent from the saved draft", () => {
    assert.deepEqual(prepareImportRequest({ ...base, confirmPrivacy: true, hasPrivacyDifferences: false, hasUnsupportedAssets: false }), {
      ok: true,
      payload: { version: 73, confirmPrivacy: true },
    });
  });
});
