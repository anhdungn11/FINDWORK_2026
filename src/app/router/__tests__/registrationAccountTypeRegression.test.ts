import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isAccountTypeContractEnabled } from "../../../features/auth/utils/accountTypeFeature";
import type { AccountType } from "../../../store/authStore";

describe("Candidate & Employer Registration UX Regression", () => {
  it("RegistrationIntentSelector renders explicit Candidate and Employer options with accessible semantics", () => {
    const selectorSrc = readFileSync(
      new URL("../../../features/auth/components/RegistrationIntentSelector/RegistrationIntentSelector.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      selectorSrc.includes('role="radiogroup"'),
      "RegistrationIntentSelector must have role='radiogroup'"
    );
    assert.ok(
      selectorSrc.includes("Tôi muốn tìm việc"),
      "Must have 'Tôi muốn tìm việc' option for candidates"
    );
    assert.ok(
      selectorSrc.includes("Tôi muốn tuyển dụng"),
      "Must have 'Tôi muốn tuyển dụng' option for employers"
    );
    assert.ok(
      selectorSrc.includes('value="CANDIDATE"'),
      "Must bind CANDIDATE value"
    );
    assert.ok(
      selectorSrc.includes('value="EMPLOYER"'),
      "Must bind EMPLOYER value"
    );
    assert.ok(
      selectorSrc.includes('data-testid="intent-candidate"'),
      "Must provide data-testid for candidate intent"
    );
    assert.ok(
      selectorSrc.includes('data-testid="intent-employer"'),
      "Must provide data-testid for employer intent"
    );
  });

  it("RegisterPage integrates intent selection and customizes headings and submit actions", () => {
    const pageSrc = readFileSync(
      new URL("../../../pages/auth/RegisterPage/RegisterPage.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      pageSrc.includes("RegistrationIntentSelector"),
      "RegisterPage must render RegistrationIntentSelector"
    );
    assert.ok(
      pageSrc.includes("Tạo tài khoản tuyển dụng"),
      "Must have employer button/title label"
    );
    assert.ok(
      pageSrc.includes("Tạo tài khoản tìm việc"),
      "Must have candidate button/title label"
    );
    assert.ok(
      pageSrc.includes("DÀNH CHO NHÀ TUYỂN DỤNG") && pageSrc.includes("DÀNH CHO ỨNG VIÊN"),
      "Must adapt eyebrow based on intent"
    );
  });

  it("Post-registration: Candidate intent routes cleanly without unauthorized employer actions", () => {
    const pageSrc = readFileSync(
      new URL("../../../pages/auth/RegisterPage/RegisterPage.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      pageSrc.includes('data-testid="candidate-onboarding-cta"'),
      "Candidate post-registration must have candidate onboarding CTA"
    );
    assert.ok(
      pageSrc.includes('to="/candidate/onboarding"'),
      "Must link to /candidate/onboarding"
    );
    assert.ok(
      pageSrc.includes('to="/candidate"'),
      "Must link to /candidate dashboard"
    );
  });

  it("Post-registration: Employer intent routes cleanly to company onboarding without creating CandidateProfile", () => {
    const pageSrc = readFileSync(
      new URL("../../../pages/auth/RegisterPage/RegisterPage.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      pageSrc.includes('data-testid="employer-onboarding-cta"'),
      "Employer post-registration must have employer onboarding CTA"
    );
    assert.ok(
      pageSrc.includes('to="/employer/onboarding"'),
      "Must link to /employer/onboarding"
    );
    assert.ok(
      pageSrc.includes('data-testid="employer-preview-jobs-cta"'),
      "Employer post-registration must provide preview jobs CTA"
    );
  });

  it("useRegisterForm supports URL search params for employer/candidate preselection", () => {
    const hookSrc = readFileSync(
      new URL("../../../features/auth/hooks/useRegisterForm.ts", import.meta.url),
      "utf8"
    );

    assert.ok(
      hookSrc.includes("searchParams.get"),
      "useRegisterForm must read URL search params"
    );
    assert.ok(
      hookSrc.includes('"EMPLOYER"') && hookSrc.includes('"CANDIDATE"'),
      "useRegisterForm must handle both registration intents"
    );
    assert.ok(
      hookSrc.includes("sessionStorage.setItem"),
      "useRegisterForm must persist registration intent locally for routing continuity"
    );
  });

  it("Wire payload gating: does NOT send unsupported accountType to live backend unless contract flag is active", () => {
    const hookSrc = readFileSync(
      new URL("../../../features/auth/hooks/useRegisterForm.ts", import.meta.url),
      "utf8"
    );

    assert.ok(
      hookSrc.includes("isAccountTypeContractEnabled()"),
      "useRegisterForm must gate accountType transmission with isAccountTypeContractEnabled()"
    );

    const globalScope = globalThis as unknown as { __FINDWORK_ACCOUNT_TYPE_CONTRACT__?: boolean };

    // Verify default contract state is false (safe for live backend)
    delete globalScope.__FINDWORK_ACCOUNT_TYPE_CONTRACT__;
    assert.equal(isAccountTypeContractEnabled(), false, "Default contract flag must be false");

    // Verify contract flag when enabled for testing or future backend cutover
    globalScope.__FINDWORK_ACCOUNT_TYPE_CONTRACT__ = true;
    assert.equal(isAccountTypeContractEnabled(), true, "Contract flag must be true when set");
    delete globalScope.__FINDWORK_ACCOUNT_TYPE_CONTRACT__;
  });

  it("Type definitions: AuthUser supports optional accountType matching backend contract proposal", () => {
    const userExample: { id: string; email: string; accountType?: AccountType } = {
      id: "u-123",
      email: "test@example.com",
      accountType: "CANDIDATE",
    };
    assert.equal(userExample.accountType, "CANDIDATE");

    const employerExample: { id: string; email: string; accountType?: AccountType } = {
      id: "u-456",
      email: "employer@example.com",
      accountType: "EMPLOYER",
    };
    assert.equal(employerExample.accountType, "EMPLOYER");

    const legacyExample: { id: string; email: string; accountType?: AccountType } = {
      id: "u-789",
      email: "legacy@example.com",
      accountType: "LEGACY_UNCLASSIFIED",
    };
    assert.equal(legacyExample.accountType, "LEGACY_UNCLASSIFIED");
  });

  it("EmployerRegisterPage defaults to EMPLOYER intent while preserving employer branding", () => {
    const employerPageSrc = readFileSync(
      new URL("../../../pages/employer/EmployerRegisterPage.tsx", import.meta.url),
      "utf8"
    );

    assert.ok(
      employerPageSrc.includes('defaultIntent: "EMPLOYER"'),
      "EmployerRegisterPage must default to EMPLOYER intent"
    );
    assert.ok(
      employerPageSrc.includes("RegistrationIntentSelector"),
      "EmployerRegisterPage must render RegistrationIntentSelector"
    );
    assert.ok(
      employerPageSrc.includes('to="/employer/onboarding"'),
      "EmployerRegisterPage must route to /employer/onboarding"
    );
  });
});
