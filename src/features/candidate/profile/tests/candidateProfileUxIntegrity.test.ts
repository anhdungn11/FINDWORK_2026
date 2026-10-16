/**
 * FINDWORK CP8C — PROFILE UX & DATA INTEGRITY REGRESSION TESTS
 *
 * Phạm vi: cô lập danh tính demo, phân loại lỗi 401/403/404/503/mạng,
 * import write-gate, ngôn ngữ quyền riêng tư và độc lập giữa các kịch bản.
 * Chạy bằng node:test (không DOM). Các kiểm tra giao diện dựa trên mã nguồn
 * được ghi rõ là "source" — không phải kết quả kiểm thử trình duyệt.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildSimulatedProfileFromDemoDraft,
  cloneDemoProfileFixture,
  createScenarioDemoProfile,
  MOCK_FIXTURE_DRAFT_SUMMARY,
  MOCK_FIXTURE_FRESHER_PROFILE,
  MOCK_FIXTURE_FULL_PROFILE,
} from "../fixtures/mockProfileData";
import { resolveProfileDisplayEmail } from "../utils/profileFormatters";
import { classifyCandidateLoadError, resolveImportAvailability } from "../utils/loadErrorClassifier";
import { CandidateServiceError } from "../services/candidateProfileService";
import { DEFAULT_PRIVACY_SETTINGS } from "../types/candidateProfile.types";

const REAL_EMAIL = "real.account@findwork.test";
const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("Demo identity isolation", () => {
  it("Full and Fresher demo personas are independent and flagged as sample", () => {
    assert.equal(MOCK_FIXTURE_FULL_PROFILE.fullName, "Trần Minh Hoàng");
    assert.equal(MOCK_FIXTURE_FRESHER_PROFILE.fullName, "Lê Thu Hà");
    assert.equal(MOCK_FIXTURE_FULL_PROFILE.isSampleData, true);
    assert.equal(MOCK_FIXTURE_FRESHER_PROFILE.isSampleData, true);
    assert.notEqual(MOCK_FIXTURE_FULL_PROFILE.contactEmail, MOCK_FIXTURE_FRESHER_PROFILE.contactEmail);
  });

  it("never mixes the authenticated account email into a demo persona", () => {
    for (const profile of [MOCK_FIXTURE_FULL_PROFILE, MOCK_FIXTURE_FRESHER_PROFILE]) {
      const email = resolveProfileDisplayEmail({ isPreview: true, profile, accountEmail: REAL_EMAIL });
      assert.notEqual(email, REAL_EMAIL);
      assert.match(email, /@example\.invalid$/);
    }
    // Ngay cả khi cờ isPreview sai nhưng hồ sơ là mẫu, vẫn không dùng email thật
    const leaked = resolveProfileDisplayEmail({
      isPreview: false,
      profile: MOCK_FIXTURE_FULL_PROFILE,
      accountEmail: REAL_EMAIL,
    });
    assert.notEqual(leaked, REAL_EMAIL);
  });

  it("real mode uses the account email and never fabricates one", () => {
    assert.equal(resolveProfileDisplayEmail({ isPreview: false, profile: null, accountEmail: REAL_EMAIL }), REAL_EMAIL);
    assert.equal(resolveProfileDisplayEmail({ isPreview: false, profile: null, accountEmail: null }), "");
  });

  it("demo draft keeps its own version and persona", () => {
    assert.equal(MOCK_FIXTURE_DRAFT_SUMMARY.version, 2);
    assert.equal(MOCK_FIXTURE_DRAFT_SUMMARY.isSampleData, true);
    assert.equal(MOCK_FIXTURE_DRAFT_SUMMARY.fullName, "Phạm Quốc Bảo");
  });
});

describe("Scenario switching and F5 restoration", () => {
  it("each scenario receives a deep, independent copy of its fixture", () => {
    const a = createScenarioDemoProfile("full")!;
    const b = createScenarioDemoProfile("full")!;
    assert.notEqual(a, b);
    a.education.push({ ...a.education[0], id: "mutated" });
    a.fullName = "Mutated";
    // "F5" = tạo lại state từ fixture gốc
    const restored = createScenarioDemoProfile("full")!;
    assert.equal(restored.fullName, MOCK_FIXTURE_FULL_PROFILE.fullName);
    assert.equal(restored.education.length, MOCK_FIXTURE_FULL_PROFILE.education.length);
    assert.equal(b.fullName, MOCK_FIXTURE_FULL_PROFILE.fullName);
  });

  it("switching full -> fresher does not leak prior values", () => {
    const full = createScenarioDemoProfile("full")!;
    full.fullName = "Edited In Full";
    const fresher = createScenarioDemoProfile("fresher")!;
    assert.equal(fresher.fullName, "Lê Thu Hà");
    assert.notEqual(fresher.contactEmail, full.contactEmail);
  });

  it("non-profile scenarios and real mode have no demo profile", () => {
    for (const p of ["draft", "nodraft", "loading", null]) {
      assert.equal(createScenarioDemoProfile(p), null);
    }
  });

  it("cloneDemoProfileFixture does not mutate the source fixture", () => {
    const before = JSON.stringify(MOCK_FIXTURE_FULL_PROFILE);
    const c = cloneDemoProfileFixture(MOCK_FIXTURE_FULL_PROFILE);
    c.skills.push({ ...c.skills[0], id: "x" });
    assert.equal(JSON.stringify(MOCK_FIXTURE_FULL_PROFILE), before);
  });

  it("simulated import is in-memory, labelled sample, and does not touch the Full fixture", () => {
    const before = JSON.stringify(MOCK_FIXTURE_FULL_PROFILE);
    const sim = buildSimulatedProfileFromDemoDraft(MOCK_FIXTURE_DRAFT_SUMMARY);
    assert.equal(sim.isSampleData, true);
    assert.match(sim.id, /^demo-/);
    assert.equal(sim.fullName, "Phạm Quốc Bảo");
    assert.equal(JSON.stringify(MOCK_FIXTURE_FULL_PROFILE), before);
    assert.deepEqual(sim.privacySetting, {
      searchableProfile: false,
      showEmail: false,
      showPhone: false,
      allowResumeDownload: false,
      allowJobMatching: true,
    });
  });

  it("[source] page keys each scenario so stale state cannot cross scenarios", () => {
    const page = src("../../../../pages/candidate/CandidateProfilePage.tsx");
    assert.match(page, /key=\{previewParam \?\? "__real__"\}/);
    assert.doesNotMatch(page, /candidate@findwork\.vn/);
    assert.doesNotMatch(page, /Chưa thể kết nối tới dịch vụ hồ sơ ứng viên\. Vui lòng thử lại sau\./);
    assert.doesNotMatch(page, /setSearchParams\(\{ preview: "full" \}\);\s*return;/);
  });

  it("[source] preview is disabled outside development", () => {
    const page = src("../../../../pages/candidate/CandidateProfilePage.tsx");
    assert.match(page, /const previewParam = isDev \? searchParams\.get\("preview"\) : null/);
  });
});

describe("Error classification (401/403/404/503/network)", () => {
  it("401 is session expiry, not a connection failure", () => {
    const c = classifyCandidateLoadError(new CandidateServiceError("x", 401, "UNAUTHORIZED"));
    assert.equal(c.state, "eligibility_unknown");
    assert.match(c.message ?? "", /hết hạn/);
  });

  it("403 is forbidden", () => {
    const c = classifyCandidateLoadError(new CandidateServiceError("x", 403, "FORBIDDEN"));
    assert.equal(c.state, "forbidden");
  });

  it("404 CANDIDATE_PROFILE_NOT_FOUND is a missing profile without error banner", () => {
    const c = classifyCandidateLoadError(new CandidateServiceError("x", 404, "CANDIDATE_PROFILE_NOT_FOUND"));
    assert.equal(c.state, "not_created_no_draft");
    assert.equal(c.message, null);
  });

  it("other 404 stays an error and keeps the server message", () => {
    const c = classifyCandidateLoadError(new CandidateServiceError("Route missing", 404, "NOT_FOUND"));
    assert.equal(c.state, "network_error");
    assert.equal(c.message, "Route missing");
  });

  it("503 keeps status and message", () => {
    const c = classifyCandidateLoadError(new CandidateServiceError("Catalog down", 503, "CANDIDATE_REFERENCE_CATALOG_UNAVAILABLE"));
    assert.equal(c.state, "network_error");
    assert.equal(c.status, 503);
    assert.equal(c.message, "Catalog down");
  });

  it("non-service errors are network failures with status 0", () => {
    const c = classifyCandidateLoadError(new TypeError("Failed to fetch"));
    assert.equal(c.state, "network_error");
    assert.equal(c.status, 0);
    assert.equal(c.code, "NETWORK_ERROR");
  });

  it("[source] hook discards stale responses and clears errors on scenario entry", () => {
    const hook = src("../hooks/useCandidateProfileIntegration.ts");
    assert.match(hook, /requestSeqRef\.current !== currentSeq/);
    assert.match(hook, /classifyCandidateLoadError\(err\)/);
  });
});

describe("Import write-gate", () => {
  it("real + writes disabled => blocked, cannot submit", () => {
    assert.deepEqual(resolveImportAvailability({ isPreview: false, isLiveWritesEnabled: false }), {
      mode: "blocked",
      canSubmit: false,
    });
  });

  it("demo => simulation regardless of gate", () => {
    assert.equal(resolveImportAvailability({ isPreview: true, isLiveWritesEnabled: false }).mode, "simulation");
  });

  it("real + writes enabled => real", () => {
    assert.equal(resolveImportAvailability({ isPreview: false, isLiveWritesEnabled: true }).mode, "real");
  });

  it("[source] banner and modal disable the import button when blocked, view never mounts modal", () => {
    const banner = src("../components/OnboardingImportBanner.tsx");
    const modal = src("../components/OnboardingImportPreviewModal.tsx");
    const view = src("../components/CandidateProfileView.tsx");
    assert.match(banner, /disabled=\{importBlocked\}/);
    assert.match(modal, /importBlocked \|\| isImporting/);
    assert.match(view, /\(isPreview \|\| isLiveWritesEnabled\) &&/);
  });

  it("[source] page demo import never calls the real import handler", () => {
    const page = src("../../../../pages/candidate/CandidateProfilePage.tsx");
    const idx = page.indexOf("onConfirmImport");
    const block = page.slice(idx, idx + 600);
    assert.match(block, /if \(isPreview\)[\s\S]*return;[\s\S]*integration\.handleConfirmImport/);
  });

  it("[source] hook write handlers are gated by ENABLE_LIVE_WRITES", () => {
    const hook = src("../hooks/useCandidateProfileIntegration.ts");
    const handlers = hook.match(/const handle[A-Za-z]+ = async/g) ?? [];
    const gates = hook.match(/if \(!isLiveWritesEnabled\(\)\)/g) ?? [];
    assert.equal(gates.length, handlers.length);
    assert.ok(handlers.length >= 10);
  });
});

describe("Privacy copy and defaults", () => {
  it("default contract is false/false/false/false/true", () => {
    assert.deepEqual(DEFAULT_PRIVACY_SETTINGS, {
      searchableProfile: false,
      showEmail: false,
      showPhone: false,
      allowResumeDownload: false,
      allowJobMatching: true,
    });
  });

  it("[source] modal no longer makes absolute promises and lists all five flags", () => {
    const modal = src("../components/OnboardingImportPreviewModal.tsx");
    assert.doesNotMatch(modal, /HOÀN TOÀN KHÔNG/);
    for (const flag of ["searchableProfile", "showEmail", "showPhone", "allowResumeDownload", "allowJobMatching"]) {
      assert.ok(modal.includes(flag), `missing ${flag}`);
    }
    assert.match(modal, /chưa phải dữ liệu đã lưu/);
  });

  it("[source] privacy section is read-only while writes are disabled and distinguishes matching from searchable", () => {
    const section = src("../components/PrivacySettingsSection.tsx");
    assert.match(section, /const readOnly = !isPreview && !isLiveWritesEnabled/);
    assert.match(section, /disabled=\{isSaving \|\| readOnly\}/);
    assert.match(section, /khác với việc công khai hồ sơ/);
  });
});

describe("Accessibility & responsive modal (source)", () => {
  it("[source] modal is a labelled dialog with focus management", () => {
    const modal = src("../components/OnboardingImportPreviewModal.tsx");
    assert.match(modal, /role="dialog"/);
    assert.match(modal, /aria-modal="true"/);
    assert.match(modal, /aria-labelledby="import-preview-title"/);
    assert.match(modal, /useModalAccessibility/);
    const hookSrc = src("../utils/useModalAccessibility.ts");
    assert.match(hookSrc, /Escape/);
    assert.match(hookSrc, /Tab/);
    assert.match(hookSrc, /focus\(\)/);
  });

  it("[source] modal footer stays pinned and body scrolls", () => {
    const css = src("../styles/ProfileForms.module.css");
    assert.match(css, /\.modalBody \{[^}]*min-height: 0;/);
    assert.match(css, /\.modalFooter \{[^}]*flex-shrink: 0;/);
    assert.match(css, /max-height: calc\(100dvh - 2rem\)/);
    assert.match(css, /@media \(max-width: 639px\)/);
  });
});
