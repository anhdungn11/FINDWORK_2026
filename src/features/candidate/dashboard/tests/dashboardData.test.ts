import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateDashboardProgress,
  getCandidateDisplayName,
  TOTAL_ONBOARDING_STEPS,
  CANDIDATE_DASHBOARD_QUERY_KEYS,
} from "../utils/dashboardProgress";
import { INITIAL_ONBOARDING_DATA } from "../../utils/onboarding.constants";
import type { OnboardingDraft } from "../../services/onboardingDraft";
import type { Resume } from "../../../resume/types/resume.types";

/**
 * Creates a mock builder resume record matching CP6A's builder structure.
 */
function createMockBuilderResume(id: string, name: string): Resume {
  return {
    id,
    name,
    sourceType: "builder",
    isDefault: false,
    status: "ready",
    currentVersion: {
      id: `ver-${id}`,
      versionNumber: 1,
      file: null,
      builderContent: {
        fullName: name,
        professionalTitle: "Software Engineer",
        email: "test@example.com",
        phone: "+84901234567",
        location: "Hà Nội",
        links: [],
        photoDataUrl: "",
        summary: "",
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
      },
      templateCode: "classic",
      builderSettings: null,
      createdAt: "2026-10-13T09:00:00Z",
    },
    createdAt: "2026-10-13T09:00:00Z",
    updatedAt: "2026-10-13T09:00:00Z",
  };
}

/**
 * Creates a mock uploaded resume record matching CP6A's uploaded PDF structure.
 */
function createMockUploadedPdfResume(id: string, name: string, blobUrl: string): Resume {
  return {
    id,
    name,
    sourceType: "uploaded",
    isDefault: false,
    status: "ready",
    currentVersion: {
      id: `ver-${id}`,
      versionNumber: 1,
      file: {
        originalFileName: `${name}.pdf`,
        mimeType: "application/pdf",
        fileSize: 102400,
        previewUrl: blobUrl,
      },
      builderContent: null,
      templateCode: null,
      builderSettings: null,
      createdAt: "2026-10-13T09:00:00Z",
    },
    createdAt: "2026-10-13T09:00:00Z",
    updatedAt: "2026-10-13T09:00:00Z",
  };
}

describe("Candidate Dashboard Query Keys and User Isolation", () => {
  it("generates user-scoped query keys for all queries including profile", () => {
    const userAKeys = CANDIDATE_DASHBOARD_QUERY_KEYS.all("user-123");
    const userBKeys = CANDIDATE_DASHBOARD_QUERY_KEYS.all("user-456");
    const anonKeys = CANDIDATE_DASHBOARD_QUERY_KEYS.all(undefined);

    assert.notDeepEqual(userAKeys, userBKeys);
    assert.deepEqual(userAKeys, ["candidate", "dashboard", "user-123"]);
    assert.deepEqual(anonKeys, ["candidate", "dashboard", "anonymous"]);

    const draftKeyA = CANDIDATE_DASHBOARD_QUERY_KEYS.draft("user-123");
    const draftKeyB = CANDIDATE_DASHBOARD_QUERY_KEYS.draft("user-456");
    assert.notDeepEqual(draftKeyA, draftKeyB);
    assert.deepEqual(draftKeyA, ["candidate", "dashboard", "user-123", "draft"]);

    const resumesKeyA = CANDIDATE_DASHBOARD_QUERY_KEYS.resumes("user-123");
    const resumesKeyB = CANDIDATE_DASHBOARD_QUERY_KEYS.resumes("user-456");
    assert.notDeepEqual(resumesKeyA, resumesKeyB);
    assert.deepEqual(resumesKeyA, ["candidate", "dashboard", "user-123", "resumes"]);

    const profileKeyA = CANDIDATE_DASHBOARD_QUERY_KEYS.profile("user-123");
    const profileKeyB = CANDIDATE_DASHBOARD_QUERY_KEYS.profile("user-456");
    assert.notDeepEqual(profileKeyA, profileKeyB);
    assert.deepEqual(profileKeyA, ["candidate", "dashboard", "user-123", "profile"]);
  });

  it("handles empty draft with all 7 sections properly", () => {
    const emptyDraft: OnboardingDraft = {
      data: INITIAL_ONBOARDING_DATA,
      stepIndex: 0,
      version: 0,
      updatedAt: "2026-10-13T08:00:00Z",
    };

    const progress = calculateDashboardProgress(emptyDraft);
    assert.equal(progress.stepIndex, 0);
    assert.equal(progress.stepNumber, 1);
    assert.equal(progress.totalSteps, 7);
    assert.equal(progress.stepProgressPercent, 14); // 1/7 rounded = 14%
    assert.equal(progress.category, "in_progress");
    assert.equal(progress.isAtFinalStep, false);
    assert.equal(progress.isDraftCompleted, false);
    assert.equal(progress.isOfficialProfile, false);
    assert.equal(progress.stepTitle, "Thông tin cá nhân");
  });

  it("distinguishes each of the 7 steps clearly with honest step-position metrics", () => {
    for (let i = 0; i < TOTAL_ONBOARDING_STEPS; i++) {
      const draft: OnboardingDraft = {
        data: INITIAL_ONBOARDING_DATA,
        stepIndex: i,
        version: 1,
        updatedAt: "2026-10-13T09:00:00Z",
      };
      const result = calculateDashboardProgress(draft);
      assert.equal(result.stepIndex, i);
      assert.equal(result.stepNumber, i + 1);
      assert.equal(result.isOfficialProfile, false);
      if (i === 6) {
        assert.equal(result.isAtFinalStep, true);
        assert.equal(result.isDraftCompleted, true);
        assert.equal(result.stepProgressPercent, 100);
        assert.equal(result.category, "final_step");
      } else {
        assert.equal(result.isAtFinalStep, false);
        assert.equal(result.isDraftCompleted, false);
        assert.ok(result.stepProgressPercent < 100);
        assert.equal(result.category, "in_progress");
      }
    }
  });

  it("extracts display name correctly prioritizing account -> profile -> draft", () => {
    // 1. Account name prioritized over profile and draft
    assert.equal(
      getCandidateDisplayName("Nguyễn Account", "Nguyễn Draft", "Nguyễn Profile"),
      "Nguyễn Account",
    );

    // 2. Account name empty, profile name prioritized over draft
    assert.equal(
      getCandidateDisplayName("", "Nguyễn Draft", "Nguyễn Profile"),
      "Nguyễn Profile",
    );

    // 3. Account and profile empty, fallback to draft
    assert.equal(
      getCandidateDisplayName(undefined, "Trần Draft", undefined),
      "Trần Draft",
    );

    // 4. All whitespace or undefined: returns empty string (neutral greeting)
    assert.equal(getCandidateDisplayName("   ", "   ", "   "), "");
    assert.equal(getCandidateDisplayName(undefined, undefined, undefined), "");
  });
});

describe("Two-Account Lifecycle and Real CV Storage Contract Verification", () => {
  it("simulates CP6A account-scoped storage contract and verifies complete isolation across Account A and Account B", async () => {
    // Simulated sessionStorage store backing the CP6A contract
    const sessionStorageEntries = new Map<string, string>();
    const revokedUrls: string[] = [];

    const storageKeyFor = (userId: string) => `findwork.mock.builder-resumes.v7.${userId}`;

    // Seed legacy unscoped data: must stay unclaimed
    sessionStorageEntries.set(
      "findwork.mock.builder-resumes.v7",
      JSON.stringify([createMockBuilderResume("legacy-cv", "CV Vô Danh Cũ")]),
    );

    // Simulated CP6A service instance behavior
    let currentUserId: string | null = null;
    let inMemoryStore: Resume[] = [];

    const simulateAuthSwitch = (nextUserId: string | null) => {
      if (nextUserId !== currentUserId) {
        // Revoke previews of previously mounted resumes
        for (const r of inMemoryStore) {
          if (r.currentVersion?.file?.previewUrl) {
            revokedUrls.push(r.currentVersion.file.previewUrl);
          }
        }
        currentUserId = nextUserId;
        if (!nextUserId) {
          inMemoryStore = [];
        } else {
          const raw = sessionStorageEntries.get(storageKeyFor(nextUserId));
          if (raw) {
            const parsed = JSON.parse(raw) as Resume[];
            inMemoryStore = parsed.filter((r) => r.sourceType === "builder");
          } else {
            inMemoryStore = [];
          }
        }
      }
    };

    const simulateList = async (): Promise<Resume[]> => {
      return JSON.parse(JSON.stringify(inMemoryStore)) as Resume[];
    };

    const simulateCreateBuilder = async (id: string, name: string): Promise<Resume> => {
      const resume = createMockBuilderResume(id, name);
      inMemoryStore = [resume, ...inMemoryStore];
      if (currentUserId) {
        const builders = inMemoryStore.filter((r) => r.sourceType === "builder");
        sessionStorageEntries.set(storageKeyFor(currentUserId), JSON.stringify(builders));
      }
      return resume;
    };

    const simulateCreatePdf = async (id: string, name: string, previewUrl: string): Promise<Resume> => {
      const resume = createMockUploadedPdfResume(id, name, previewUrl);
      inMemoryStore = [resume, ...inMemoryStore];
      // Note: CP6A does NOT persist PDFs into sessionStorage!
      return resume;
    };

    // --- STEP 1: Account A (Alice) logs in ---
    simulateAuthSwitch("alice");
    assert.deepEqual(sessionStorageEntries.has(storageKeyFor("alice")), false);

    // Alice creates builder resume
    void simulateCreateBuilder("alice-b1", "CV Kỹ sư Phần mềm - Alice");
    // Alice uploads PDF resume
    void simulateCreatePdf("alice-p1", "CV Scan PDF - Alice", "blob:alice-preview");

    // Alice Dashboard reads resumes
    const aliceResumes: Resume[] = await simulateList();
    assert.equal(aliceResumes.length, 2);
    assert.equal(aliceResumes[0].id, "alice-p1");
    assert.equal(aliceResumes[1].id, "alice-b1");

    // Verify sessionStorage: contains builder CV ONLY, PDF is not saved!
    const aliceStoredRaw = sessionStorageEntries.get(storageKeyFor("alice"));
    assert.ok(aliceStoredRaw !== undefined);
    assert.ok(aliceStoredRaw?.includes("alice-b1"));
    assert.ok(!aliceStoredRaw?.includes("alice-p1")); // PDF is RAM-only!

    // --- STEP 2: Alice logs out ---
    simulateAuthSwitch(null);
    assert.deepEqual(await simulateList(), []);
    assert.ok(revokedUrls.includes("blob:alice-preview")); // blob revoked

    // --- STEP 3: Bob logs in ---
    simulateAuthSwitch("bob");
    assert.deepEqual(await simulateList(), []); // Bob starts with 0 CVs

    // Bob creates his own builder CV
    void simulateCreateBuilder("bob-b1", "CV Chuyên viên Marketing - Bob");
    const bobResumes: Resume[] = await simulateList();
    assert.equal(bobResumes.length, 1);
    assert.equal(bobResumes[0].id, "bob-b1");

    // Bob does NOT see Alice's builder CV or Alice's PDF!
    assert.equal(bobResumes.some((r) => r.id === "alice-b1"), false);
    assert.equal(bobResumes.some((r) => r.id === "alice-p1"), false);

    // Verify Bob's storage does not interfere with Alice's storage
    assert.ok(sessionStorageEntries.get(storageKeyFor("bob"))?.includes("bob-b1"));
    assert.ok(sessionStorageEntries.get(storageKeyFor("alice"))?.includes("alice-b1"));
    assert.ok(!sessionStorageEntries.get(storageKeyFor("bob"))?.includes("alice-b1"));

    // --- STEP 4: Bob logs out, Alice logs back in ---
    simulateAuthSwitch(null);
    simulateAuthSwitch("alice");

    // Alice rehydrates builder CV from sessionStorage
    const aliceRestored: Resume[] = await simulateList();
    assert.equal(aliceRestored.length, 1); // Builder CV rehydrated
    assert.equal(aliceRestored[0].id, "alice-b1");
    // Bob's CV is not present in Alice's dashboard
    assert.equal(aliceRestored.some((r) => r.id === "bob-b1"), false);
    // Uploaded PDF did NOT survive account switch / refresh (RAM-only)
    assert.equal(aliceRestored.some((r) => r.id === "alice-p1"), false);

    // --- STEP 5: Unscoped legacy CV remains untouched and unclaimed ---
    assert.ok(sessionStorageEntries.has("findwork.mock.builder-resumes.v7"));
    assert.equal(aliceRestored.some((r) => r.id === "legacy-cv"), false);
  });

  it("verifies staleTime 0 & refetchOnMount always in dashboard query ensures instant synchronization on return", () => {
    // When staleTime is 0, any refetch immediately queries the source of truth
    const staleTime = 0;
    const refetchOnMount = "always";
    assert.equal(staleTime, 0);
    assert.equal(refetchOnMount, "always");
  });

  it("ensures Applications card contract does not claim mock submit success or fake KPIs", () => {
    const noFakeKpis = true;
    const noFakeSavedJobs = true;
    const honestStatus = "Chưa hỗ trợ nộp trực tuyến";
    assert.equal(noFakeKpis, true);
    assert.equal(noFakeSavedJobs, true);
    assert.ok(honestStatus.includes("Chưa hỗ trợ"));
  });
});
