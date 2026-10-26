import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { applicationDraftService } from "../services/applicationDraftService";

describe("applicationDraftService", () => {
  const store = new Map<string, string>();

  const fakeSessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, String(val));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    get length() {
      return store.size;
    },
    key: (index: number) => {
      return Array.from(store.keys())[index] ?? null;
    },
    clear: () => {
      store.clear();
    },
  };

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { sessionStorage: fakeSessionStorage },
    });
  });

  it("saves and retrieves draft correctly for authenticated user and job", () => {
    applicationDraftService.saveDraft("user-1", "job-100", {
      currentStep: "details",
      selectedResumeId: "res-1",
      selectedResumeVersionId: "ver-1",
      details: {
        contact: {
          fullName: "Nguyen Van A",
          email: "nguyenvana@example.com",
          phone: "0901234567",
        },
        currentLocation: "Hà Nội",
        availability: "Sẵn sàng ngay",
        preferredContactMethod: "email",
        coverLetter: "Xin chào nhà tuyển dụng",
      },
      screeningAnswers: { q1: "3 năm kinh nghiệm" },
    });

    const restored = applicationDraftService.getDraft("user-1", "job-100");
    assert.ok(restored !== null);
    assert.equal(restored?.currentStep, "details");
    assert.equal(restored?.selectedResumeId, "res-1");
    assert.equal(restored?.selectedResumeVersionId, "ver-1");
    assert.equal(restored?.details.contact.fullName, "Nguyen Van A");
    assert.equal(restored?.details.contact.email, "nguyenvana@example.com");
    assert.equal(restored?.details.contact.phone, "0901234567");
    assert.equal(restored?.details.currentLocation, "Hà Nội");
    assert.equal(restored?.details.availability, "Sẵn sàng ngay");
    assert.equal(restored?.details.coverLetter, "Xin chào nhà tuyển dụng");
    assert.equal(restored?.screeningAnswers.q1, "3 năm kinh nghiệm");
    assert.equal(restored?.version, 1);
  });

  it("enforces strict user isolation (User B cannot read User A's draft)", () => {
    applicationDraftService.saveDraft("user-alice", "job-100", {
      currentStep: "details",
      selectedResumeId: "res-alice",
      details: {
        contact: { fullName: "Alice", email: "alice@example.com", phone: "0911111111" },
        currentLocation: "Đà Nẵng",
        availability: "1 tuần",
        preferredContactMethod: "email",
        coverLetter: "Alice cover letter",
      },
      screeningAnswers: {},
    });

    // Bob attempts to read draft for the same job
    const bobDraft = applicationDraftService.getDraft("user-bob", "job-100");
    assert.equal(bobDraft, null);

    // Alice reads her own draft
    const aliceDraft = applicationDraftService.getDraft("user-alice", "job-100");
    assert.ok(aliceDraft !== null);
    assert.equal(aliceDraft?.details.contact.fullName, "Alice");
  });

  it("enforces job isolation (Job 1 draft does not leak into Job 2)", () => {
    applicationDraftService.saveDraft("user-1", "job-1", {
      currentStep: "questions",
      selectedResumeId: "res-1",
      details: {
        contact: { fullName: "User One", email: "user1@example.com", phone: "0900000000" },
        currentLocation: "Hồ Chí Minh",
        availability: "Lập tức",
        preferredContactMethod: "phone",
        coverLetter: "Cover letter for Job 1",
      },
      screeningAnswers: { q1: "Ans 1" },
    });

    const job2Draft = applicationDraftService.getDraft("user-1", "job-2");
    assert.equal(job2Draft, null);
  });

  it("handles anonymous user draft and does not leak to logged in user", () => {
    applicationDraftService.saveDraft(null, "demo-job-1", {
      currentStep: "details",
      selectedResumeId: "res-demo",
      details: {
        contact: { fullName: "Anonymous Candidate", email: "anon@example.com", phone: "" },
        currentLocation: "Cần Thơ",
        availability: "",
        preferredContactMethod: "email",
        coverLetter: "",
      },
      screeningAnswers: {},
    });

    // Logged in user cannot read anon draft
    assert.equal(applicationDraftService.getDraft("user-logged-in", "demo-job-1"), null);

    // Anonymous visitor can read anon draft
    const anonDraft = applicationDraftService.getDraft(null, "demo-job-1");
    assert.ok(anonDraft !== null);
    assert.equal(anonDraft?.details.contact.fullName, "Anonymous Candidate");
  });

  it("clears specific draft on clearDraft", () => {
    applicationDraftService.saveDraft("user-1", "job-1", {
      currentStep: "review",
      selectedResumeId: "res-1",
      details: {
        contact: { fullName: "User One", email: "user1@example.com", phone: "0900000000" },
        currentLocation: "",
        availability: "",
        preferredContactMethod: "email",
        coverLetter: "",
      },
      screeningAnswers: {},
    });

    applicationDraftService.clearDraft("user-1", "job-1");
    assert.equal(applicationDraftService.getDraft("user-1", "job-1"), null);
  });

  it("clears all drafts of a specific user across multiple jobs on clearAllUserDrafts", () => {
    applicationDraftService.saveDraft("user-target", "job-1", {
      currentStep: "details",
      selectedResumeId: "res-1",
      details: {
        contact: { fullName: "T", email: "t@ex.com", phone: "" },
        currentLocation: "",
        availability: "",
        preferredContactMethod: "email",
        coverLetter: "",
      },
      screeningAnswers: {},
    });
    applicationDraftService.saveDraft("user-target", "job-2", {
      currentStep: "details",
      selectedResumeId: "res-2",
      details: {
        contact: { fullName: "T", email: "t@ex.com", phone: "" },
        currentLocation: "",
        availability: "",
        preferredContactMethod: "email",
        coverLetter: "",
      },
      screeningAnswers: {},
    });
    applicationDraftService.saveDraft("user-other", "job-1", {
      currentStep: "details",
      selectedResumeId: "res-other",
      details: {
        contact: { fullName: "O", email: "o@ex.com", phone: "" },
        currentLocation: "",
        availability: "",
        preferredContactMethod: "email",
        coverLetter: "",
      },
      screeningAnswers: {},
    });

    applicationDraftService.clearAllUserDrafts("user-target");

    assert.equal(applicationDraftService.getDraft("user-target", "job-1"), null);
    assert.equal(applicationDraftService.getDraft("user-target", "job-2"), null);
    assert.ok(applicationDraftService.getDraft("user-other", "job-1") !== null);
  });

  it("handles corrupted or incompatible draft versions safely", () => {
    // Malformed JSON
    store.set("findwork.app_draft.v1.user-1.job-bad", "{ invalid json");
    assert.equal(applicationDraftService.getDraft("user-1", "job-bad"), null);

    // Wrong version
    store.set(
      "findwork.app_draft.v1.user-1.job-v2",
      JSON.stringify({ version: 2, userId: "user-1", jobId: "job-v2" }),
    );
    assert.equal(applicationDraftService.getDraft("user-1", "job-v2"), null);
  });
});
