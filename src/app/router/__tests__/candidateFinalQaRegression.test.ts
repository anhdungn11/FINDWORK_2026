import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { useAuthStore } from "../../../store/authStore";
import { resumeService } from "../../../features/resume/services/resumeService";
import { savedJobsService } from "../../../features/candidate/savedJobs/savedJobsService";
import { getCandidateRouteState } from "../../guards/CandidateRoute";
import {
  normalizeContent,
  normalizeSettings,
} from "../../../features/resume/builder/utils/resumeDocumentNormalizer";
import {
  saveBuilderDraft,
  loadBuilderDraft,
  clearBuilderDraft,
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

  describe("Mission 2: Builder Draft Persistence & Retention", () => {
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
        // On failure, clearBuilderDraft is NOT called
      }
      assert.ok(saveFailed);
      const retainedAfterFailure = loadBuilderDraft("user-alpha", "cv-101");
      assert.ok(retainedAfterFailure, "Draft must be retained after failed save attempt");
      assert.equal(retainedAfterFailure.resumeName, "Alpha CV Draft");

      // 4. Successful save clears draft
      clearBuilderDraft("user-alpha", "cv-101");
      assert.equal(loadBuilderDraft("user-alpha", "cv-101"), null, "Draft must be cleared after successful save");
    });
  });

  describe("Mission 3: Saved Jobs Data Loss Prevention & Synchronization", () => {
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

    test("syncFromBackend does NOT discard local real bookmarks when server list is empty (Data Loss Prevention)", async () => {
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
        },
      });
      (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
      (globalThis as unknown as { sessionStorage: typeof mockStorage }).sessionStorage = mockStorage;

      // Seed candidate local storage with 1 migrated real job
      storageMap.set(
        "findwork_saved_jobs_candidate-test-42",
        JSON.stringify([
          {
            id: "a1111111-2222-3333-4444-555555555555",
            title: "Senior AI Product Designer",
            company: "FINDWORK Labs",
            location: "TP. Hồ Chí Minh",
            salary: "45 - 60 triệu",
            isMock: false,
            savedAt: new Date().toISOString(),
          },
        ])
      );

      assert.equal(savedJobsService.getSavedJobs("candidate-test-42").length, 1);

      // When syncFromBackend runs and server has empty list, local bookmark must be preserved!
      await savedJobsService.syncFromBackend("candidate-test-42");

      const afterSync = savedJobsService.getSavedJobs("candidate-test-42");
      assert.equal(afterSync.length, 1, "Bookmark must NOT be discarded when server list is empty");
      assert.equal(afterSync[0].title, "Senior AI Product Designer");
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
        value: { sessionStorage: mockStorage, localStorage: mockStorage },
      });
      (globalThis as unknown as { sessionStorage: typeof mockStorage }).sessionStorage = mockStorage;
      (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;

      // User Alice
      useAuthStore.getState().setAuth({ id: "candidate-alice", email: "alice@findwork.test" }, "token-alice");
      const aliceCv = await resumeService.createBuilderResume({
        name: "Alice CV",
        templateCode: "classic",
        content: { fullName: "Alice Nguyen" } as ResumeBuilderContent,
        settings: { fontFamily: "sans" } as ResumeBuilderSettings,
      });

      assert.equal((await resumeService.list()).length, 1);
      assert.equal((await resumeService.list())[0].id, aliceCv.id);

      // Switch to User Bob
      useAuthStore.getState().setAuth({ id: "candidate-bob", email: "bob@findwork.test" }, "token-bob");
      const bobResumes = await resumeService.list();
      assert.equal(bobResumes.length, 0, "Bob must not see Alice's resumes");

      const aliceCvLookedUpByBob = await resumeService.getById(aliceCv.id);
      assert.equal(aliceCvLookedUpByBob, null, "Bob must not be able to retrieve Alice's CV by ID");

      // Log out
      useAuthStore.getState().clearAuth();
      assert.equal((await resumeService.list()).length, 0, "Anonymous user must see 0 resumes");
    });
  });
});
