import test from "node:test";
import assert from "node:assert/strict";
import {
  type ChatMessage,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  AiProviderUnavailableError,
  sendChatMessage,
} from "../../../features/ai/aiChatApi";
import {
  type ScheduledInterviewData,
  getScheduledInterview,
  saveScheduledInterview,
} from "../../../features/interview/interviewStorage";
import { availableReviewTransitions } from "../../../services/api/companyWorkspaceApi";

// In-memory mock for localStorage in Node test environment
const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = String(value);
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
  length: 0,
  key: () => null,
};

test("AI Assistant: Conversation history persistence and cleanup", () => {
  clearChatHistory();
  assert.deepEqual(loadChatHistory(), [], "Initial chat history is empty");

  const sampleMessages: ChatMessage[] = [
    {
      id: "msg-1",
      role: "user",
      content: "Gợi ý câu hỏi phỏng vấn vị trí Senior React Developer",
      timestamp: "10:30",
    },
    {
      id: "msg-2",
      role: "assistant",
      content: "Dưới đây là 5 câu hỏi phỏng vấn trọng tâm...",
      timestamp: "10:31",
    },
  ];

  saveChatHistory(sampleMessages);
  const loaded = loadChatHistory();
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].content, sampleMessages[0].content);
  assert.equal(loaded[1].role, "assistant");

  clearChatHistory();
  assert.deepEqual(loadChatHistory(), [], "Chat history cleared successfully");
});

test("AI Assistant: Honest provider failure without fake responses", async () => {
  // When calling sendChatMessage against unconfigured backend, must throw AiProviderUnavailableError
  await assert.rejects(
    async () => {
      await sendChatMessage([{ role: "user", content: "Test prompt" }]);
    },
    (err: unknown) => {
      assert.ok(err instanceof AiProviderUnavailableError);
      assert.equal((err as AiProviderUnavailableError).code, "AI_PROVIDER_UNCONFIGURED");
      assert.equal((err as AiProviderUnavailableError).status, 503);
      assert.match(
        (err as Error).message,
        /Dịch vụ AI Assistant chưa được kết nối/,
        "Error message honestly informs user about backend provider status",
      );
      return true;
    },
  );
});

test("Interview Scheduling: Preserves and retrieves application interview schedule", () => {
  const appId = "app-test-uuid-12345";
  assert.equal(getScheduledInterview(appId), null, "No schedule initially");

  const schedule: ScheduledInterviewData = {
    scheduledAt: "2026-10-30T09:00",
    durationMinutes: 45,
    format: "ZOOM",
    meetingUrl: "https://zoom.us/j/999888777",
    interviewerName: "Trưởng ban tuyển dụng",
    notes: "Ứng viên chuẩn bị phần chia sẻ kinh nghiệm xử lý State Management",
  };

  saveScheduledInterview(appId, schedule);
  const retrieved = getScheduledInterview(appId);
  assert.ok(retrieved !== null);
  assert.equal(retrieved.format, "ZOOM");
  assert.equal(retrieved.durationMinutes, 45);
  assert.equal(retrieved.meetingUrl, "https://zoom.us/j/999888777");
  assert.equal(retrieved.interviewerName, "Trưởng ban tuyển dụng");
});

test("Interview Workflow: Application review transitions include INTERVIEW stage", () => {
  // From SUBMITTED or REVIEWING or SHORTLISTED, transitions lead logically to INTERVIEW
  const fromShortlisted = availableReviewTransitions("SHORTLISTED");
  assert.ok(
    fromShortlisted.includes("INTERVIEW"),
    "Shortlisted candidates can be transitioned to INTERVIEW stage",
  );

  const fromInterview = availableReviewTransitions("INTERVIEW");
  assert.ok(
    fromInterview.includes("OFFERED") && fromInterview.includes("REJECTED"),
    "Interview stage transitions to OFFERED or REJECTED",
  );
});

test("AI Assistant: audioUtils encodeWav produces valid 16-bit PCM RIFF/WAVE structure", async () => {
  const { encodeWav } = await import("../../../features/ai/audioUtils");
  const samples = new Float32Array(1600); // 0.1 second at 16kHz
  const blob = encodeWav(samples, 16000);

  assert.equal(blob.type, "audio/wav");
  const arrayBuffer = await blob.arrayBuffer();
  assert.equal(arrayBuffer.byteLength, 44 + 1600 * 2, "Length is 44-byte header + 2 bytes per sample");

  const view = new DataView(arrayBuffer);
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  assert.equal(riff, "RIFF", "Starts with RIFF signature");

  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  assert.equal(wave, "WAVE", "Contains WAVE chunk format");

  const sampleRate = view.getUint32(24, true);
  assert.equal(sampleRate, 16000, "Sample rate is 16000Hz");

  const byteRate = view.getUint32(28, true);
  assert.equal(byteRate, 32000, "Byte rate is 32000 bytes/sec");
});

test("AI Assistant: Guest session preservation in sessionStorage", async () => {
  const { getStoredGuestSession } = await import("../../../features/ai/aiChatApi");

  // In Node test environment, sessionStorage may be undefined or mockable
  global.sessionStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = String(value);
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    },
    length: 0,
    key: () => null,
  };

  assert.equal(getStoredGuestSession(), null, "No guest session initially");

  const session = {
    id: "guest-uuid-1",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    token: "mock-guest-token-43-chars-long-base64url-val",
  };
  sessionStorage.setItem("findwork.aiGuestSession", JSON.stringify(session));

  const stored = getStoredGuestSession();
  assert.ok(stored !== null);
  assert.equal(stored.id, "guest-uuid-1");
  assert.equal(stored.token, "mock-guest-token-43-chars-long-base64url-val");
});
