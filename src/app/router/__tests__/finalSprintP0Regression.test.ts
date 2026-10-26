import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  APPLICATION_STATUS_LABEL,
  type ApplicationStatus,
  type ApplicationReviewStatus,
} from "../../../services/api/apiTypes.ts";

describe("Final Accelerated Frontend Release Sprint P0 & P1 Regression", () => {
  it("JobsFilterBar uses exact Backend query parameter names and ONSITE workplace type", () => {
    const filterBarSrc = readFileSync(
      new URL("../../../pages/public/JobsPage/components/JobsFilterBar.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      filterBarSrc.includes('onFilterChange("provinceCode"'),
      "JobsFilterBar must set provinceCode query param"
    );
    assert.ok(
      filterBarSrc.includes('onFilterChange("categoryCode"'),
      "JobsFilterBar must set categoryCode query param"
    );
    assert.ok(
      filterBarSrc.includes('onFilterChange("workplaceType"'),
      "JobsFilterBar must set workplaceType query param"
    );
    assert.ok(
      filterBarSrc.includes('onFilterChange("employmentType"'),
      "JobsFilterBar must set employmentType query param"
    );
    assert.ok(
      filterBarSrc.includes('value="ONSITE"'),
      "JobsFilterBar workplace options must use ONSITE matching Backend enum, not ON_SITE"
    );
    assert.ok(
      !filterBarSrc.includes('value="ON_SITE"'),
      "JobsFilterBar must not contain invalid ON_SITE value"
    );
  });

  it("JobsPage normalizes both canonical and legacy alias query parameters on filter modification", () => {
    const jobsPageSrc = readFileSync(
      new URL("../../../pages/public/JobsPage/JobsPage.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      jobsPageSrc.includes('searchParams.get("provinceCode") || searchParams.get("province")'),
      "JobsPage must prioritize provinceCode with province fallback"
    );
    assert.ok(
      jobsPageSrc.includes('searchParams.get("categoryCode") || searchParams.get("category")'),
      "JobsPage must prioritize categoryCode with category fallback"
    );
    assert.ok(
      jobsPageSrc.includes('searchParams.get("workplaceType") || searchParams.get("workplace")'),
      "JobsPage must prioritize workplaceType with workplace fallback"
    );
    assert.ok(
      jobsPageSrc.includes('searchParams.get("employmentType") || searchParams.get("type")'),
      "JobsPage must prioritize employmentType with type fallback"
    );
    assert.ok(
      jobsPageSrc.includes('next.delete("province")') && jobsPageSrc.includes('next.delete("provinceCode")'),
      "handleFilterChange must clear both alias and canonical province keys to prevent stale duplicates"
    );
  });

  it("JobDetailPage extracts real location and employer logo from backend JobDto", () => {
    const detailSrc = readFileSync(
      new URL("../../../pages/public/JobDetailPage/JobDetailPage.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      detailSrc.includes("dto.locations?.find"),
      "BackendJobDetailPage must extract location from dto.locations"
    );
    assert.ok(
      detailSrc.includes("companyLogoUrl: dto.companyLogoUrl"),
      "BackendJobDetailPage must preserve companyLogoUrl from backend DTO"
    );
  });

  it("publicApi.listWards handles multi-page ward catalogs to guarantee 100% of wards are returned", () => {
    const apiSrc = readFileSync(
      new URL("../../../services/api/publicApi.ts", import.meta.url),
      "utf8"
    );

    assert.ok(
      apiSrc.includes("totalPages > 1"),
      "publicApi.listWards must paginate when totalPages > 1"
    );
    assert.ok(
      apiSrc.includes("/reference/wards"),
      "publicApi.listWards must call /reference/wards"
    );
  });

  it("locationReferenceService uses FINDWORK backend /reference/wards instead of third-party open-api", () => {
    const serviceSrc = readFileSync(
      new URL("../../../services/reference/locationReferenceService.ts", import.meta.url),
      "utf8"
    );

    assert.ok(
      !serviceSrc.includes("provinces.open-api.vn"),
      "locationReferenceService must not call external open-api.vn"
    );
    assert.ok(
      serviceSrc.includes("publicApi.listWards"),
      "locationReferenceService must query official publicApi.listWards"
    );
  });

  it("AiAssistantModal distinguishes CANDIDATE AI PRO and EMPLOYER BUSINESS AI with honest pricing disclaimers", () => {
    const aiModalSrc = readFileSync(
      new URL("../../../features/ai/AiAssistantModal.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      aiModalSrc.includes('user?.accountType === "EMPLOYER"'),
      "AiAssistantModal must inspect accountType"
    );
    assert.ok(
      aiModalSrc.includes("BUSINESS AI"),
      "AiAssistantModal must render BUSINESS AI badge for employers"
    );
    assert.ok(
      aiModalSrc.includes("CANDIDATE PRO AI"),
      "AiAssistantModal must render CANDIDATE PRO AI badge for candidates"
    );
    assert.ok(
      aiModalSrc.includes("showPricingModal"),
      "AiAssistantModal must provide pricing and product tier modal"
    );
    assert.ok(
      aiModalSrc.includes("Chưa mở bán (Thanh toán chưa khả dụng)"),
      "AiAssistantModal must display honest unpurchasable state for paid tiers"
    );
    assert.ok(
      aiModalSrc.includes("CHƯA được ban hành chính thức"),
      "AiAssistantModal must explicitly disclose that prices are not yet officially approved"
    );
  });

  it("AppRouter defines canonical /candidate/saved-jobs route and provides alias redirect for /candidate/savedJobs", () => {
    const routerSrc = readFileSync(
      new URL("../AppRouter.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      routerSrc.includes('path="saved-jobs"'),
      "AppRouter must declare canonical path='saved-jobs'"
    );
    assert.ok(
      routerSrc.includes('path="savedJobs"'),
      "AppRouter must declare path='savedJobs' redirect"
    );
    assert.ok(
      routerSrc.includes('to="/candidate/saved-jobs" replace'),
      "savedJobs route must redirect to /candidate/saved-jobs with replace"
    );
  });

  it("Applicant statuses in frontend exactly match Backend REVIEW_STATUSES and APPLICATION_STATUSES", () => {
    const expectedStatuses: ApplicationStatus[] = [
      "SUBMITTED",
      "REVIEWING",
      "SHORTLISTED",
      "INTERVIEW",
      "OFFERED",
      "REJECTED",
      "WITHDRAWN",
    ];

    const expectedReviewStatuses: ApplicationReviewStatus[] = [
      "REVIEWING",
      "SHORTLISTED",
      "INTERVIEW",
      "OFFERED",
      "REJECTED",
    ];

    for (const status of expectedStatuses) {
      assert.ok(
        APPLICATION_STATUS_LABEL[status],
        `APPLICATION_STATUS_LABEL must have human label for ${status}`
      );
    }

    assert.equal(APPLICATION_STATUS_LABEL["REVIEWING"], "Đang xem xét");
    assert.equal(APPLICATION_STATUS_LABEL["SHORTLISTED"], "Đạt sơ tuyển");
    assert.equal(APPLICATION_STATUS_LABEL["INTERVIEW"], "Phỏng vấn");
    assert.equal(APPLICATION_STATUS_LABEL["OFFERED"], "Đã gửi offer");
    assert.equal(APPLICATION_STATUS_LABEL["REJECTED"], "Đã từ chối");
  });
});
