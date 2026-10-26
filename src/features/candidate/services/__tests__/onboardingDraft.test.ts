import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  draftSnapshot,
  normalizeOnboardingDraftPayload,
  restoreDraftData,
  safeStepIndex,
} from "../onboardingDraft";
import { INITIAL_ONBOARDING_DATA } from "../../utils/onboarding.constants";

describe("Private onboarding draft serialization", () => {
  it("keeps all seven sections and meaningful personal info", () => {
    const saved = draftSnapshot({
      ...INITIAL_ONBOARDING_DATA,
      personal: { ...INITIAL_ONBOARDING_DATA.personal, fullName: "Test User", phone: "0901234567" },
      education: [{ id: "e1", school: "Test University" } as (typeof INITIAL_ONBOARDING_DATA.education)[number]],
    });
    assert.equal(saved.personal.fullName, "Test User");
    assert.equal(saved.personal.phone, "0901234567");
    assert.equal(saved.education.length, 1);
    assert.deepEqual(Object.keys(saved).sort(), ["personal", "education", "experience", "skills", "languages", "preferences", "resume", "privacy"].sort());
  });

  it("does not promise nonexistent avatar upload", () => {
    const input = {
      ...INITIAL_ONBOARDING_DATA,
      personal: { ...INITIAL_ONBOARDING_DATA.personal, avatarUrl: "blob:http://localhost/test" },
    };
    assert.equal(draftSnapshot(input).personal.avatarUrl, "");
    assert.equal(input.personal.avatarUrl, "blob:http://localhost/test");
  });

  it("does not persist an ephemeral local CV file as an uploaded resume", () => {
    const snapshot = draftSnapshot({
      ...INITIAL_ONBOARDING_DATA,
      resume: { ...INITIAL_ONBOARDING_DATA.resume,
        resumeUrl: "blob:http://localhost/test", hasExistingResume: true,
        fileName: "resume.pdf", fileSize: 1234 },
    });
    assert.equal(snapshot.resume.resumeUrl, "");
    assert.equal(snapshot.resume.hasExistingResume, false);
    assert.equal(snapshot.resume.fileName, "");
  });

  it("restores missing new subfields to safe defaults", () => {
    const data = restoreDraftData({
      ...INITIAL_ONBOARDING_DATA,
      personal: { ...INITIAL_ONBOARDING_DATA.personal, fullName: "Tester" },
      privacy: { ...INITIAL_ONBOARDING_DATA.privacy, showPhone: false },
    });
    assert.equal(data.personal.fullName, "Tester");
    assert.equal(data.privacy.allowJobMatching, true);
  });

  it("never restores an invalid step index", () => {
    assert.equal(safeStepIndex(-1), 0);
    assert.equal(safeStepIndex(7), 0);
    assert.equal(safeStepIndex(4), 4);
    assert.equal(safeStepIndex(NaN), 0);
  });

  it("normalizes empty 200 response body ('') or null from GET /api/v1/candidate/onboarding-draft to null", () => {
    assert.equal(normalizeOnboardingDraftPayload(""), null);
    assert.equal(normalizeOnboardingDraftPayload(null), null);
    assert.equal(normalizeOnboardingDraftPayload(undefined), null);
    assert.equal(normalizeOnboardingDraftPayload({}), null);
  });

  it("normalizes valid onboarding draft payload preserving version and stepIndex", () => {
    const normalized = normalizeOnboardingDraftPayload({
      data: {
        personal: { ...INITIAL_ONBOARDING_DATA.personal, fullName: "Lê Minh Châu" },
      },
      stepIndex: 3,
      version: 4,
      updatedAt: "2026-10-16T01:00:00.000Z",
    });
    assert.ok(normalized);
    assert.equal(normalized.version, 4);
    assert.equal(normalized.stepIndex, 3);
    assert.equal(normalized.data.personal.fullName, "Lê Minh Châu");
    assert.equal(normalized.data.privacy.allowJobMatching, true);
  });
});
