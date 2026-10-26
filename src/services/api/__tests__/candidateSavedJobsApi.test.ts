import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeSavedJobItem,
  normalizeSavedJobStatus,
} from "../candidateSavedJobsApi";

describe("candidateSavedJobsApi normalization", () => {
  it("normalizes an active saved job item correctly", () => {
    const raw = {
      id: "saved-1",
      jobId: "00000000-0000-0000-0000-000000000001",
      savedAt: "2026-10-17T12:00:00.000Z",
      isAvailable: true,
      job: {
        id: "00000000-0000-0000-0000-000000000001",
        title: "Senior Fullstack Engineer",
        status: "PUBLISHED",
        companyId: "comp-1",
        companyName: "Acme Corp",
        location: "Hà Nội",
        jobType: "FULL_TIME",
        workplaceType: "HYBRID",
      },
    };

    const normalized = normalizeSavedJobItem(raw);
    assert.equal(normalized.id, "saved-1");
    assert.equal(normalized.jobId, "00000000-0000-0000-0000-000000000001");
    assert.equal(normalized.savedAt, "2026-10-17T12:00:00.000Z");
    assert.equal(normalized.isAvailable, true);
    assert.ok(normalized.job !== null);
    assert.equal(normalized.job?.title, "Senior Fullstack Engineer");
    assert.equal(normalized.job?.status, "PUBLISHED");
    assert.equal(normalized.job?.companyName, "Acme Corp");
  });

  it("handles closed or unlisted jobs where job is null and isAvailable is false", () => {
    const raw = {
      id: "saved-2",
      jobId: "00000000-0000-0000-0000-000000000002",
      savedAt: "2026-10-17T12:00:00.000Z",
      isAvailable: false,
      job: null,
    };

    const normalized = normalizeSavedJobItem(raw);
    assert.equal(normalized.id, "saved-2");
    assert.equal(normalized.jobId, "00000000-0000-0000-0000-000000000002");
    assert.equal(normalized.isAvailable, false);
    assert.equal(normalized.job, null);
  });

  it("safely handles null and unexpected input values", () => {
    const normalized = normalizeSavedJobItem(null);
    assert.equal(normalized.id, "");
    assert.equal(normalized.jobId, "");
    assert.equal(normalized.isAvailable, false);
    assert.equal(normalized.job, null);
    assert.ok(typeof normalized.savedAt === "string");
  });

  it("normalizes saved job status correctly", () => {
    const status1 = normalizeSavedJobStatus({
      jobId: "job-123",
      saved: true,
      isAvailable: true,
    });
    assert.equal(status1.jobId, "job-123");
    assert.equal(status1.saved, true);
    assert.equal(status1.isAvailable, true);

    const status2 = normalizeSavedJobStatus({
      jobId: "job-456",
      saved: false,
      isAvailable: false,
    });
    assert.equal(status2.jobId, "job-456");
    assert.equal(status2.saved, false);
    assert.equal(status2.isAvailable, false);

    const fallback = normalizeSavedJobStatus(null);
    assert.equal(fallback.jobId, "");
    assert.equal(fallback.saved, false);
    assert.equal(fallback.isAvailable, false);
  });
});
