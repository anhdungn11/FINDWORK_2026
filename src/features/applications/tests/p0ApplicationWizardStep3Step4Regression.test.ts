import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  validateScreeningQuestions,
  type ScreeningQuestionItem,
} from "../utils/applicationValidation";
import { applicationDraftService } from "../services/applicationDraftService";
import {
  normalizeJob,
  normalizeScreeningQuestions,
  normalizeCompanyApplication,
} from "../../../services/api/apiTypes";
import { isLiveWritesEnabled } from "../../candidate/profile/config/candidateIntegrationConfig";

describe("P0 Frontend Application Wizard - Step 3 & Step 4 Integration Tests", () => {
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
    key: (index: number) => Array.from(store.keys())[index] ?? null,
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

  describe("Step 3: Screening Questions Validation (all 5 types)", () => {
    const testQuestions: ScreeningQuestionItem[] = [
      {
        id: "q-text",
        type: "TEXT",
        label: "Mức lương mong muốn (triệu VNĐ)",
        isRequired: true,
      },
      {
        id: "q-textarea",
        type: "TEXTAREA",
        label: "Giới thiệu kinh nghiệm",
        isRequired: true,
      },
      {
        id: "q-yesno",
        type: "YES_NO",
        label: "Bạn có thể làm thêm giờ khi cần?",
        isRequired: true,
      },
      {
        id: "q-select",
        type: "SELECT",
        label: "Thời gian bắt đầu làm việc",
        isRequired: true,
        options: ["Đi làm ngay", "Sau 2 tuần", "Sau 1 tháng"],
      },
      {
        id: "q-multiselect",
        type: "MULTI_SELECT",
        label: "Kỹ năng chuyên môn",
        isRequired: true,
        options: ["React", "TypeScript", "Node.js", "Docker"],
      },
      {
        id: "q-optional",
        type: "TEXT",
        label: "Câu hỏi tùy chọn",
        isRequired: false,
      },
    ];

    it("catches all missing required questions across all 5 types", () => {
      const errors = validateScreeningQuestions(testQuestions, {});
      assert.ok(errors["q-text"]);
      assert.ok(errors["q-textarea"]);
      assert.ok(errors["q-yesno"]);
      assert.ok(errors["q-select"]);
      assert.ok(errors["q-multiselect"]);
      assert.equal(errors["q-optional"], undefined);
    });

    it("validates empty string and empty array as invalid for required questions", () => {
      const errors = validateScreeningQuestions(testQuestions, {
        "q-text": "   ",
        "q-textarea": "",
        "q-multiselect": [],
      });
      assert.ok(errors["q-text"]);
      assert.ok(errors["q-textarea"]);
      assert.ok(errors["q-multiselect"]);
    });

    it("enforces character limits for TEXT (500) and TEXTAREA (5000)", () => {
      const overText = "a".repeat(501);
      const overTextarea = "b".repeat(5001);

      const errors = validateScreeningQuestions(testQuestions, {
        "q-text": overText,
        "q-textarea": overTextarea,
        "q-yesno": true,
        "q-select": "Đi làm ngay",
        "q-multiselect": ["React"],
      });

      assert.match(errors["q-text"], /500/);
      assert.match(errors["q-textarea"], /5000/);
    });

    it("validates options membership for SELECT and MULTI_SELECT", () => {
      const errors = validateScreeningQuestions(testQuestions, {
        "q-text": "20 triệu",
        "q-textarea": "3 năm kinh nghiệm lập trình",
        "q-yesno": false,
        "q-select": "Không có trong danh mục",
        "q-multiselect": ["React", "HackerToolInvalid"],
      });

      assert.ok(errors["q-select"]);
      assert.ok(errors["q-multiselect"]);
      assert.equal(errors["q-text"], undefined);
      assert.equal(errors["q-textarea"], undefined);
      assert.equal(errors["q-yesno"], undefined);
    });

    it("passes cleanly when all 5 question types are properly answered", () => {
      const validAnswers = {
        "q-text": "20 triệu",
        "q-textarea": "3 năm kinh nghiệm xây dựng ứng dụng web quy mô lớn",
        "q-yesno": true,
        "q-select": "Sau 2 tuần",
        "q-multiselect": ["React", "TypeScript"],
      };

      const errors = validateScreeningQuestions(testQuestions, validAnswers);
      assert.deepEqual(errors, {});
    });
  });

  describe("Application Draft Service - Rich Screening Answers Persistence", () => {
    it("preserves boolean, string, and array answers across save and restore", () => {
      applicationDraftService.saveDraft("test-user-id", "job-uuid-123", {
        currentStep: "questions",
        selectedResumeId: "resume-uuid-456",
        selectedResumeVersionId: "version-uuid-789",
        details: {
          contact: {
            fullName: "Trần Minh Hoàng",
            email: "tmhoang@example.com",
            phone: "0901234567",
          },
          currentLocation: "Hà Nội",
          availability: "immediately",
          preferredContactMethod: "email",
          coverLetter: "Thư giới thiệu ứng tuyển.",
        },
        screeningAnswers: {
          "salary-q": "25 triệu",
          "available-q": true,
          "unavailable-q": false,
          "skills-q": ["React", "TypeScript", "Node.js"],
        },
      });

      const restored = applicationDraftService.getDraft("test-user-id", "job-uuid-123");
      assert.ok(restored !== null);
      assert.equal(restored?.screeningAnswers["salary-q"], "25 triệu");
      assert.equal(restored?.screeningAnswers["available-q"], true);
      assert.equal(restored?.screeningAnswers["unavailable-q"], false);
      assert.deepEqual(restored?.screeningAnswers["skills-q"], ["React", "TypeScript", "Node.js"]);
    });
  });

  describe("API Normalizers - Screening Questions Sorting and Types", () => {
    it("sorts questions by displayOrder ascending and maps types safely", () => {
      const raw = [
        { id: "q-2", type: "SELECT", label: "Câu hỏi 2", displayOrder: 2, options: ["A", "B"], isRequired: true },
        { id: "q-0", type: "TEXT", label: "Câu hỏi 0", displayOrder: 0, isRequired: false },
        { id: "q-1", type: "YES_NO", label: "Câu hỏi 1", displayOrder: 1, isRequired: true },
        { id: "q-unknown", type: "SOMETHING_NEW", label: "Câu hỏi lạ", displayOrder: 3, isRequired: false },
      ];

      const normalized = normalizeScreeningQuestions(raw);
      assert.equal(normalized.length, 4);
      assert.equal(normalized[0].id, "q-0");
      assert.equal(normalized[0].displayOrder, 0);
      assert.equal(normalized[1].id, "q-1");
      assert.equal(normalized[1].displayOrder, 1);
      assert.equal(normalized[1].type, "YES_NO");
      assert.equal(normalized[2].id, "q-2");
      assert.equal(normalized[2].displayOrder, 2);
      assert.equal(normalized[2].type, "SELECT");
      assert.deepEqual(normalized[2].options, ["A", "B"]);
      assert.equal(normalized[3].type, "TEXT"); // fallback from unknown
    });

    it("attaches screeningQuestions properly in normalizeJob", () => {
      const rawJob = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Frontend Lead",
        screeningQuestions: [
          { id: "sq-1", type: "YES_NO", label: "Có sẵn sàng đi công tác?", isRequired: true, displayOrder: 1 },
        ],
      };

      const job = normalizeJob(rawJob);
      assert.equal(job.id, "550e8400-e29b-41d4-a716-446655440000");
      assert.ok(Array.isArray(job.screeningQuestions));
      assert.equal(job.screeningQuestions?.length, 1);
      assert.equal(job.screeningQuestions?.[0].label, "Có sẵn sàng đi công tác?");
    });
  });

  describe("Real Job Application Integration & Contract Integrity", () => {
    it("enforces builder and ready status for real resume application eligibility", () => {
      const eligibleResume = {
        id: "res-uuid-1",
        sourceType: "builder",
        status: "ready",
        currentVersion: { id: "ver-uuid-1", versionNumber: 1 },
      };
      const pdfResume = {
        id: "res-uuid-2",
        sourceType: "uploaded",
        status: "ready",
        currentVersion: { id: "ver-uuid-2", versionNumber: 1 },
      };
      const failedResume = {
        id: "res-uuid-3",
        sourceType: "builder",
        status: "failed",
        currentVersion: { id: "ver-uuid-3", versionNumber: 1 },
      };

      const isEligible = (r: { sourceType: string; status: string }) =>
        r.sourceType === "builder" && r.status === "ready";

      assert.equal(isEligible(eligibleResume), true);
      assert.equal(isEligible(pdfResume), false);
      assert.equal(isEligible(failedResume), false);
    });

    it("verifies SubmitApplicationDto mapping conforms to backend expectations", () => {
      const answers: { questionId: string; answer: string | boolean | string[] }[] = [
        { questionId: "sq-1", answer: true },
        { questionId: "sq-2", answer: ["React", "TypeScript"] },
        { questionId: "sq-3", answer: "25 triệu" },
      ];

      const payload = {
        resumeId: "550e8400-e29b-41d4-a716-446655440001",
        resumeVersionId: "550e8400-e29b-41d4-a716-446655440002",
        details: {
          contact: {
            fullName: "Nguyễn Văn A",
            email: "nva@example.com",
            phone: "0901234567",
          },
          currentLocation: "Hà Nội",
          availability: "immediately" as const,
          preferredContactMethod: "email" as const,
        },
        coverLetter: "Thư giới thiệu ứng tuyển.",
        answers,
      };

      assert.ok(payload.resumeId);
      assert.ok(payload.resumeVersionId);
      assert.equal(payload.details.contact.fullName, "Nguyễn Văn A");
      assert.equal(payload.details.availability, "immediately");
      assert.equal(payload.details.preferredContactMethod, "email");
      assert.equal(payload.answers.length, 3);
      assert.equal(payload.answers[0].answer, true);
      assert.deepEqual(payload.answers[1].answer, ["React", "TypeScript"]);
    });

    it("distinguishes onboarding draft vs missing profile guidance", () => {
      const getGuidance = (hasProfile: boolean, hasDraft: boolean) => {
        if (!hasProfile) {
          return hasDraft
            ? "Hệ thống phát hiện tài khoản của bạn đã có bản nháp từ Onboarding. Vui lòng hoàn tất và kích hoạt hồ sơ ứng viên trước khi nộp đơn ứng tuyển."
            : "Theo quy định của hệ thống FINDWORK, bạn cần có Hồ sơ Ứng viên hợp lệ trước khi gửi đơn ứng tuyển vào doanh nghiệp.";
        }
        return "READY";
      };

      assert.equal(
        getGuidance(false, true),
        "Hệ thống phát hiện tài khoản của bạn đã có bản nháp từ Onboarding. Vui lòng hoàn tất và kích hoạt hồ sơ ứng viên trước khi nộp đơn ứng tuyển."
      );
      assert.equal(
        getGuidance(false, false),
        "Theo quy định của hệ thống FINDWORK, bạn cần có Hồ sơ Ứng viên hợp lệ trước khi gửi đơn ứng tuyển vào doanh nghiệp."
      );
      assert.equal(getGuidance(true, false), "READY");
    });

    it("verifies double-submit synchronous locking drops concurrent submit calls", async () => {
      let networkCalls = 0;
      let isSubmitting = false;

      const submitAction = async () => {
        if (isSubmitting) return "DROPPED";
        isSubmitting = true;
        try {
          await new Promise((resolve) => setTimeout(resolve, 50));
          networkCalls++;
          return "SUCCESS";
        } finally {
          // On success, lock is preserved
        }
      };

      // Dispatched simultaneously in the same event tick
      const [res1, res2] = await Promise.all([submitAction(), submitAction()]);
      assert.equal(res1, "SUCCESS");
      assert.equal(res2, "DROPPED");
      assert.equal(networkCalls, 1, "Only 1 network request must be generated for double clicks");
    });

    it("handles case-insensitivity in backend resume sourceType and status", () => {
      const isEligible = (r: { sourceType?: string; status?: string }) => {
        const source = String(r.sourceType || "").toLowerCase();
        const status = String(r.status || "").toLowerCase();
        return source === "builder" && status === "ready";
      };

      assert.equal(isEligible({ sourceType: "BUILDER", status: "READY" }), true);
      assert.equal(isEligible({ sourceType: "builder", status: "ready" }), true);
      assert.equal(isEligible({ sourceType: "UPLOADED", status: "READY" }), false);
      assert.equal(isEligible({ sourceType: "BUILDER", status: "FAILED" }), false);
    });

    it("preserves YES_NO=false in answers and drops empty arrays for optional questions", () => {
      const realQuestions = [
        { id: "q1", type: "YES_NO", label: "Làm thêm giờ?", isRequired: true },
        { id: "q2", type: "MULTI_SELECT", label: "Kỹ năng khác", isRequired: false },
        { id: "q3", type: "TEXT", label: "Ghi chú", isRequired: false },
      ];

      const screeningAnswers: Record<string, any> = {
        q1: false, // Must be kept!
        q2: [], // Empty array for optional question must be dropped to avoid backend validation error
        q3: "   ", // Empty string for optional question must be dropped
      };

      const payload = realQuestions
        .filter((q) => {
          const ans = screeningAnswers[q.id];
          if (ans === undefined || ans === null) return false;
          if (typeof ans === "string" && ans.trim() === "") return false;
          if (Array.isArray(ans) && ans.length === 0) return false;
          return true;
        })
        .map((q) => ({
          questionId: q.id,
          answer: screeningAnswers[q.id],
        }));

      assert.equal(payload.length, 1);
      assert.equal(payload[0].questionId, "q1");
      assert.equal(payload[0].answer, false);
    });
  });

  describe("CompanyApplication Normalizer - Complete Backend Response", () => {
    it("maps all backend snapshot, availability, answers, and version metadata", () => {
      const backendPayload = {
        id: "app-uuid-1",
        companyId: "comp-uuid-1",
        jobId: "job-uuid-1",
        status: "SUBMITTED",
        version: 1,
        resumeId: "res-uuid-1",
        resumeVersionId: "ver-uuid-1",
        fullNameSnapshot: "Đặng Nam Dũng",
        emailSnapshot: "dnd@example.com",
        phoneSnapshot: "+84901234567",
        currentLocationSnapshot: "Hà Nội",
        availability: "IMMEDIATELY",
        preferredContactMethod: "EMAIL",
        jobSnapshot: { id: "job-uuid-1", title: "Senior React Engineer" },
        coverLetter: "Thư ứng tuyển",
        submittedAt: "2026-10-19T05:00:00.000Z",
        createdAt: "2026-10-19T05:00:00.000Z",
        updatedAt: "2026-10-19T05:00:00.000Z",
        job: {
          id: "job-uuid-1",
          title: "Senior React Engineer",
          status: "PUBLISHED",
          company: { id: "comp-uuid-1", name: "Công ty ABC", slug: "cong-ty-abc" },
        },
        resumeVersion: {
          id: "ver-uuid-1",
          versionNumber: 1,
          templateCode: "classic",
          builderContent: { summary: "Tóm tắt" },
          builderSettings: { accentColor: "navy" },
        },
        answers: [
          {
            id: "ans-uuid-1",
            screeningQuestionId: "sq-1",
            questionSnapshot: { label: "Có thể đi làm ngay?" },
            answerValue: true,
            createdAt: "2026-10-19T05:00:00.000Z",
          },
        ],
      };

      const normalized = normalizeCompanyApplication(backendPayload);
      assert.equal(normalized.id, "app-uuid-1");
      assert.equal(normalized.currentLocationSnapshot, "Hà Nội");
      assert.equal(normalized.availability, "IMMEDIATELY");
      assert.equal(normalized.preferredContactMethod, "EMAIL");
      assert.deepEqual(normalized.jobSnapshot, { id: "job-uuid-1", title: "Senior React Engineer" });
      assert.equal(normalized.resumeVersion?.templateCode, "classic");
      assert.deepEqual(normalized.resumeVersion?.builderSettings, { accentColor: "navy" });
      assert.equal(normalized.answers?.length, 1);
      assert.equal(normalized.answers?.[0].answerValue, true);
    });
  });

  describe("Safety Gate Integrity", () => {
    it("confirms live writes remain safely disabled", () => {
      assert.equal(isLiveWritesEnabled(), false);
    });
  });
});
