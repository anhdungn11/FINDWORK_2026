import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { apiClient } from "../../../services/http/apiClient";
import { getReturnDestination } from "../../../app/router/returnDestination";
import { applicationDraftService } from "../services/applicationDraftService";
import {
  resolveCandidateProfilePageState,
  resolveProfileDisplayEmail,
} from "../../candidate/profile/utils/profileFormatters";
import {
  MOCK_FIXTURE_FULL_PROFILE,
  MOCK_FIXTURE_DRAFT_SUMMARY,
  MOCK_FIXTURE_FRESHER_PROFILE,
} from "../../candidate/profile/fixtures/mockProfileData";
import { getCandidateRouteState } from "../../../app/guards/CandidateRoute";
import type { Resume } from "../../resume/types/resume.types";

describe("P0 Regressions: Performance, Return Flow, Profile Isolation", () => {
  const store = new Map<string, string>();

  const fakeSessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, String(val));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    clear: () => {
      store.clear();
    },
  };

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { sessionStorage: fakeSessionStorage },
    });
  });

  describe("P0-01: Performance & Fast Non-Blocking Navigation", () => {
    it("apiClient enforces a 10-second timeout to prevent requests from hanging indefinitely", () => {
      assert.equal(apiClient.defaults.timeout, 10000, "apiClient must configure a 10-second timeout");
    });

    it("CandidateRoute correctly classifies authentication states without freezing", () => {
      assert.equal(getCandidateRouteState("idle", false), "loading");
      assert.equal(getCandidateRouteState("loading", false), "loading");
      assert.equal(getCandidateRouteState("loggingOut", false), "loading");
      assert.equal(getCandidateRouteState("authenticated", true), "allowed");
      assert.equal(getCandidateRouteState("authenticated", false), "denied");
      assert.equal(getCandidateRouteState("unauthenticated", false), "denied");
    });
  });

  describe("P0-02: Application Return Flow & CV Selection", () => {
    const mockResumes: Resume[] = [
      {
        id: "resume-new-123",
        name: "CV mới",
        sourceType: "builder",
        isDefault: true,
        status: "ready",
        createdAt: "2026-10-18T10:00:00Z",
        updatedAt: "2026-10-18T10:00:00Z",
        currentVersion: {
          id: "ver-new-123",
          versionNumber: 1,
          file: null,
          builderContent: null,
          templateCode: "classic",
          builderSettings: null,
          createdAt: "2026-10-18T10:00:00Z",
        },
      },
      {
        id: "resume-old-456",
        name: "CV Cũ",
        sourceType: "builder",
        isDefault: false,
        status: "ready",
        createdAt: "2026-10-17T10:00:00Z",
        updatedAt: "2026-10-17T10:00:00Z",
        currentVersion: {
          id: "ver-old-456",
          versionNumber: 1,
          file: null,
          builderContent: null,
          templateCode: "modern",
          builderSettings: null,
          createdAt: "2026-10-17T10:00:00Z",
        },
      },
    ];

    it("getReturnDestination accepts numeric and UUID job application URLs safely", () => {
      assert.equal(getReturnDestination("/jobs/1/apply"), "/jobs/1/apply");
      assert.equal(getReturnDestination("/jobs/3/apply"), "/jobs/3/apply");
      assert.equal(
        getReturnDestination("/jobs/550e8400-e29b-41d4-a716-446655440000/apply"),
        "/jobs/550e8400-e29b-41d4-a716-446655440000/apply",
      );
      // Malicious or invalid paths fallback safely
      assert.equal(getReturnDestination("https://evil.com"), "/candidate");
      assert.equal(getReturnDestination("//evil.com"), "/candidate");
      assert.equal(getReturnDestination("/jobs/invalid@id/apply"), "/candidate");
    });

    it("restores user-scoped draft and preserves newly created CV selection", () => {
      const userId = "candidate-nanhdung";
      const jobId = 1;

      // Initial empty draft saved before CV was created
      applicationDraftService.saveDraft(userId, jobId, {
        currentStep: "resume",
        selectedResumeId: "",
        details: {
          contact: { fullName: "N Anh Dung", email: "nanhdung840@gmail.com", phone: "0901234567" },
          currentLocation: "Hồ Chí Minh",
          availability: "immediately",
          preferredContactMethod: "email",
          coverLetter: "Xin chào",
        },
        screeningAnswers: {},
      });

      const restored = applicationDraftService.getDraft(userId, jobId);
      assert.ok(restored !== null);
      assert.equal(restored.currentStep, "resume");

      // When returning with createdCvId:
      const createdCvId = "resume-new-123";
      const matchedResume = mockResumes.find((r) => r.id === createdCvId);
      assert.ok(matchedResume !== undefined);
      assert.equal(matchedResume.name, "CV mới");
      assert.equal(matchedResume.isDefault, true);

      // Save updated draft with created CV selected
      applicationDraftService.saveDraft(userId, jobId, {
        ...restored,
        selectedResumeId: matchedResume.id,
        selectedResumeVersionId: matchedResume.currentVersion.id,
      });

      const updatedDraft = applicationDraftService.getDraft(userId, jobId);
      assert.equal(updatedDraft?.selectedResumeId, "resume-new-123");
      assert.equal(updatedDraft?.selectedResumeVersionId, "ver-new-123");
    });

    it("preserves manual CV choice when user had explicitly chosen another CV", () => {
      const userId = "candidate-nanhdung";
      const jobId = 3;

      applicationDraftService.saveDraft(userId, jobId, {
        currentStep: "resume",
        selectedResumeId: "resume-old-456",
        details: {
          contact: { fullName: "N Anh Dung", email: "nanhdung840@gmail.com", phone: "0901234567" },
          currentLocation: "Hồ Chí Minh",
          availability: "immediately",
          preferredContactMethod: "email",
          coverLetter: "",
        },
        screeningAnswers: {},
      });

      // User cancels creation or returns without createdCvId
      const draft = applicationDraftService.getDraft(userId, jobId);
      assert.equal(draft?.selectedResumeId, "resume-old-456");
      const stillExists = mockResumes.some((r) => r.id === draft?.selectedResumeId);
      assert.equal(stillExists, true, "Existing manual selection must be preserved");
    });
  });

  describe("P0-03: Real Profile Data Isolation & Preview Gating", () => {
    it("hides development preview banner when navigating to /candidate/profile without preview query", () => {
      const normalNavigationResult = resolveCandidateProfilePageState({
        isDev: true,
        previewParam: null,
      });

      assert.equal(
        normalNavigationResult.showDevBanner,
        false,
        "Dev preview switcher banner must be hidden during normal /candidate/profile access",
      );
      assert.equal(normalNavigationResult.presentationState, "eligibility_unknown");
      assert.equal(normalNavigationResult.activeProfile, null);
      assert.equal(normalNavigationResult.activeDraft, null);
    });

    it("displays dev banner only when intentional preview query is supplied in dev mode", () => {
      const fullResult = resolveCandidateProfilePageState({
        isDev: true,
        previewParam: "full",
        demoProfile: MOCK_FIXTURE_FULL_PROFILE,
        draftFixture: MOCK_FIXTURE_DRAFT_SUMMARY,
      });
      assert.equal(fullResult.showDevBanner, true);
      assert.equal(fullResult.presentationState, "existing_profile");
      assert.equal(fullResult.activeProfile?.fullName, "Trần Minh Hoàng");

      const fresherResult = resolveCandidateProfilePageState({
        isDev: true,
        previewParam: "fresher",
        demoProfile: MOCK_FIXTURE_FRESHER_PROFILE,
        draftFixture: MOCK_FIXTURE_DRAFT_SUMMARY,
      });
      assert.equal(fresherResult.showDevBanner, true);
      assert.equal(fresherResult.presentationState, "existing_profile");
      assert.equal(fresherResult.activeProfile?.fullName, "Lê Thu Hà");

      const draftResult = resolveCandidateProfilePageState({
        isDev: true,
        previewParam: "draft",
        draftFixture: MOCK_FIXTURE_DRAFT_SUMMARY,
      });
      assert.equal(draftResult.showDevBanner, true);
      assert.equal(draftResult.presentationState, "not_created_with_draft");
    });

    it("strictly isolates real account email from demo personas", () => {
      const realAccountEmail = "nanhdung840@gmail.com";

      // 1. Real profile view must render authenticated account email
      const realDisplayEmail = resolveProfileDisplayEmail({
        isPreview: false,
        profile: { contactEmail: "other@example.com", isSampleData: false },
        accountEmail: realAccountEmail,
      });
      assert.equal(realDisplayEmail, realAccountEmail);

      // 2. Demo preview view must NEVER render authenticated account email
      const demoDisplayEmail = resolveProfileDisplayEmail({
        isPreview: true,
        profile: { contactEmail: "hoang.tran@example.invalid", isSampleData: true },
        accountEmail: realAccountEmail,
      });
      assert.equal(demoDisplayEmail, "hoang.tran@example.invalid");
      assert.notEqual(demoDisplayEmail, realAccountEmail);
    });

    it("completely blocks all preview modes and banners in production", () => {
      for (const preview of ["full", "fresher", "draft", "nodraft", "error"]) {
        const prodResult = resolveCandidateProfilePageState({
          isDev: false,
          previewParam: preview,
          demoProfile: MOCK_FIXTURE_FULL_PROFILE,
          draftFixture: MOCK_FIXTURE_DRAFT_SUMMARY,
        });

        assert.equal(prodResult.showDevBanner, false);
        assert.equal(prodResult.activeProfile, null);
        assert.equal(prodResult.activeDraft, null);
        assert.equal(prodResult.presentationState, "eligibility_unknown");
      }
    });
  });
});
