/**
 * FINDWORK CP8B — CANDIDATE PROFILE PRESENTATION TESTS
 * 
 * Unit tests using Node.js test runner (node:test & node:assert/strict).
 * Tests all presentation formatters, checklist logic, default privacy contracts,
 * and state separation rules without network dependencies.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGuidanceChecklist,
  formatCareerStatusLabel,
  formatCurrencyVND,
  formatDateOfBirth,
  formatGenderLabel,
  formatMonthYear,
  getAvatarInitials,
  resolveCandidateProfilePageState,
} from "../utils/profileFormatters";
import {
  MOCK_FIXTURE_DRAFT_SUMMARY,
  MOCK_FIXTURE_FRESHER_PROFILE,
  MOCK_FIXTURE_FULL_PROFILE,
} from "../fixtures/mockProfileData";
import {
  DEFAULT_PRIVACY_SETTINGS,
  type ImportOnboardingPayload,
} from "../types/candidateProfile.types";

describe("Candidate Profile Presentation Utilities", () => {
  describe("getAvatarInitials", () => {
    it("extracts initials from first and last words for multi-word full names", () => {
      assert.equal(getAvatarInitials("Trần Minh Hoàng"), "TH");
      assert.equal(getAvatarInitials("Nguyễn Thị Thu Hà"), "NH");
      assert.equal(getAvatarInitials("Lê Văn Ba"), "LB");
    });

    it("extracts first two characters when name is a single word", () => {
      assert.equal(getAvatarInitials("Hoàng"), "HO");
      assert.equal(getAvatarInitials("Alex"), "AL");
    });

    it("returns safe fallback 'UV' for empty, null, or whitespace-only inputs", () => {
      assert.equal(getAvatarInitials(""), "UV");
      assert.equal(getAvatarInitials("   "), "UV");
      assert.equal(getAvatarInitials(null), "UV");
      assert.equal(getAvatarInitials(undefined), "UV");
    });
  });

  describe("formatCareerStatusLabel", () => {
    it("maps each CandidateCareerStatus enum value accurately without guessing", () => {
      assert.equal(formatCareerStatusLabel("LOOKING_FOR_JOB"), "Đang tìm việc làm");
      assert.equal(formatCareerStatusLabel("STUDENT"), "Sinh viên / Đang đi học");
      assert.equal(formatCareerStatusLabel("INTERN"), "Thực tập sinh");
      assert.equal(formatCareerStatusLabel("EMPLOYED"), "Đang có việc làm");
      assert.equal(formatCareerStatusLabel("UNEMPLOYED"), "Chưa có việc làm");
      assert.equal(formatCareerStatusLabel("FREELANCER"), "Làm việc tự do (Freelance)");
      assert.equal(formatCareerStatusLabel("OTHER"), "Khác");
    });

    it("handles null or undefined career status safely", () => {
      assert.equal(formatCareerStatusLabel(null), "Chưa cập nhật trạng thái");
      assert.equal(formatCareerStatusLabel(undefined), "Chưa cập nhật trạng thái");
    });
  });

  describe("formatGenderLabel", () => {
    it("formats gender accurately", () => {
      assert.equal(formatGenderLabel("MALE"), "Nam");
      assert.equal(formatGenderLabel("FEMALE"), "Nữ");
      assert.equal(formatGenderLabel("OTHER"), "Khác");
      assert.equal(formatGenderLabel(null), "Chưa cập nhật");
      assert.equal(formatGenderLabel(undefined), "Chưa cập nhật");
    });
  });

  describe("formatMonthYear", () => {
    it("formats month and year with leading zeros for month < 10", () => {
      assert.equal(formatMonthYear(9, 2023), "09/2023");
      assert.equal(formatMonthYear(11, 2024), "11/2024");
      assert.equal(formatMonthYear(null, 2025), "2025");
      assert.equal(formatMonthYear(undefined, undefined), "");
    });
  });

  describe("formatCurrencyVND", () => {
    it("formats Vietnamese Dong with standard thousand separators", () => {
      assert.equal(formatCurrencyVND(15000000), "15.000.000");
      assert.equal(formatCurrencyVND("25000000"), "25.000.000");
      assert.equal(formatCurrencyVND(0), "0");
      assert.equal(formatCurrencyVND(null), "0");
      assert.equal(formatCurrencyVND("invalid"), "0");
    });
  });

  describe("formatDateOfBirth", () => {
    it("formats ISO date string into DD/MM/YYYY reliably", () => {
      assert.equal(formatDateOfBirth("1997-08-20T00:00:00.000Z"), "20/08/1997");
      assert.equal(formatDateOfBirth(null), "Chưa cập nhật");
    });
  });
});

describe("Candidate Profile Guidance Checklist Contract (No %, Not Rigid)", () => {
  it("builds guidance checklist without calculating or returning any percentage score", () => {
    const checklist = buildGuidanceChecklist(MOCK_FIXTURE_FULL_PROFILE);
    assert.equal(checklist.length, 8);

    // Verify no item or checklist object claims a percentage field
    checklist.forEach((item) => {
      assert.ok(!("percent" in item), "Checklist items must not contain a percent property");
      assert.ok(typeof item.id === "string");
      assert.ok(typeof item.title === "string");
      assert.ok(typeof item.isCompleted === "boolean");
      assert.ok(typeof item.anchorId === "string");
    });
  });

  it("marks Work Experience as optional so fresher/student candidates are not forced into having experience", () => {
    const checklist = buildGuidanceChecklist(MOCK_FIXTURE_FRESHER_PROFILE);
    const expItem = checklist.find((item) => item.id === "experience");

    assert.ok(expItem, "Experience item must exist in guidance checklist");
    assert.equal(expItem.isOptional, true, "Work experience must be optional for candidates");
    assert.equal(expItem.isCompleted, false, "Fresher without experience is marked not completed honestly");

    // Other items completed for fresher
    const eduItem = checklist.find((item) => item.id === "education");
    assert.equal(eduItem?.isCompleted, true);
    const personalItem = checklist.find((item) => item.id === "personal");
    assert.equal(personalItem?.isCompleted, true);
  });

  it("handles null or undefined profile safely", () => {
    const emptyChecklist = buildGuidanceChecklist(null);
    assert.deepEqual(emptyChecklist, []);
  });
});

describe("Candidate Profile Privacy Defaults & Contract Alignment", () => {
  it("strictly initializes default privacy to false, false, false, false, true", () => {
    assert.equal(DEFAULT_PRIVACY_SETTINGS.searchableProfile, false, "searchableProfile must default to false");
    assert.equal(DEFAULT_PRIVACY_SETTINGS.showEmail, false, "showEmail must default to false");
    assert.equal(DEFAULT_PRIVACY_SETTINGS.showPhone, false, "showPhone must default to false");
    assert.equal(DEFAULT_PRIVACY_SETTINGS.allowResumeDownload, false, "allowResumeDownload must default to false");
    assert.equal(DEFAULT_PRIVACY_SETTINGS.allowJobMatching, true, "allowJobMatching must default to true");
  });

  it("existing profiles maintain their stored values from backend/props without override", () => {
    const stored = MOCK_FIXTURE_FULL_PROFILE.privacySetting;
    assert.ok(stored);
    assert.equal(stored.allowJobMatching, true);
    assert.equal(stored.searchableProfile, false);
  });
});

describe("Candidate Profile Onboarding Import Contract", () => {
  it("import payload contract strictly conforms to { version, confirmPrivacy }", () => {
    const payload: ImportOnboardingPayload = {
      version: 3,
      confirmPrivacy: true,
    };

    assert.equal(typeof payload.version, "number");
    assert.equal(typeof payload.confirmPrivacy, "boolean");

    // Must NOT contain full candidate data snapshot from client
    assert.ok(!("data" in payload), "Client must not send full draft data over import contract");
    assert.ok(!("personal" in payload));
    assert.ok(!("education" in payload));
    assert.ok(!("experience" in payload));
  });

  it("draft summary transparently flags local-only browser preview files (avatar and resume)", () => {
    assert.equal(MOCK_FIXTURE_DRAFT_SUMMARY.hasLocalAvatarFile, true);
    assert.equal(MOCK_FIXTURE_DRAFT_SUMMARY.hasLocalResumeFile, true);
    assert.ok(MOCK_FIXTURE_DRAFT_SUMMARY.educationCount >= 1);
    assert.ok(MOCK_FIXTURE_DRAFT_SUMMARY.version >= 1);
  });
});

describe("Candidate Profile Production Preview Security (P0)", () => {
  const previewParams = ["full", "fresher", "draft", "loading", "forbidden", "nodraft", "error", "unknown", ""];

  it("strictly bars mock fixtures in production mode (isDev: false) regardless of ?preview= query", () => {
    for (const previewParam of previewParams) {
      const result = resolveCandidateProfilePageState({
        isDev: false,
        previewParam,
        demoProfile: MOCK_FIXTURE_FULL_PROFILE,
        draftFixture: MOCK_FIXTURE_DRAFT_SUMMARY,
      });

      assert.equal(
        result.presentationState,
        "eligibility_unknown",
        `Production must enforce eligibility_unknown state for ?preview=${previewParam}`
      );
      assert.equal(
        result.activeProfile,
        null,
        `Production must never leak activeProfile for ?preview=${previewParam}`
      );
      assert.equal(
        result.activeDraft,
        null,
        `Production must never leak activeDraft for ?preview=${previewParam}`
      );
      assert.equal(
        result.showDevBanner,
        false,
        `Production must never show dev preview switcher banner for ?preview=${previewParam}`
      );
    }
  });

  it("allows mock fixtures and dev preview banner strictly when isDev: true", () => {
    // 1. Full preview
    const fullResult = resolveCandidateProfilePageState({
      isDev: true,
      previewParam: "full",
      demoProfile: MOCK_FIXTURE_FULL_PROFILE,
      draftFixture: MOCK_FIXTURE_DRAFT_SUMMARY,
    });
    assert.equal(fullResult.presentationState, "existing_profile");
    assert.equal(fullResult.activeProfile, MOCK_FIXTURE_FULL_PROFILE);
    assert.equal(fullResult.showDevBanner, true);

    // 2. Fresher preview
    const fresherResult = resolveCandidateProfilePageState({
      isDev: true,
      previewParam: "fresher",
      demoProfile: MOCK_FIXTURE_FRESHER_PROFILE,
      draftFixture: MOCK_FIXTURE_DRAFT_SUMMARY,
    });
    assert.equal(fresherResult.presentationState, "existing_profile");
    assert.equal(fresherResult.activeProfile, MOCK_FIXTURE_FRESHER_PROFILE);
    assert.equal(fresherResult.showDevBanner, true);

    // 3. Draft preview
    const draftResult = resolveCandidateProfilePageState({
      isDev: true,
      previewParam: "draft",
      demoProfile: MOCK_FIXTURE_FULL_PROFILE,
      draftFixture: MOCK_FIXTURE_DRAFT_SUMMARY,
    });
    assert.equal(draftResult.presentationState, "not_created_with_draft");
    assert.equal(draftResult.activeDraft, MOCK_FIXTURE_DRAFT_SUMMARY);
    assert.equal(draftResult.activeProfile, null);
    assert.equal(draftResult.showDevBanner, true);

    // 4. Loading preview
    const loadingResult = resolveCandidateProfilePageState({
      isDev: true,
      previewParam: "loading",
    });
    assert.equal(loadingResult.presentationState, "loading");
    assert.equal(loadingResult.showDevBanner, true);

    // 5. Forbidden preview
    const forbiddenResult = resolveCandidateProfilePageState({
      isDev: true,
      previewParam: "forbidden",
    });
    assert.equal(forbiddenResult.presentationState, "forbidden");
    assert.equal(forbiddenResult.showDevBanner, true);

    // 6. Nodraft preview
    const noDraftResult = resolveCandidateProfilePageState({
      isDev: true,
      previewParam: "nodraft",
    });
    assert.equal(noDraftResult.presentationState, "not_created_no_draft");
    assert.equal(noDraftResult.showDevBanner, true);

    // 7. Network error preview
    const errorResult = resolveCandidateProfilePageState({
      isDev: true,
      previewParam: "error",
    });
    assert.equal(errorResult.presentationState, "network_error");
    assert.equal(errorResult.showDevBanner, true);

    // 8. No preview param in dev
    const defaultDevResult = resolveCandidateProfilePageState({
      isDev: true,
      previewParam: null,
    });
    assert.equal(defaultDevResult.presentationState, "eligibility_unknown");
    assert.equal(defaultDevResult.showDevBanner, true);
  });
});
