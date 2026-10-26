/**
 * FINDWORK — CANDIDATE SAVED JOBS API CLIENT ADAPTER
 *
 * Vị trí: src/services/api/candidateSavedJobsApi.ts
 * Hợp đồng: server/docs/SUBMISSION_BACKEND_MVP_API.md (Commit c437ee6)
 *
 * CÁC ENDPOINT ĐÃ ĐƯỢC BACKEND TRIỂN KHAI:
 * - POST /api/v1/candidate/saved-jobs (body: { jobId: UUID })
 * - GET /api/v1/candidate/saved-jobs?page=1&pageSize=20
 * - GET /api/v1/candidate/saved-jobs/:jobId/status
 * - DELETE /api/v1/candidate/saved-jobs/:jobId (HTTP 204)
 */

import { apiClient } from "../http/apiClient";
import { toApiFailure } from "./apiFailure";
import {
  normalizeJob,
  normalizePaged,
  unwrapData,
  type JobDto,
  type Paged,
} from "./apiTypes";

export interface BackendSavedJobItemDto {
  id: string;
  jobId: string;
  savedAt: string;
  isAvailable: boolean;
  job: JobDto | null;
}

export interface BackendSavedJobStatusDto {
  jobId: string;
  saved: boolean;
  isAvailable: boolean;
}

export interface SavedJobsQuery {
  page?: number;
  pageSize?: number;
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

export function normalizeSavedJobItem(value: unknown): BackendSavedJobItemDto {
  const r = obj(value);
  const rawJob = r.job && typeof r.job === "object" ? r.job : null;
  return {
    id: str(r.id) ?? "",
    jobId: str(r.jobId) ?? "",
    savedAt: str(r.savedAt) ?? new Date().toISOString(),
    isAvailable: r.isAvailable === true,
    job: rawJob ? normalizeJob(rawJob) : null,
  };
}

export function normalizeSavedJobStatus(value: unknown): BackendSavedJobStatusDto {
  const r = obj(value);
  return {
    jobId: str(r.jobId) ?? "",
    saved: r.saved === true,
    isAvailable: r.isAvailable === true,
  };
}

export const candidateSavedJobsApi = {
  /**
   * POST /api/v1/candidate/saved-jobs
   * Lưu tin tuyển dụng thật (UUID).
   */
  async save(jobId: string, signal?: AbortSignal): Promise<BackendSavedJobItemDto> {
    try {
      const res = await apiClient.post(
        "/candidate/saved-jobs",
        { jobId },
        { signal },
      );
      return normalizeSavedJobItem(unwrapData(res.data));
    } catch (e) {
      throw toApiFailure(e);
    }
  },

  /**
   * GET /api/v1/candidate/saved-jobs
   * Lấy danh sách việc làm đã lưu của ứng viên từ Backend.
   */
  async list(
    query: SavedJobsQuery = {},
    signal?: AbortSignal,
  ): Promise<Paged<BackendSavedJobItemDto>> {
    try {
      const params: Record<string, number> = {};
      if (query.page && query.page > 1) params.page = query.page;
      if (query.pageSize) params.pageSize = query.pageSize;

      const res = await apiClient.get("/candidate/saved-jobs", { params, signal });
      return normalizePaged(res.data, normalizeSavedJobItem);
    } catch (e) {
      throw toApiFailure(e);
    }
  },

  /**
   * GET /api/v1/candidate/saved-jobs/:jobId/status
   * Kiểm tra trạng thái lưu của một tin tuyển dụng cụ thể (UUID).
   */
  async getStatus(
    jobId: string,
    signal?: AbortSignal,
  ): Promise<BackendSavedJobStatusDto> {
    try {
      const res = await apiClient.get(
        `/candidate/saved-jobs/${encodeURIComponent(jobId)}/status`,
        { signal },
      );
      return normalizeSavedJobStatus(unwrapData(res.data));
    } catch (e) {
      throw toApiFailure(e);
    }
  },

  /**
   * DELETE /api/v1/candidate/saved-jobs/:jobId
   * Bỏ lưu tin tuyển dụng (HTTP 204).
   */
  async remove(jobId: string, signal?: AbortSignal): Promise<void> {
    try {
      await apiClient.delete(
        `/candidate/saved-jobs/${encodeURIComponent(jobId)}`,
        { signal },
      );
    } catch (e) {
      throw toApiFailure(e);
    }
  },
};
