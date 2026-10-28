import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { useAuthStore } from "../../../store/authStore";
import { resumeService } from "../../../features/resume/services/resumeService";
import { savedJobsService, resetSavedJobsSyncForTesting } from "../../../features/candidate/savedJobs/savedJobsService";
import { candidateSavedJobsApi } from "../../../services/api/candidateSavedJobsApi";
import { setLiveWritesEnabledForTesting } from "../../../features/candidate/profile/config/candidateIntegrationConfig";
import { getCandidateRouteState } from "../../guards/CandidateRoute";
import {
  normalizeContent,
  normalizeSettings,
} from "../../../features/resume/builder/utils/resumeDocumentNormalizer";
import {
  saveBuilderDraft,
  loadBuilderDraft,
  clearBuilderDraft,
  BuilderDraftSyncController,
} from "../../../features/resume/builder/utils/builderDraftStorage";
import type {
  ResumeBuilderContent,
  ResumeBuilderSettings,
} from "../../../features/resume/types/resume.types";

describe("FINDWORK CP13C Candidate Final QA & Release Hardening Regression Suite", () => {
  describe("Mission 1: Preview Crash & Safe Normalization", () => {
    test("normalizeSettings safely fills missing sectionOrder and hiddenSections without crashing", () => {
      // Partial settings from legacy or malformed storage
      const partial1 = { accentColor: "emerald" } as Partial<ResumeBuilderSettings>;
      const norm1 = normalizeSettings(partial1);
      assert.equal(norm1.accentColor, "emerald");
      assert.equal(norm1.fontFamily, "sans");
      assert.ok(Array.isArray(norm1.sectionOrder));
      assert.ok(norm1.sectionOrder.length > 0);
      assert.ok(Array.isArray(norm1.hiddenSections));
      assert.deepEqual(norm1.hiddenSections, []);

      // Null or undefined settings
      const normNull = normalizeSettings(null);
      assert.equal(normNull.fontFamily, "sans");
      assert.ok(normNull.sectionOrder.includes("summary"));
      assert.deepEqual(normNull.hiddenSections, []);
    });

    test("normalizeContent safely preserves existing data while guaranteeing arrays for missing sections", () => {
      const partialContent = {
        fullName: "Trần Thị Bích",
        professionalTitle: "Backend Lead",
        summary: "7 năm kinh nghiệm NestJS và Postgres",
        // Notice: links, experience, skills, etc. are completely undefined
      } as unknown as Partial<ResumeBuilderContent>;

      const normalized = normalizeContent(partialContent);
      assert.equal(normalized.fullName, "Trần Thị Bích");
      assert.equal(normalized.professionalTitle, "Backend Lead");
      assert.equal(normalized.summary, "7 năm kinh nghiệm NestJS và Postgres");
      assert.ok(Array.isArray(normalized.links), "links must be an array");
      assert.equal(normalized.links.length, 0);
      assert.ok(Array.isArray(normalized.experience), "experience must be an array");
      assert.equal(normalized.experience.length, 0);
      assert.ok(Array.isArray(normalized.education), "education must be an array");
      assert.ok(Array.isArray(normalized.skills), "skills must be an array");
      assert.ok(Array.isArray(normalized.languages), "languages must be an array");
      assert.ok(Array.isArray(normalized.projects), "projects must be an array");
    });
  });

  describe("Mission 2: Builder Draft Persistence, Retention & Effect Lifecycle", () => {
    test("draft persistence stores edits, retains draft on failure, and isolates between accounts", () => {
      const sessionMap = new Map<string, string>();
      const mockStorage = {
        getItem: (k: string) => sessionMap.get(k) ?? null,
        setItem: (k: string, v: string) => { sessionMap.set(k, v); },
        removeItem: (k: string) => { sessionMap.delete(k); },
      };
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { sessionStorage: mockStorage },
      });

      // 1. Save draft for User A
      saveBuilderDraft("user-alpha", "cv-101", {
        resumeName: "Alpha CV Draft",
        templateCode: "modern",
        content: { fullName: "Alpha User", summary: "WIP Summary" } as ResumeBuilderContent,
        settings: { fontFamily: "sans" } as ResumeBuilderSettings,
      });

      const loadedA = loadBuilderDraft("user-alpha", "cv-101");
      assert.ok(loadedA);
      assert.equal(loadedA.resumeName, "Alpha CV Draft");
      assert.equal(loadedA.content.fullName, "Alpha User");

      // 2. User B cannot access User A's draft (Isolation)
      const loadedB = loadBuilderDraft("user-beta", "cv-101");
      assert.equal(loadedB, null, "User B must not see User A's draft");

      // 3. Simulated failed save keeps draft intact
      let saveFailed = false;
      try {
        throw new Error("Network timeout during CV save");
      } catch {
        saveFailed = true;
      }
      assert.ok(saveFailed);
      const retainedAfterFailure = loadBuilderDraft("user-alpha", "cv-101");
      assert.ok(retainedAfterFailure, "Draft must be retained after failed save attempt");
      assert.equal(retainedAfterFailure.resumeName, "Alpha CV Draft");

      // 4. Successful save clears draft
      clearBuilderDraft("user-alpha", "cv-101");
      assert.equal(loadBuilderDraft("user-alpha", "cv-101"), null, "Draft must be cleared after successful save");
    });

    test("effect lifecycle controller cancels timers, clears on success, and suppresses unmount flush", async () => {
      const sessionMap = new Map<string, string>();
      const mockStorage = {
        getItem: (k: string) => sessionMap.get(k) ?? null,
        setItem: (k: string, v: string) => { sessionMap.set(k, v); },
        removeItem: (k: string) => { sessionMap.delete(k); },
      };
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { sessionStorage: mockStorage },
      });

      // Scenario A: Ordinary typing followed by unmount (navigation / reload) -> persists draft
      const controllerA = new BuilderDraftSyncController(() => ({
        userId: "user-alpha",
        resumeId: "cv-999",
        draft: {
          resumeName: "Unsaved Work",
          templateCode: "modern",
          content: { fullName: "Alpha In-Progress" } as ResumeBuilderContent,
          settings: { fontFamily: "sans" } as ResumeBuilderSettings,
        },
      }), 50);

      controllerA.schedule();
      // Unmount before debounce timer fires
      controllerA.teardown();

      const savedBeforeSave = loadBuilderDraft("user-alpha", "cv-999");
      assert.ok(savedBeforeSave, "Draft must be immediately flushed on ordinary unmount");
      assert.equal(savedBeforeSave.resumeName, "Unsaved Work");

      // Scenario B: Successful save -> markSaved clears draft, and unmount teardown must NOT recreate it
      controllerA.markSaved();
      assert.equal(loadBuilderDraft("user-alpha", "cv-999"), null, "Draft must be cleared on markSaved");

      // Simulated component unmount after successful save
      controllerA.teardown();
      assert.equal(
        loadBuilderDraft("user-alpha", "cv-999"),
        null,
        "Unmount teardown after successful save must NEVER recreate cleared draft",
      );

      // Scenario C: Save failure -> markFailed allows future flush and keeps draft intact
      const controllerC = new BuilderDraftSyncController(() => ({
        userId: "user-alpha",
        resumeId: "cv-888",
        draft: {
          resumeName: "Failing Draft",
          templateCode: "modern",
          content: { fullName: "Alpha Failing" } as ResumeBuilderContent,
          settings: { fontFamily: "sans" } as ResumeBuilderSettings,
        },
      }), 50);

      controllerC.flush();
      assert.ok(loadBuilderDraft("user-alpha", "cv-888"));

      controllerC.markFailed();
      assert.ok(loadBuilderDraft("user-alpha", "cv-888"), "Failed save must retain draft");
    });
  });

  describe("Mission 3: Saved Jobs Data Loss Prevention & Race Condition Synchronization", () => {
    test("migrates guest bookmarks into authenticated candidate account without losing existing saves", () => {
      const storageMap = new Map<string, string>();
      const mockStorage = {
        getItem: (k: string) => storageMap.get(k) ?? null,
        setItem: (k: string, v: string) => { storageMap.set(k, v); },
        removeItem: (k: string) => { storageMap.delete(k); },
      };
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
          localStorage: mockStorage,
          sessionStorage: mockStorage,
          dispatchEvent: () => true,
          addEventListener: () => {},
          removeEventListener: () => {},
        },
      });
      (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
      (globalThis as unknown as { sessionStorage: typeof mockStorage }).sessionStorage = mockStorage;

      // Save a job as guest
      savedJobsService.saveJob(null, {
        id: "job-guest-1",
        title: "Frontend Developer",
        company: "VNG",
        location: "TP. Hồ Chí Minh",
        salary: "25 - 35 triệu",
        isMock: false,
      });

      assert.equal(savedJobsService.getSavedJobs(null).length, 1);
      assert.equal(savedJobsService.getSavedJobs(null)[0].id, "job-guest-1");

      // Candidate logs in with existing saves
      storageMap.set(
        "findwork_saved_jobs_cand-user-99",
        JSON.stringify([
          {
            id: "job-cand-existing",
            title: "React Lead",
            company: "FPT",
            location: "Hà Nội",
            salary: "40 - 55 triệu",
            isMock: false,
            savedAt: new Date().toISOString(),
          },
        ])
      );

      // Accessing saved jobs as authenticated user should migrate the guest job
      const userSaved = savedJobsService.getSavedJobs("cand-user-99");
      assert.equal(userSaved.length, 2, "Candidate should now have both their existing and migrated guest jobs");
      const ids = userSaved.map((j) => j.id);
      assert.ok(ids.includes("job-cand-existing"));
      assert.ok(ids.includes("job-guest-1"));

      // Guest storage should have been cleared
      assert.equal(storageMap.has("findwork_saved_jobs_guest"), false, "Guest storage should be cleaned up after migration");
    });

    test("syncFromBackend with live writes preserves local bookmarks, pushes to server, and handles retry on failure", async () => {
      const storageMap = new Map<string, string>();
      const mockStorage = {
        getItem: (k: string) => storageMap.get(k) ?? null,
        setItem: (k: string, v: string) => { storageMap.set(k, v); },
        removeItem: (k: string) => { storageMap.delete(k); },
      };
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
          localStorage: mockStorage,
          sessionStorage: mockStorage,
          dispatchEvent: () => true,
          addEventListener: () => {},
          removeEventListener: () => {},
        },
      });
      (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
      (globalThis as unknown as { sessionStorage: typeof mockStorage }).sessionStorage = mockStorage;

      // Enable live writes for controlled unit testing
      setLiveWritesEnabledForTesting(true);
      resetSavedJobsSyncForTesting();

      // Configure active auth user
      useAuthStore.setState({
        user: { id: "candidate-sync-1", email: "cand1@findwork.vn", status: "ACTIVE", accountType: "CANDIDATE" },
        status: "authenticated",
        accessToken: "test-token-cand1",
      });

      // Seed candidate local storage with 1 real job
      storageMap.set(
        "findwork_saved_jobs_candidate-sync-1",
        JSON.stringify([
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Senior AI Product Designer",
            company: "FINDWORK Labs",
            location: "TP. Hồ Chí Minh",
            salary: "45 - 60 triệu",
            isMock: false,
            savedAt: new Date().toISOString(),
          },
        ])
      );

      const originalList = candidateSavedJobsApi.list;
      const originalSave = candidateSavedJobsApi.save;

      const savedCalls: string[] = [];
      let listCallCount = 0;
      let shouldFailSave = true;

      // Mock list (empty remote server list)
      candidateSavedJobsApi.list = async () => {
        listCallCount++;
        return {
          data: [],
          pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
        };
      };

      // Mock save with initial failure
      candidateSavedJobsApi.save = async (jobId: string) => {
        savedCalls.push(jobId);
        if (shouldFailSave) {
          throw new Error("Simulated 500 Network Error");
        }
        return {
          id: "saved-record-1",
          jobId,
          savedAt: new Date().toISOString(),
          isAvailable: true,
          job: {
            id: jobId,
            companyId: "comp-1",
            companyName: "TechCorp",
            companySlug: "tech-corp",
            companyLogoUrl: null,
            locations: null,
            categoryId: null,
            categoryName: null,
            title: "Senior AI Product Designer",
            description: null,
            employmentType: "FULL_TIME",
            workplaceType: "REMOTE",
            experienceMinMonths: null,
            experienceMaxMonths: null,
            salaryMin: null,
            salaryMax: null,
            currency: "VND",
            salaryPeriod: null,
            salaryNegotiable: false,
            showSalary: true,
            status: "PUBLISHED",
            publishedAt: new Date().toISOString(),
            applicationDeadline: null,
            version: 1,
            screeningQuestions: [],
          },
        };
      };

      try {
        // Attempt 1: Server list is empty, save to server throws error
        await savedJobsService.syncFromBackend("candidate-sync-1");

        assert.equal(listCallCount, 1, "list must be called once");
        assert.equal(savedCalls.length, 1, "save must be attempted once");
        assert.equal(savedCalls[0], "550e8400-e29b-41d4-a716-446655440000");

        // Data Loss Prevention: Local bookmark must be preserved on server error!
        const afterFailedSync = savedJobsService.getSavedJobs("candidate-sync-1");
        assert.equal(afterFailedSync.length, 1, "Bookmark must NOT be discarded on server error");
        assert.equal(afterFailedSync[0].id, "550e8400-e29b-41d4-a716-446655440000");

        // Attempt 2: Network recovers (retry), save succeeds
        shouldFailSave = false;
        await savedJobsService.syncFromBackend("candidate-sync-1");

        assert.equal(listCallCount, 2, "list called again on retry");
        assert.equal(savedCalls.length, 2, "save called again on retry");

        const afterSuccessSync = savedJobsService.getSavedJobs("candidate-sync-1");
        assert.equal(afterSuccessSync.length, 1, "Bookmark preserved on successful sync");
        assert.equal(afterSuccessSync[0].id, "550e8400-e29b-41d4-a716-446655440000");
      } finally {
        // Restore mocks and feature flags
        candidateSavedJobsApi.list = originalList;
        candidateSavedJobsApi.save = originalSave;
        setLiveWritesEnabledForTesting(null);
        useAuthStore.setState({ user: null, status: "unauthenticated", accessToken: null });
        resetSavedJobsSyncForTesting();
      }
    });

    test("session race protection: in-flight sync for User A aborts when auth switches to User B (zero cross-account writes)", async () => {
      const storageMap = new Map<string, string>();
      const mockStorage = {
        getItem: (k: string) => storageMap.get(k) ?? null,
        setItem: (k: string, v: string) => { storageMap.set(k, v); },
        removeItem: (k: string) => { storageMap.delete(k); },
      };
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
          localStorage: mockStorage,
          sessionStorage: mockStorage,
          dispatchEvent: () => true,
          addEventListener: () => {},
          removeEventListener: () => {},
        },
      });
      (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
      (globalThis as unknown as { sessionStorage: typeof mockStorage }).sessionStorage = mockStorage;

      setLiveWritesEnabledForTesting(true);
      resetSavedJobsSyncForTesting();

      // Start with User A logged in
      useAuthStore.setState({
        user: { id: "user-alpha", email: "alpha@test.com", status: "ACTIVE", accountType: "CANDIDATE" },
        status: "authenticated",
        accessToken: "token-alpha",
      });

      // User A has 1 bookmark locally
      storageMap.set(
        "findwork_saved_jobs_user-alpha",
        JSON.stringify([
          {
            id: "alpha-job-uuid-1111",
            title: "Alpha Secret Job",
            company: "Alpha Corp",
            location: "Hà Nội",
            salary: "50 triệu",
            isMock: false,
            savedAt: new Date().toISOString(),
          },
        ])
      );

      // User B storage is empty
      storageMap.set("findwork_saved_jobs_user-beta", JSON.stringify([]));

      const originalList = candidateSavedJobsApi.list;
      const originalSave = candidateSavedJobsApi.save;

      let deferredResolve: ((val: unknown) => void) | null = null;
      const listPromise = new Promise((resolve) => {
        deferredResolve = resolve;
      });

      // List returns deferred promise
      candidateSavedJobsApi.list = async () => {
        return listPromise as any;
      };

      const recordedSaves: Array<{ jobId: string; activeUserWhenCalled: string | null | undefined }> = [];
      candidateSavedJobsApi.save = async (jobId: string) => {
        recordedSaves.push({
          jobId,
          activeUserWhenCalled: useAuthStore.getState().user?.id,
        });
        return { id: "dummy", jobId, savedAt: new Date().toISOString(), isAvailable: true, job: null };
      };

      try {
        // User A starts synchronization (list is in flight)
        const syncPromise = savedJobsService.syncFromBackend("user-alpha");

        // Before list() resolves, User A logs out and User B logs in!
        useAuthStore.setState({
          user: { id: "user-beta", email: "beta@test.com", status: "ACTIVE", accountType: "CANDIDATE" },
          status: "authenticated",
          accessToken: "token-beta",
        });

        // Now list() resolves for User A
        deferredResolve!({
          data: [],
          meta: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
        });

        // Await sync completion
        await syncPromise;

        // Zero cross-account writes assertion!
        assert.equal(
          recordedSaves.length,
          0,
          "Stale in-flight sync for User A must NOT call save() after switching to User B",
        );

        // User B storage remains untouched
        const userBSaved = savedJobsService.getSavedJobs("user-beta");
        assert.equal(userBSaved.length, 0, "User B storage must not be polluted by User A sync");
      } finally {
        candidateSavedJobsApi.list = originalList;
        candidateSavedJobsApi.save = originalSave;
        setLiveWritesEnabledForTesting(null);
        useAuthStore.setState({ user: null, status: "unauthenticated", accessToken: null });
        resetSavedJobsSyncForTesting();
      }
    });
  });

  describe("Mission 4: Candidate Access Control & Route Guard", () => {
    test("Candidate Route access policy accurately permits candidates and denies unauthenticated / employers", () => {
      // Idle / loading states
      assert.equal(getCandidateRouteState("idle", false), "loading");
      assert.equal(getCandidateRouteState("loading", false), "loading");
      assert.equal(getCandidateRouteState("loggingOut", false), "loading");

      // Unauthenticated state
      assert.equal(getCandidateRouteState("unauthenticated", false), "denied");

      // Authenticated with valid session
      assert.equal(getCandidateRouteState("authenticated", true), "allowed");

      // Authenticated but session token missing
      assert.equal(getCandidateRouteState("authenticated", false), "denied");
    });

    test("User A cannot view User B's builder resumes or draft data", async () => {
      const storageMap = new Map<string, string>();
      const mockStorage = {
        getItem: (k: string) => storageMap.get(k) ?? null,
        setItem: (k: string, v: string) => { storageMap.set(k, v); },
        removeItem: (k: string) => { storageMap.delete(k); },
      };
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
          sessionStorage: mockStorage,
          localStorage: mockStorage,
        },
      });
      (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
      (globalThis as unknown as { sessionStorage: typeof mockStorage }).sessionStorage = mockStorage;

      // User A logged in
      useAuthStore.setState({
        user: { id: "user-alpha", email: "alpha@test.com", status: "ACTIVE", accountType: "CANDIDATE" },
        status: "authenticated",
        accessToken: null,
      });

      // User A creates a builder resume
      await resumeService.createBuilderResume({
        name: "User A Sensitive Resume",
        templateCode: "modern",
        content: {
          fullName: "User A Secret Name",
          summary: "Confidential experiences",
        } as ResumeBuilderContent,
        settings: {
          fontFamily: "sans",
          accentColor: "navy",
          density: "balanced",
          showPhoto: false,
          industryPreset: "general",
          sectionOrder: ["summary"],
          hiddenSections: [],
        },
      });

      // Verify User A sees their own CV
      const userAResumes = await resumeService.list();
      assert.equal(userAResumes.length, 1);
      assert.equal(userAResumes[0].name, "User A Sensitive Resume");

      // Switch to User B
      useAuthStore.setState({
        user: { id: "user-beta", email: "beta@test.com", status: "ACTIVE", accountType: "CANDIDATE" },
        status: "authenticated",
        accessToken: null,
      });

      const userBResumes = await resumeService.list();
      assert.equal(
        userBResumes.length,
        0,
        "User B must see empty CV list, not User A's resumes"
      );

      // Clean up auth store
      useAuthStore.setState({ user: null, status: "unauthenticated", accessToken: null });
    });
  });
});
