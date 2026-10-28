import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { useAuthStore } from "../../../store/authStore";
import { resumeService } from "../../../features/resume/services/resumeService";
import { savedJobsService } from "../../../features/candidate/savedJobs/savedJobsService";
import { getCandidateRouteState } from "../../guards/CandidateRoute";
import type { ResumeBuilderContent, ResumeBuilderSettings } from "../../../features/resume/types/resume.types";

describe("FINDWORK CP13C Candidate Final QA & Release Hardening Regression Suite", () => {
  describe("Mission 1 & 2: CV Builder & Preview Refresh Resilience", () => {
    test("builder resumes persist and rehydrate correctly across user session", async () => {
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
      (globalThis as any).sessionStorage = mockStorage;
      (globalThis as any).localStorage = mockStorage;

      // 1. Authenticate candidate Charlie
      useAuthStore.getState().setAuth({ id: "candidate-charlie", email: "charlie@test.vn" }, "jwt-charlie");

      // 2. Create a builder resume
      const cv = await resumeService.createBuilderResume({
        name: "Charlie Senior Engineer",
        templateCode: "modern",
        content: {
          fullName: "Charlie Nguyen",
          professionalTitle: "Senior Frontend Engineer",
          email: "charlie@test.vn",
          phone: "0901234567",
          location: "TP. Hồ Chí Minh",
          links: [],
          summary: "5+ years React experience",
          experience: [],
          education: [],
          skills: [],
          languages: [],
          certifications: [],
          projects: [],
          awards: [],
          activities: [],
          volunteering: [],
          references: [],
          customSections: [],
        } as ResumeBuilderContent,
        settings: {
          accentColor: "navy",
          fontFamily: "sans",
          density: "balanced",
          showPhoto: false,
          industryPreset: "technical",
          sectionOrder: ["summary", "experience", "education", "skills"],
          hiddenSections: [],
        } as ResumeBuilderSettings,
      });

      assert.ok(cv.id, "CV must have an ID");
      assert.equal(cv.name, "Charlie Senior Engineer");

      // 3. Verify getById rehydrates the resume
      const fetched = await resumeService.getById(cv.id);
      assert.ok(fetched, "Fetched CV should not be null");
      assert.equal(fetched.name, "Charlie Senior Engineer");
      assert.equal(fetched.currentVersion.templateCode, "modern");

      // 4. Update the CV
      const updated = await resumeService.updateBuilderResume({
        resumeId: cv.id,
        name: "Charlie Lead Engineer",
        templateCode: "modern",
        content: {
          ...cv.currentVersion.builderContent!,
          professionalTitle: "Lead Frontend Engineer",
        },
        settings: cv.currentVersion.builderSettings!,
      });

      assert.equal(updated.name, "Charlie Lead Engineer");
      assert.equal(updated.currentVersion.builderContent?.professionalTitle, "Lead Frontend Engineer");

      // 5. Verify direct lookup returns updated content
      const fetchedUpdated = await resumeService.getById(cv.id);
      assert.equal(fetchedUpdated?.name, "Charlie Lead Engineer");
      assert.equal(fetchedUpdated?.currentVersion.builderContent?.professionalTitle, "Lead Frontend Engineer");
    });

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
  });

  describe("Mission 3: Saved Jobs Guest-to-Candidate Migration", () => {
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
      (globalThis as any).localStorage = mockStorage;
      (globalThis as any).sessionStorage = mockStorage;

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

      // Now candidate logs in with userId: 'cand-user-99'
      // cand-user-99 already had a saved job from earlier
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
  });

  describe("Mission 4: Candidate Data Isolation", () => {
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
      (globalThis as any).sessionStorage = mockStorage;
      (globalThis as any).localStorage = mockStorage;

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
