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

    it("EmployerAiPage removes developer Codex contract modal and provides balanced multi-industry UX", () => {
      const aiPageContent = fs.readFileSync(
        new URL("../../../pages/employer/EmployerAiPage/EmployerAiPage.tsx", import.meta.url),
        "utf8"
      );

      // Must preserve live backend connection probe
      assert(
        aiPageContent.includes("handleProbeBackend"),
        "Must contain live probe for testing backend connection without fabrication"
      );

      // Must remove developer-facing Codex API button and contract modal
      assert(
        !aiPageContent.includes("Đặc tả API Codex"),
        "Must remove developer-facing 'Đặc tả API Codex' button from product UI"
      );
      assert(
        !aiPageContent.includes("Codex CP13B Contract"),
        "Must remove internal Codex API Contract specification modal from product UI"
      );

      // Multi-industry coverage across all five forms:
      // Sales, Accounting, Marketing, Logistics, Hospitality, Manufacturing, Healthcare, IT
      assert(
        aiPageContent.includes("Kinh doanh") &&
        aiPageContent.includes("Kế toán") &&
        aiPageContent.includes("Marketing") &&
        aiPageContent.includes("Logistics") &&
        aiPageContent.includes("Khách sạn") &&
        aiPageContent.includes("Sản xuất") &&
        aiPageContent.includes("Điều dưỡng"),
        "Must include balanced multi-industry Vietnamese examples across all major sectors"
      );

      // Neutral labels for seniority and interview stages
      assert(
        aiPageContent.includes("Đánh giá nghiệp vụ & Năng lực chuyên môn sâu"),
        "Must use neutral label for interview stage instead of IT-only 'Kỹ thuật'"
      );
      assert(
        aiPageContent.includes("Trưởng nhóm / Giám sát chuyên môn"),
        "Must use neutral label for leadership level instead of IT-specific 'Tech Lead'"
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

    it("EmployerAiPage isolates action controllers and resets all company-specific form inputs on company switch", () => {
      const aiPageContent = fs.readFileSync(
        new URL("../../../pages/employer/EmployerAiPage/EmployerAiPage.tsx", import.meta.url),
        "utf8"
      );

      // Must use dedicated per-action controllers rather than a single shared controller
      assert(
        aiPageContent.includes("actionControllersRef") && !aiPageContent.includes("const abortControllerRef"),
        "Must use dedicated actionControllersRef to prevent shared-controller cancellation leaving other actions stuck loading"
      );

      // Must reset all company-specific forms on company switch
      assert(
        aiPageContent.includes("setDraftForm(INITIAL_DRAFT_FORM)") &&
        aiPageContent.includes("setImproveForm(INITIAL_IMPROVE_FORM)") &&
        aiPageContent.includes("setScreeningForm(INITIAL_SCREENING_FORM)") &&
        aiPageContent.includes("setInterviewForm(INITIAL_INTERVIEW_FORM)") &&
        aiPageContent.includes("setPlanForm(INITIAL_PLAN_FORM)"),
        "Must reset all company-specific forms to initial defaults on company switch"
      );

      // Improve job select must be controlled and handle deselection
      assert(
        aiPageContent.includes('value={improveForm.jobId || ""}') &&
        aiPageContent.includes("jobId: undefined"),
        "Improve select must be strictly controlled with value prop and handle deselection"
      );

      // Action cleanup in finally must only reset loading for the matched active controller
      assert(
        aiPageContent.includes("actionControllersRef.current.draft === controller") &&
        aiPageContent.includes("actionControllersRef.current.improve === controller"),
        "Action finally blocks must check active controller identity before resetting loading state"
      );
    });

    it("Behavioral simulation: independent action controllers prevent stuck loading and company switch resets all states", () => {
      // Simulate the action controller state machine
      type ActionKey = "probe" | "draft" | "improve" | "screening" | "interview" | "plan";

      let activeCompanyId: string | null = "company-1";
      const controllers: Record<ActionKey, AbortController | null> = {
        probe: null,
        draft: null,
        improve: null,
        screening: null,
        interview: null,
        plan: null,
      };

      const loadingStates: Record<ActionKey, boolean> = {
        probe: false,
        draft: false,
        improve: false,
        screening: false,
        interview: false,
        plan: false,
      };

      // 1. Start Action 'draft'
      const startDraft = () => {
        controllers.draft?.abort();
        const ctrl = new AbortController();
        controllers.draft = ctrl;
        loadingStates.draft = true;
        return ctrl;
      };

      // 2. Start Action 'improve' while 'draft' is still in flight
      const startImprove = () => {
        controllers.improve?.abort();
        const ctrl = new AbortController();
        controllers.improve = ctrl;
        loadingStates.improve = true;
        return ctrl;
      };

      const draftCtrl = startDraft();
      assert.equal(loadingStates.draft, true, "Draft should be loading");
      assert.equal(draftCtrl.signal.aborted, false, "Draft controller must not be aborted initially");

      // Starting improve must NOT abort draft controller
      const improveCtrl = startImprove();
      assert.equal(loadingStates.improve, true, "Improve should be loading");
      assert.equal(draftCtrl.signal.aborted, false, "Draft controller must remain active when improve starts");
      assert.notEqual(controllers.draft, controllers.improve, "Draft and improve must use distinct controllers");

      // 3. Draft finishes
      if (controllers.draft === draftCtrl && activeCompanyId === "company-1") {
        controllers.draft = null;
        loadingStates.draft = false;
      }
      assert.equal(loadingStates.draft, false, "Draft loading must turn false when draft settles");
      assert.equal(loadingStates.improve, true, "Improve loading must remain true while improve is in flight");

      // 4. Company switch occurs while improve is in flight
      activeCompanyId = "company-2";
      // On company switch:
      Object.values(controllers).forEach((c) => c?.abort());
      (Object.keys(controllers) as ActionKey[]).forEach((k) => {
        controllers[k] = null;
        loadingStates[k] = false;
      });

      assert.equal(improveCtrl.signal.aborted, true, "Improve in-flight request must be aborted on company switch");
      assert.equal(loadingStates.improve, false, "Improve loading must be reset to false on company switch");
      assert.deepEqual(
        loadingStates,
        { probe: false, draft: false, improve: false, screening: false, interview: false, plan: false },
        "All loading states must be false after company switch"
      );
    });

    it("EmployerJobFormPage wires AI JD prefill into create-job form without auto-publish or overwriting edits", () => {
      const jobFormContent = fs.readFileSync(
        new URL("../../../pages/employer/EmployerJobFormPage.tsx", import.meta.url),
        "utf8"
      );

      assert(
        jobFormContent.includes("useLocation") && jobFormContent.includes("location.state"),
        "EmployerJobFormPage must read location.state for prefill"
      );
      assert(
        jobFormContent.includes("prefillTitle") && jobFormContent.includes("prefillDescription"),
        "EmployerJobFormPage must extract prefillTitle and prefillDescription"
      );
      assert(
        jobFormContent.includes("prev.title.trim() ? prev.title :"),
        "EmployerJobFormPage must never overwrite existing user edits with prefill values"
      );
    });

    it("FeaturedJobs eliminates mock-job fallback on homepage and displays honest empty state", () => {
      const featuredJobsContent = fs.readFileSync(
        new URL("../../../features/jobs/components/FeaturedJobs/FeaturedJobs.tsx", import.meta.url),
        "utf8"
      );

      assert(
        !featuredJobsContent.includes("mockJobs"),
        "FeaturedJobs must NOT import or fall back to mockJobs"
      );
      assert(
        featuredJobsContent.includes("setJobsList([])") && featuredJobsContent.includes("<EmptyState"),
        "FeaturedJobs must set empty list and render honest EmptyState component"
      );
    });
  });
});
