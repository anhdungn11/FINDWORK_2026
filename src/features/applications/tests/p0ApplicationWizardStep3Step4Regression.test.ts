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
  type ScreeningQuestionDto,
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

  describe("Safety Gate Integrity", () => {
    it("confirms live writes remain safely disabled", () => {
      assert.equal(isLiveWritesEnabled(), false);
    });
  });
});
