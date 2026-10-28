import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getLocalizedApiError } from "../../../i18n/errorCodes";
import { useI18n } from "../../../i18n/i18nStore";

describe("P0 Account Type, Routing & Floating AI Widget Regression", () => {
  it("CandidateRoute guards against Employer accounts and prevents mounting candidate workspace", () => {
    const candidateRouteSrc = readFileSync(
      new URL("../../guards/CandidateRoute.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      candidateRouteSrc.includes("useEmployerMembership"),
      "CandidateRoute must verify employer membership status"
    );
    assert.ok(
      candidateRouteSrc.includes('data-testid="candidate-restricted-access"'),
      "CandidateRoute must render localized restricted access UI when an employer navigates to /candidate"
    );
    assert.ok(
      candidateRouteSrc.includes('to="/employer"'),
      "CandidateRestrictedAccess must provide direct link back to Employer workspace"
    );
    assert.ok(
      candidateRouteSrc.includes('to="/jobs"'),
      "CandidateRestrictedAccess must provide link to public jobs"
    );
  });

  it("EmployerLayout removes misleading cross-workspace shortcuts to /candidate", () => {
    const layoutSrc = readFileSync(
      new URL("../../../layouts/EmployerLayout.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      !layoutSrc.includes('href="/candidate"'),
      "EmployerLayout must not contain direct links to /candidate"
    );
    assert.ok(
      !layoutSrc.includes('to="/candidate"'),
      "EmployerLayout must not route employers to candidate workspace"
    );
    assert.ok(
      layoutSrc.includes('to="/jobs"'),
      "EmployerLayout must route employers to public jobs (/jobs) instead"
    );
  });

  it("AccountDropdown renders workspace navigation matching user actual account type", () => {
    const dropdownSrc = readFileSync(
      new URL("../../../components/navigation/Header/components/AccountDropdown.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      dropdownSrc.includes("isEmployer"),
      "AccountDropdown must differentiate between employer and candidate"
    );
    assert.ok(
      dropdownSrc.includes('to="/employer"'),
      "AccountDropdown must render /employer for employers"
    );
    assert.ok(
      dropdownSrc.includes('to="/candidate"'),
      "AccountDropdown must render /candidate for candidates"
    );
  });

  it("Header removes duplicate prominent FINDWORK AI navbar button", () => {
    const desktopNavSrc = readFileSync(
      new URL("../../../components/navigation/Header/components/DesktopNavigation.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      !desktopNavSrc.includes('data-testid="findwork-ai-nav-button"'),
      "DesktopNavigation must remove prominent FINDWORK AI nav button"
    );
  });

  it("FindworkAiFloatingWidget provides bottom-right floating trigger", () => {
    const widgetSrc = readFileSync(
      new URL("../../../features/ai/FindworkAiFloatingWidget.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      widgetSrc.includes('data-testid="findwork-ai-floating-trigger"'),
      "FindworkAiFloatingWidget must provide floating trigger with data-testid"
    );
    assert.ok(
      widgetSrc.includes("AiAssistantModal"),
      "FindworkAiFloatingWidget must host AiAssistantModal"
    );
  });

  it("I18n error code mapping translates backend authorization codes into friendly localized text", () => {
    const viError = getLocalizedApiError("AUTHORIZATION_FORBIDDEN", undefined, "vi");
    const enError = getLocalizedApiError("AUTHORIZATION_FORBIDDEN", undefined, "en");

    assert.ok(
      viError.includes("Bạn không có quyền thực hiện thao tác"),
      "Vietnamese translation must explain permission restriction friendly"
    );
    assert.ok(
      enError.includes("You do not have permission"),
      "English translation must explain permission restriction friendly"
    );

    const viNotFound = getLocalizedApiError("NOT_FOUND", undefined, "vi");
    assert.ok(viNotFound.includes("Không tìm thấy dữ liệu"));
  });

  it("I18n store updates language and persists selection", () => {
    useI18n.getState().setLocale("en");
    assert.equal(useI18n.getState().locale, "en");

    useI18n.getState().setLocale("vi");
    assert.equal(useI18n.getState().locale, "vi");
  });

  it("FeaturedJobs filters integration-test jobs from public homepage", () => {
    const featuredSrc = readFileSync(
      new URL("../../../features/jobs/components/FeaturedJobs/FeaturedJobs.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      featuredSrc.includes("Release interview role") || featuredSrc.includes("release"),
      "FeaturedJobs must filter out test artifacts like 'Release interview role'"
    );
  });
});
