import {
  jobs,
} from "@/data/mock/jobs.mock";

import type {
  JobId,
  JobRecord,
} from "@/features/jobs/types/job.types";

/**
 * Data-access boundary cho Job ở frontend.
 *
 * Hiện tại đọc từ mock.
 * Sau này implementation này sẽ gọi HTTP API,
 * nhưng caller không cần thay đổi.
 */
export const jobService = {
  async getById(
    jobId: JobId,
  ): Promise<JobRecord | null> {
    const job = jobs.find(
      (item) => item.id === jobId,
    );

    return job ?? null;
  },

  async list(): Promise<JobRecord[]> {
    return [...jobs];
  },
};