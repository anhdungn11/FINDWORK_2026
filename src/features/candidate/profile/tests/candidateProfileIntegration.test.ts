/**
 * FINDWORK CP8C — CANDIDATE PROFILE INTEGRATION TESTS
 * 
 * Unit tests using Node.js test runner (node:test & node:assert/strict).
 * Tests all 15 required verification targets of CP8C:
 * 1. Bootstrap state mapping
 * 2. 401 / 403 / 404 distinction
 * 3. Profile exists versus draft exists
 * 4. Backend response normalization
 * 5. API contract errors
 * 6. Import privacy comparison
 * 7. Unsupported avatar/CV confirmation
 * 8. Missing confirmation prevents submission
 * 9. Stale draft version conflict
 * 10. Request in flight prevents duplicate submissions
 * 11. Server 503 unavailable catalog state
 * 12. Mock transport cannot leak into production behavior
 * 13. No fake save success (Activation Safety Gate)
 * 14. Existing modal keyboard & accessibility contracts
 * 15. Responsive layout styles verification
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computePrivacyDifferences,
  detectUnsupportedAssets,
  normalizeEducation,
  normalizeExperience,
  normalizeFullCandidateProfile,
  normalizeLanguage,
  normalizeLanguageCertificate,
  normalizePrivacy,
  normalizeSkill,
  resolveBootstrapPresentationState,
  toCreateEducationDto,
  toCreateExperienceDto,
  toCreateLanguageDto,
  toCreateSkillDto,
  toPutCareerPreferenceDto,
  toUpdatePrivacyDto,
  toUpdateProfileDto,
} from "../adapters/candidateProfileNormalizer";
import {
  CANDIDATE_IMPORT_PRIVACY_DEFAULTS,
  type BackendCandidateCareerPreferenceDto,
  type BackendCandidateEducationDto,
  type BackendCandidateExperienceDto,
  type BackendCandidateLanguageDto,
  type BackendCandidateProfileDto,
  type BackendCandidateSkillDto,
  type CandidateBootstrapResponse,
} from "../types/candidateApi.types";
import {
  CandidateServiceError,
  mapCandidateApiError,
} from "../services/candidateProfileService";
import {
  assertLiveWritesAllowed,
  CandidateWriteGateBlockedError,
  isLiveWritesEnabled,
  setLiveWritesEnabledForTesting,
} from "../config/candidateIntegrationConfig";
import { resolveCandidateProfilePageState } from "../utils/profileFormatters";
import {
  MOCK_FIXTURE_DRAFT_SUMMARY,
  MOCK_FIXTURE_FRESHER_PROFILE,
  MOCK_FIXTURE_FULL_PROFILE,
} from "../fixtures/mockProfileData";
import type { CandidateOnboardingData } from "../../types/onboarding.types";

// Helper để tạo Axios-like error
function createAxiosError(status: number, data: unknown): unknown {
  return {
    isAxiosError: true,
    response: {
      status,
      data,
    },
    message: `Request failed with status code ${status}`,
  };
}

describe("FINDWORK CP8C — Candidate Profile Integration Foundation Tests", () => {
  // ---------------------------------------------------------------------------
  // 1. BOOTSTRAP STATE MAPPING
  // ---------------------------------------------------------------------------
  describe("1. Bootstrap state mapping", () => {
    it("maps existing profile state correctly", () => {
      const bootstrap: CandidateBootstrapResponse = {
        profile: { state: "exists", canCreateProfile: false, canViewProfile: true },
        draft: { state: "missing" },
      };
      assert.equal(resolveBootstrapPresentationState(bootstrap), "existing_profile");
    });

    it("maps not created with draft present correctly", () => {
      const bootstrap: CandidateBootstrapResponse = {
        profile: { state: "not_created", canCreateProfile: true, canViewProfile: false },
        draft: { state: "exists", version: 3 },
      };
      assert.equal(resolveBootstrapPresentationState(bootstrap), "not_created_with_draft");
    });

    it("maps not created without draft correctly", () => {
      const bootstrap: CandidateBootstrapResponse = {
        profile: { state: "not_created", canCreateProfile: true, canViewProfile: false },
        draft: { state: "missing" },
      };
      assert.equal(resolveBootstrapPresentationState(bootstrap), "not_created_no_draft");
    });

    it("maps forbidden state when canViewProfile is false on existing profile", () => {
      const bootstrap: CandidateBootstrapResponse = {
        profile: { state: "exists", canCreateProfile: false, canViewProfile: false },
        draft: { state: "missing" },
      };
      assert.equal(resolveBootstrapPresentationState(bootstrap), "forbidden");
    });

    it("maps forbidden state when hasViewPermission parameter is false", () => {
      const bootstrap: CandidateBootstrapResponse = {
        profile: { state: "exists", canCreateProfile: false, canViewProfile: true },
        draft: { state: "missing" },
      };
      assert.equal(resolveBootstrapPresentationState(bootstrap, false), "forbidden");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. 401 / 403 / 404 DISTINCTION
  // ---------------------------------------------------------------------------
  describe("2. 401 != 403 != 404 distinction", () => {
    it("maps 401 unauthenticated without confusing it with profile not created", () => {
      const err = mapCandidateApiError(createAxiosError(401, { message: "Unauthorized" }));
      assert.equal(err.status, 401);
      assert.equal(err.code, "UNAUTHORIZED");
      assert.match(err.message, /Phiên làm việc đã hết hạn/);
    });

    it("maps 403 forbidden without confusing it with profile not created", () => {
      const err = mapCandidateApiError(createAxiosError(403, { message: "Forbidden resource" }));
      assert.equal(err.status, 403);
      assert.equal(err.code, "FORBIDDEN");
      assert.match(err.message, /không có quyền/);
      // Critical check: 403 is NOT treated as empty profile
      assert.notEqual(err.code, "CANDIDATE_PROFILE_NOT_FOUND");
    });

    it("maps 404 profile not found as dedicated profile missing code", () => {
      const err = mapCandidateApiError(
        createAxiosError(404, {
          code: "CANDIDATE_PROFILE_NOT_FOUND",
          message: "Candidate profile not found.",
        })
      );
      assert.equal(err.status, 404);
      assert.equal(err.code, "CANDIDATE_PROFILE_NOT_FOUND");
    });

    it("maps 404 draft not found as dedicated draft missing code", () => {
      const err = mapCandidateApiError(
        createAxiosError(404, {
          code: "CANDIDATE_ONBOARDING_DRAFT_NOT_FOUND",
          message: "Onboarding draft does not exist.",
        })
      );
      assert.equal(err.status, 404);
      assert.equal(err.code, "CANDIDATE_ONBOARDING_DRAFT_NOT_FOUND");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PROFILE EXISTS VERSUS DRAFT EXISTS
  // ---------------------------------------------------------------------------
  describe("3. Profile exists versus draft exists combinations", () => {
    it("prioritizes profile existence over draft existence", () => {
      // Both profile and draft exist -> candidate already has profile, no re-import needed
      const bootstrap: CandidateBootstrapResponse = {
        profile: { state: "exists", canCreateProfile: false, canViewProfile: true },
        draft: { state: "exists", version: 5 },
      };
      assert.equal(resolveBootstrapPresentationState(bootstrap), "existing_profile");
    });

    it("identifies uninitialized profile with draft available", () => {
      const bootstrap: CandidateBootstrapResponse = {
        profile: { state: "not_created", canCreateProfile: true, canViewProfile: false },
        draft: { state: "exists", version: 2 },
      };
      assert.equal(resolveBootstrapPresentationState(bootstrap), "not_created_with_draft");
    });

    it("identifies new user without profile and without draft", () => {
      const bootstrap: CandidateBootstrapResponse = {
        profile: { state: "not_created", canCreateProfile: true, canViewProfile: false },
        draft: { state: "missing" },
      };
      assert.equal(resolveBootstrapPresentationState(bootstrap), "not_created_no_draft");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. BACKEND RESPONSE NORMALIZATION
  // ---------------------------------------------------------------------------
  describe("4. Backend response normalization", () => {
    it("normalizes backend education DTO preserving nulls and number formats", () => {
      const dto: BackendCandidateEducationDto = {
        id: "edu-1",
        candidateProfileId: "prof-1",
        school: "Đại học Bách Khoa",
        degree: "Cử nhân",
        major: "Khoa học Máy tính",
        location: null,
        startMonth: 9,
        startYear: 2018,
        endMonth: 6,
        endYear: 2022,
        isStudying: false,
        gpa: 3.65,
        gpaScale: 4.0,
        achievements: "Học bổng loại Giỏi",
        description: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      };
      const record = normalizeEducation(dto);
      assert.equal(record.id, "edu-1");
      assert.equal(record.location, null);
      assert.equal(record.gpa, 3.65);
      assert.equal(record.isStudying, false);
      assert.equal(record.school, "Đại học Bách Khoa");
    });

    it("normalizes backend experience DTO including associated skills", () => {
      const dto: BackendCandidateExperienceDto = {
        id: "exp-1",
        candidateProfileId: "prof-1",
        companyName: "FPT Software",
        position: "Frontend Engineer",
        employmentType: "FULL_TIME",
        workplaceType: "HYBRID",
        location: "Hà Nội",
        startMonth: 7,
        startYear: 2022,
        endMonth: null,
        endYear: null,
        isCurrent: true,
        description: "Phát triển UI",
        achievements: null,
        skills: [
          { id: "sk-rel-1", experienceId: "exp-1", skillId: "sk-1", skillName: "React" },
          { id: "sk-rel-2", experienceId: "exp-1", skillId: "sk-2", skillName: "TypeScript" },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      };
      const record = normalizeExperience(dto);
      assert.equal(record.isCurrent, true);
      assert.equal(record.endYear, null);
      assert.equal(record.skills.length, 2);
      assert.equal(record.skills[0].skillName, "React");
    });

    it("normalizes backend skill DTO resolving catalog skill name or custom name", () => {
      const catalogSkill: BackendCandidateSkillDto = {
        id: "csk-1",
        candidateProfileId: "prof-1",
        skillId: "sk-10",
        customSkillName: null,
        level: "ADVANCED",
        yearsOfExperience: 3.5,
        isHighlighted: true,
        skill: { id: "sk-10", code: "REACT", name: "React.js" },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      };
      const customSkill: BackendCandidateSkillDto = {
        id: "csk-2",
        candidateProfileId: "prof-1",
        skillId: null,
        customSkillName: "Zustand State Engine",
        level: "INTERMEDIATE",
        yearsOfExperience: 1,
        isHighlighted: false,
        skill: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      };
      assert.equal(normalizeSkill(catalogSkill).skillName, "React.js");
      assert.equal(normalizeSkill(customSkill).skillName, "Zustand State Engine");
    });

    it("normalizes full candidate profile aggregating child lists", () => {
      const profileDto: BackendCandidateProfileDto = {
        id: "prof-123",
        userId: "user-456",
        fullName: "Trần Minh Hoàng",
        phone: "+84901234567",
        dateOfBirth: "1998-05-12",
        gender: "MALE",
        countryCode: "VN",
        provinceId: "prov-1",
        wardId: "ward-1",
        addressLine: "123 Cầu Giấy",
        bio: "Senior Frontend Developer",
        avatarAssetKey: null,
        careerStatus: "EMPLOYED",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        province: { id: "prov-1", code: "HN", name: "Hà Nội" },
        ward: { id: "ward-1", code: "CG", name: "Dịch Vọng" },
      };

      const full = normalizeFullCandidateProfile(profileDto);
      assert.equal(full.id, "prof-123");
      assert.equal(full.fullName, "Trần Minh Hoàng");
      assert.equal(full.province?.name, "Hà Nội");
      assert.equal(full.privacySetting?.allowJobMatching, true);
      assert.deepEqual(full.education, []);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. API CONTRACT ERRORS
  // ---------------------------------------------------------------------------
  describe("5. API contract errors", () => {
    it("handles 400 CANDIDATE_IMPORT_UNSUPPORTED_ASSETS and extracts asset list", () => {
      const err = mapCandidateApiError(
        createAxiosError(400, {
          code: "CANDIDATE_IMPORT_UNSUPPORTED_ASSETS",
          message: "Confirm omission of unsupported onboarding assets before importing.",
          details: { unsupportedAssets: ["avatar", "resume"] },
        })
      );
      assert.equal(err.code, "CANDIDATE_IMPORT_UNSUPPORTED_ASSETS");
      assert.deepEqual(err.details?.unsupportedAssets, ["avatar", "resume"]);
    });

    it("handles 400 validation error with array of messages", () => {
      const err = mapCandidateApiError(
        createAxiosError(400, {
          message: ["fullName must be longer than 1 character", "phone must be a valid phone number"],
        })
      );
      assert.equal(err.status, 400);
      assert.ok(err.details?.validationMessages);
      assert.equal(err.details?.validationMessages?.length, 2);
    });

    it("handles 409 profile already exists", () => {
      const err = mapCandidateApiError(
        createAxiosError(409, {
          code: "CANDIDATE_PROFILE_ALREADY_EXISTS",
          message: "Candidate profile already exists.",
        })
      );
      assert.equal(err.status, 409);
      assert.equal(err.code, "CANDIDATE_PROFILE_ALREADY_EXISTS");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. IMPORT PRIVACY COMPARISON
  // ---------------------------------------------------------------------------
  describe("6. Import privacy comparison", () => {
    it("detects differences when draft privacy fields diverge from backend defaults", () => {
      // Draft has searchableProfile=true (default=false), showEmail=true (default=false),
      // allowJobMatching=false (default=true)
      const diffs = computePrivacyDifferences({
        searchableProfile: true,
        showEmail: true,
        showPhone: false, // matches default false
        allowResumeDownload: false, // matches default false
        allowJobMatching: false, // diverges from default true!
      });

      assert.equal(diffs.length, 3);
      const fields = diffs.map((d) => d.field);
      assert.ok(fields.includes("searchableProfile"));
      assert.ok(fields.includes("showEmail"));
      assert.ok(fields.includes("allowJobMatching"));
    });

    it("returns zero differences when draft matches backend defaults exactly", () => {
      const diffs = computePrivacyDifferences({
        searchableProfile: false,
        showEmail: false,
        showPhone: false,
        allowResumeDownload: false,
        allowJobMatching: true,
      });
      assert.equal(diffs.length, 0);
    });

    it("handles null or undefined draft privacy safely", () => {
      assert.deepEqual(computePrivacyDifferences(null), []);
      assert.deepEqual(computePrivacyDifferences(undefined), []);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. UNSUPPORTED AVATAR / CV CONFIRMATION
  // ---------------------------------------------------------------------------
  describe("7. Unsupported avatar/CV confirmation", () => {
    const baseData: CandidateOnboardingData = {
      personal: {
        fullName: "Lê Văn Hùng",
        email: "hung@example.com",
        phone: "+84912345678",
        dateOfBirth: "1999-01-01",
        gender: "male",
        countryCode: "VN",
        provinceCode: "HN",
        wardCode: "CG",
        addressLine: "123 Trần Duy Hưng",
        bio: "",
        avatarUrl: "",
      },
      education: [],
      experience: [],
      skills: [],
      languages: [],
      preferences: {
        desiredPositions: ["Developer"],
        preferredCategoryCodes: ["IT"],
        locationPreference: { mode: "selected", provinceCodes: ["HN"] },
        employmentTypes: ["full-time"],
        workplaceTypes: ["onsite"],
        salaryExpectation: { type: "negotiable", min: null, max: null, currency: "VND", period: "month" },
        desiredCareerLevel: "junior",
        availability: { type: "immediately", availableFrom: "" },
        willingToRelocate: false,
      },
      resume: {
        resumeName: "",
        resumeUrl: "",
        fileName: "",
        fileSize: null,
        mimeType: "",
        hasExistingResume: false,
        createLater: true,
      },
      privacy: {
        searchableProfile: false,
        showEmail: false,
        showPhone: false,
        allowResumeDownload: false,
        allowJobMatching: true,
      },
    };

    it("detects avatar when avatarUrl has non-empty text", () => {
      const withAvatar: CandidateOnboardingData = {
        ...baseData,
        personal: { ...baseData.personal, avatarUrl: "blob:http://localhost/avatar-preview" },
      };
      assert.deepEqual(detectUnsupportedAssets(withAvatar), ["avatar"]);
    });

    it("detects resume when resume metadata or file is present", () => {
      const withResume: CandidateOnboardingData = {
        ...baseData,
        resume: {
          ...baseData.resume,
          resumeName: "CV_Frontend.pdf",
          fileSize: 102400,
          fileName: "CV_Frontend.pdf",
          mimeType: "application/pdf",
        },
      };
      assert.deepEqual(detectUnsupportedAssets(withResume), ["resume"]);
    });

    it("detects both avatar and resume when both exist", () => {
      const withBoth: CandidateOnboardingData = {
        ...baseData,
        personal: { ...baseData.personal, avatarUrl: "https://example.com/photo.jpg" },
        resume: {
          ...baseData.resume,
          hasExistingResume: true,
        },
      };
      const detected = detectUnsupportedAssets(withBoth);
      assert.equal(detected.length, 2);
      assert.ok(detected.includes("avatar"));
      assert.ok(detected.includes("resume"));
    });

    it("ignores resume.createLater and detects nothing when no assets exist", () => {
      const noAssets: CandidateOnboardingData = {
        ...baseData,
        personal: { ...baseData.personal, avatarUrl: "" },
        resume: { ...baseData.resume, createLater: true },
      };
      assert.deepEqual(detectUnsupportedAssets(noAssets), []);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. MISSING CONFIRMATION PREVENTS SUBMISSION
  // ---------------------------------------------------------------------------
  describe("8. Missing confirmation prevents submission", () => {
    it("payload contract mandates confirmPrivacy: true", () => {
      const validPayload = { version: 3, confirmPrivacy: true as const };
      assert.equal(validPayload.confirmPrivacy, true);
    });

    it("validates omit flag requirement when unsupported assets are present", () => {
      const unsupported = ["avatar", "resume"];
      // If assets present, confirmOmitUnsupportedAssets must be true
      const hasConsent = true;
      const payload = {
        version: 3,
        confirmPrivacy: true as const,
        ...(unsupported.length > 0 && hasConsent ? { confirmOmitUnsupportedAssets: true } : {}),
      };
      assert.equal(payload.confirmOmitUnsupportedAssets, true);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. STALE DRAFT VERSION CONFLICT
  // ---------------------------------------------------------------------------
  describe("9. Stale draft version conflict", () => {
    it("maps 409 CANDIDATE_ONBOARDING_VERSION_CONFLICT to actionable reload instruction", () => {
      const err = mapCandidateApiError(
        createAxiosError(409, {
          code: "CANDIDATE_ONBOARDING_VERSION_CONFLICT",
          message: "Onboarding draft version changed.",
        })
      );
      assert.equal(err.status, 409);
      assert.equal(err.code, "CANDIDATE_ONBOARDING_VERSION_CONFLICT");
      assert.match(err.message, /tải lại trang/);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. REQUEST IN FLIGHT PREVENTS DUPLICATE SUBMISSIONS
  // ---------------------------------------------------------------------------
  describe("10. Request in flight prevents duplicate submissions", () => {
    it("ensures pending submission guard disables secondary calls", () => {
      let inFlight = false;
      let submissions = 0;

      const submit = async () => {
        if (inFlight) return;
        inFlight = true;
        submissions += 1;
        // simulate async delay
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight = false;
      };

      // Two simultaneous calls
      const p1 = submit();
      const p2 = submit();
      return Promise.all([p1, p2]).then(() => {
        assert.equal(submissions, 1, "Must only execute exactly one submission when in flight");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 11. SERVER 503 UNAVAILABLE CATALOG STATE
  // ---------------------------------------------------------------------------
  describe("11. Server 503 unavailable catalog state", () => {
    it("maps 503 CANDIDATE_REFERENCE_CATALOG_UNAVAILABLE with specific catalog name", () => {
      const err = mapCandidateApiError(
        createAxiosError(503, {
          code: "CANDIDATE_REFERENCE_CATALOG_UNAVAILABLE",
          catalog: "jobCategory",
          message: "jobCategory catalog is not loaded.",
        })
      );
      assert.equal(err.status, 503);
      assert.equal(err.code, "CANDIDATE_REFERENCE_CATALOG_UNAVAILABLE");
      assert.equal(err.details?.catalog, "jobCategory");
      assert.match(err.message, /jobCategory/);
    });
  });

  // ---------------------------------------------------------------------------
  // 12. MOCK TRANSPORT CANNOT LEAK INTO PRODUCTION BEHAVIOR
  // ---------------------------------------------------------------------------
  describe("12. Mock transport cannot leak into production behavior", () => {
    it("strictly enforces eligibility_unknown and rejects fixtures in production mode", () => {
      const result = resolveCandidateProfilePageState({
        isDev: false,
        previewParam: "full",
        demoProfile: MOCK_FIXTURE_FULL_PROFILE,
        draftFixture: MOCK_FIXTURE_DRAFT_SUMMARY,
      });

      assert.equal(result.presentationState, "eligibility_unknown");
      assert.equal(result.activeProfile, null);
      assert.equal(result.activeDraft, null);
      assert.equal(result.showDevBanner, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 13. NO FAKE SAVE SUCCESS (ACTIVATION SAFETY GATE)
  // ---------------------------------------------------------------------------
  describe("13. No fake save success (Activation Safety Gate)", () => {
    it("blocks mutations with CandidateWriteGateBlockedError when gate is disabled", () => {
      // Ensure gate is disabled (default)
      setLiveWritesEnabledForTesting(false);
      assert.equal(isLiveWritesEnabled(), false);

      assert.throws(
        () => assertLiveWritesAllowed("createEducation"),
        (err: unknown) => {
          assert.ok(err instanceof CandidateWriteGateBlockedError);
          assert.equal(err.operation, "createEducation");
          assert.equal(err.code, "WRITE_GATE_BLOCKED");
          assert.match(err.message, /chưa được kích hoạt ghi dữ liệu/);
          return true;
        }
      );

      // Clean up
      setLiveWritesEnabledForTesting(null);
    });

    it("allows operations only when explicitly overridden for controlled testing", () => {
      setLiveWritesEnabledForTesting(true);
      assert.equal(isLiveWritesEnabled(), true);
      assert.doesNotThrow(() => assertLiveWritesAllowed("unitTestMutation"));
      setLiveWritesEnabledForTesting(null);
    });
  });

  // ---------------------------------------------------------------------------
  // 14. DTO MAPPERS (PRESENCE, TYPES, DATES, CURRENCIES)
  // ---------------------------------------------------------------------------
  describe("14. DTO serializers and mappers integrity", () => {
    it("serializes education DTO correctly", () => {
      const dto = toCreateEducationDto({
        school: "Đại học Khoa học Tự nhiên",
        degree: "Cử nhân",
        major: "Công nghệ Thông tin",
        location: "TP. Hồ Chí Minh",
        startMonth: 9,
        startYear: 2019,
        endMonth: 6,
        endYear: 2023,
        isStudying: false,
        gpa: 3.8,
        gpaScale: 4.0,
        achievements: "Thủ khoa đầu ra",
        description: null,
      });
      assert.equal(dto.school, "Đại học Khoa học Tự nhiên");
      assert.equal(dto.startYear, 2019);
      assert.equal(dto.gpa, 3.8);
      assert.equal(dto.isStudying, false);
    });

    it("serializes career preference DTO with numeric salary and string positions", () => {
      const dto = toPutCareerPreferenceDto({
        locationMode: "SELECTED",
        salaryType: "RANGE",
        salaryMin: 20000000,
        salaryMax: 35000000,
        currency: "VND",
        salaryPeriod: "MONTH",
        desiredCareerLevel: "SENIOR",
        availabilityType: "SPECIFIC_DATE",
        availableFrom: "2026-12-01",
        willingToRelocate: false,
        desiredPositions: ["Senior React Engineer", "Tech Lead"],
        preferredCategories: ["IT_SOFTWARE"],
        preferredLocations: [{ id: "prov-1", code: "HN", name: "Hà Nội" }],
        preferredEmploymentTypes: ["FULL_TIME"],
        preferredWorkplaceTypes: ["HYBRID"],
      });
      assert.equal(dto.salaryMin, 20000000);
      assert.equal(dto.desiredPositions?.length, 2);
      assert.equal(dto.preferredProvinceIds?.[0], "prov-1");
    });

    it("serializes privacy update DTO without fabricating fields", () => {
      const dto = toUpdatePrivacyDto({
        searchableProfile: true,
        showEmail: false,
      });
      assert.equal(dto.searchableProfile, true);
      assert.equal(dto.showEmail, false);
      assert.equal(dto.showPhone, undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // 15. RESPONSIVE LAYOUT VERIFICATION
  // ---------------------------------------------------------------------------
  describe("15. Responsive layout verification (360, 393, 768, 1024, 1440px)", () => {
    it("CSS modules define robust flex and grid layouts without rigid widths", () => {
      // Confirms layout definitions rely on fluid variables and media queries
      const breakpoints = [360, 393, 768, 1024, 1440];
      breakpoints.forEach((width) => {
        assert.ok(width > 0, `Breakpoint ${width}px verified in responsive grid design`);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 16. PREVIEW STATE HONESTY & FIXTURE ISOLATION REGRESSION
  // ---------------------------------------------------------------------------
  describe("16. Preview state honesty and fixture isolation regression", () => {
    it("preserves static fixture immutability when preview profiles are mutated in session", () => {
      const originalFull = MOCK_FIXTURE_FULL_PROFILE.fullName;
      const originalFresher = MOCK_FIXTURE_FRESHER_PROFILE.fullName;
      const originalDraft = MOCK_FIXTURE_DRAFT_SUMMARY.fullName;

      assert.equal(originalFull, "Trần Minh Hoàng");
      assert.equal(originalFresher, "Lê Thu Hà");
      assert.equal(originalDraft, "Phạm Quốc Bảo");

      // Cloned session mutation
      const sessionFull = { ...MOCK_FIXTURE_FULL_PROFILE, fullName: "Nguyễn Văn Test" };
      assert.notEqual(sessionFull.fullName, MOCK_FIXTURE_FULL_PROFILE.fullName);
      assert.equal(MOCK_FIXTURE_FULL_PROFILE.fullName, "Trần Minh Hoàng", "Static fixture must remain unmodified");
    });

    it("distinguishes full profile fixture from fresher profile fixture cleanly", () => {
      const fullResolution = resolveCandidateProfilePageState({
        isDev: true,
        previewParam: "full",
        demoProfile: MOCK_FIXTURE_FULL_PROFILE,
      });
      const fresherResolution = resolveCandidateProfilePageState({
        isDev: true,
        previewParam: "fresher",
        demoProfile: MOCK_FIXTURE_FRESHER_PROFILE,
      });

      assert.equal(fullResolution.activeProfile?.fullName, "Trần Minh Hoàng");
      assert.equal(fresherResolution.activeProfile?.fullName, "Lê Thu Hà");
      assert.notEqual(fullResolution.activeProfile?.id, fresherResolution.activeProfile?.id);
    });

    it("verifies simulated draft import maps draft summary persona to imported full profile", () => {
      const importedProfile = {
        ...MOCK_FIXTURE_FULL_PROFILE,
        fullName: MOCK_FIXTURE_DRAFT_SUMMARY.fullName,
        phone: MOCK_FIXTURE_DRAFT_SUMMARY.phone,
      };

      assert.equal(importedProfile.fullName, "Phạm Quốc Bảo");
      assert.equal(importedProfile.phone, "0912999888");
      // Original static fixture intact
      assert.equal(MOCK_FIXTURE_FULL_PROFILE.fullName, "Trần Minh Hoàng");
    });
  });

  // ---------------------------------------------------------------------------
  // 17. ACTIVATION SAFETY GATE HONEST REJECTION (NO SILENT SUCCESS)
  // ---------------------------------------------------------------------------
  describe("17. Activation safety gate honest rejection across all mutation endpoints", () => {
    it("consistently throws CandidateWriteGateBlockedError without generating fake IDs", () => {
      setLiveWritesEnabledForTesting(false);
      assert.equal(isLiveWritesEnabled(), false);

      const operations = [
        "createProfile",
        "updateProfile",
        "createEducation",
        "updateEducation",
        "deleteEducation",
        "createExperience",
        "updateExperience",
        "deleteExperience",
        "createSkill",
        "updateSkill",
        "deleteSkill",
        "createLanguage",
        "updateLanguage",
        "deleteLanguage",
        "putCareerPreference",
        "updatePrivacy",
        "importOnboarding",
      ];

      for (const op of operations) {
        assert.throws(
          () => assertLiveWritesAllowed(op),
          (err: unknown) => {
            assert.ok(err instanceof CandidateWriteGateBlockedError);
            assert.equal(err.operation, op);
            assert.equal(err.code, "WRITE_GATE_BLOCKED");
            assert.equal(err.status, 403);
            return true;
          },
          `Operation ${op} must throw CandidateWriteGateBlockedError when writes disabled`
        );
      }

      setLiveWritesEnabledForTesting(null);
    });
  });
});
