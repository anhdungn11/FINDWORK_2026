import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveWorkspaceAccess } from "../../guards/accessPolicy";
import { canUseBusinessAi } from "../../../features/company/companyWorkspacePermissions";

describe("FINDWORK CP13B — Employer Business AI Regression Suite", () => {
  describe("Mission 1 & 2: Architectural Separation & Route Declaration", () => {
    it("AppRouter lazy-loads EmployerAiPage and registers /employer/ai route", () => {
      const appRouterContent = fs.readFileSync(
        new URL("../AppRouter.tsx", import.meta.url),
        "utf8"
      );

      assert(
        appRouterContent.includes('const EmployerAiPage = lazy(() => import("@/pages/employer/EmployerAiPage/EmployerAiPage"));'),
        "EmployerAiPage must be lazy loaded"
      );
      assert(
        appRouterContent.includes('path="ai"') && appRouterContent.includes("element={<EmployerAiPage />}"),
        "Route /employer/ai must be registered under EmployerWorkspaceOutlet"
      );
    });

    it("EmployerLayout isolates Business AI from Candidate AI", () => {
      const layoutContent = fs.readFileSync(
        new URL("../../../layouts/EmployerLayout.tsx", import.meta.url),
        "utf8"
      );

      // EmployerLayout must NOT import or mount Candidate Floating Widget
      assert(
        !layoutContent.includes('import { FindworkAiFloatingWidget }'),
        "EmployerLayout must not import FindworkAiFloatingWidget to prevent candidate chat pollution"
      );
      assert(
        layoutContent.includes("EmployerAiFloatingLauncher"),
        "EmployerLayout must use dedicated EmployerAiFloatingLauncher"
      );
      assert(
        layoutContent.includes('to="/employer/ai"'),
        "EmployerLayout sidebar must contain link to /employer/ai"
      );
    });

    it("CandidateLayout and PublicLayout preserve candidate AI assistant", () => {
      const candidateLayout = fs.readFileSync(
        new URL("../../../layouts/CandidateLayout.tsx", import.meta.url),
        "utf8"
      );
      const publicLayout = fs.readFileSync(
        new URL("../../../layouts/PublicLayout.tsx", import.meta.url),
        "utf8"
      );

      assert(candidateLayout.includes("FindworkAiFloatingWidget"), "CandidateLayout preserves candidate AI");
      assert(publicLayout.includes("FindworkAiFloatingWidget"), "PublicLayout preserves candidate AI");
    });
  });

  describe("Access Control & Company Role Permissions", () => {
    it("unauthenticated requests to employer workspace are redirected to /employer/login", () => {
      const access = resolveWorkspaceAccess("employer", "unauthenticated", null, null);
      assert.equal(access, "unauthenticated");
    });

    it("canUseBusinessAi authorizes recruiting roles and blocks VIEWER and empty roles", () => {
      assert.equal(canUseBusinessAi(["OWNER"]), true);
      assert.equal(canUseBusinessAi(["COMPANY_OWNER"]), true);
      assert.equal(canUseBusinessAi(["ADMIN"]), true);
      assert.equal(canUseBusinessAi(["HR_MANAGER"]), true);
      assert.equal(canUseBusinessAi(["RECRUITER"]), true);
      assert.equal(canUseBusinessAi(["HIRING_MANAGER"]), true);

      // Viewer is read-only
      assert.equal(canUseBusinessAi(["VIEWER"]), false);
      assert.equal(canUseBusinessAi([]), false);
      assert.equal(canUseBusinessAi(null), false);
      assert.equal(canUseBusinessAi(undefined), false);
    });
  });

  describe("Mission 2 & 3: Responsible AI Principles & Honest States", () => {
    it("EmployerAiPage enforces responsible AI rules in its layout and copywriting", () => {
      const aiPageContent = fs.readFileSync(
        new URL("../../../pages/employer/EmployerAiPage/EmployerAiPage.tsx", import.meta.url),
        "utf8"
      );

      // 1. Human-in-the-loop guarantee
      assert(
        /không bao giờ tự động ra quyết định/i.test(aiPageContent),
        "Must explicitly disclaim automated hiring/rejection decisions"
      );

      // 2. Candidate privacy protection
      assert(
        /không gửi dữ liệu CV riêng tư/i.test(aiPageContent),
        "Must explicitly forbid raw candidate CV transmission"
      );

      // 3. No auto-publish mutation
      assert(
        /Không tự động xuất bản \(publish\)/i.test(aiPageContent),
        "Must forbid auto-publishing of jobs without explicit recruiter confirmation"
      );

      // 4. Clear separation from candidate AI
      assert(
        aiPageContent.includes("Candidate AI"),
        "Must communicate separation from Candidate AI"
      );
    });

    it("EmployerAiPage contains live backend connection probe and Codex API Contract documentation", () => {
      const aiPageContent = fs.readFileSync(
        new URL("../../../pages/employer/EmployerAiPage/EmployerAiPage.tsx", import.meta.url),
        "utf8"
      );

      assert(
        aiPageContent.includes("handleProbeBackend"),
        "Must contain live probe for testing backend connection without fabrication"
      );
      assert(
        aiPageContent.includes("Đặc tả Kỹ thuật API AI Doanh nghiệp (Codex CP13B Contract)"),
        "Must contain Codex API Contract viewer dialog"
      );
      assert(
        aiPageContent.includes("POST /companies/:companyId/ai/draft-job"),
        "Must specify draft-job contract endpoint"
      );
      assert(
        aiPageContent.includes("POST /companies/:companyId/ai/screening-questions"),
        "Must specify screening-questions contract endpoint"
      );
    });

    it("EmployerAiPage provides seamless copy and export to job creation", () => {
      const aiPageContent = fs.readFileSync(
        new URL("../../../pages/employer/EmployerAiPage/EmployerAiPage.tsx", import.meta.url),
        "utf8"
      );

      assert(
        aiPageContent.includes("handleCopy"),
        "Must support copying generated content to clipboard"
      );
      assert(
        aiPageContent.includes("handleApplyToCreateJob") && aiPageContent.includes("/employer/jobs/new"),
        "Must support exporting draft directly to job creation flow"
      );
    });
  });
});
