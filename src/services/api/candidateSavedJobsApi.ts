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

import { apiClient, getAuthSessionId, getAuthToken, getAuthUserId } from "../http/apiClient";
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

export interface CandidateSavedJobsRequestOptions {
  signal?: AbortSignal;
  userId?: string | null;
  originatingToken?: string | null;
  originatingUserId?: string | null;
  originatingSessionId?: number | null;
}

function resolveSessionBinding(
  optionsOrSignal?: AbortSignal | CandidateSavedJobsRequestOptions,
) {
  const currentToken = getAuthToken();
  const currentUserId = getAuthUserId();
  const currentSessionId = getAuthSessionId();

  if (!optionsOrSignal) {
    return {
      signal: undefined,
      originatingToken: currentToken,
      originatingUserId: currentUserId,
      originatingSessionId: currentSessionId,
    };
  }

  if (optionsOrSignal instanceof AbortSignal) {
    return {
      signal: optionsOrSignal,
      originatingToken: currentToken,
      originatingUserId: currentUserId,
      originatingSessionId: currentSessionId,
    };
  }

  return {
    signal: optionsOrSignal.signal,
    originatingToken: optionsOrSignal.originatingToken ?? currentToken,
    originatingUserId:
      optionsOrSignal.originatingUserId ??
      optionsOrSignal.userId ??
      currentUserId,
    originatingSessionId:
      optionsOrSignal.originatingSessionId ?? currentSessionId,
  };
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
  async save(
    jobId: string,
    options?: AbortSignal | CandidateSavedJobsRequestOptions,
  ): Promise<BackendSavedJobItemDto> {
    try {
      const binding = resolveSessionBinding(options);
      const res = await apiClient.post(
        "/candidate/saved-jobs",
        { jobId },
        {
          signal: binding.signal,
          originatingToken: binding.originatingToken,
          originatingUserId: binding.originatingUserId,
          originatingSessionId: binding.originatingSessionId,
        },
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
    options?: AbortSignal | CandidateSavedJobsRequestOptions,
  ): Promise<Paged<BackendSavedJobItemDto>> {
    try {
      const binding = resolveSessionBinding(options);
      const params: Record<string, number> = {};
      if (query.page && query.page > 1) params.page = query.page;
      if (query.pageSize) params.pageSize = query.pageSize;

      const res = await apiClient.get("/candidate/saved-jobs", {
        params,
        signal: binding.signal,
        originatingToken: binding.originatingToken,
        originatingUserId: binding.originatingUserId,
        originatingSessionId: binding.originatingSessionId,
      });
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
    options?: AbortSignal | CandidateSavedJobsRequestOptions,
  ): Promise<BackendSavedJobStatusDto> {
    try {
      const binding = resolveSessionBinding(options);
      const res = await apiClient.get(
        `/candidate/saved-jobs/${encodeURIComponent(jobId)}/status`,
        {
          signal: binding.signal,
          originatingToken: binding.originatingToken,
          originatingUserId: binding.originatingUserId,
          originatingSessionId: binding.originatingSessionId,
        },
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
  async remove(
    jobId: string,
    options?: AbortSignal | CandidateSavedJobsRequestOptions,
  ): Promise<void> {
    try {
      const binding = resolveSessionBinding(options);
      await apiClient.delete(
        `/candidate/saved-jobs/${encodeURIComponent(jobId)}`,
        {
          signal: binding.signal,
          originatingToken: binding.originatingToken,
          originatingUserId: binding.originatingUserId,
          originatingSessionId: binding.originatingSessionId,
        },
      );
    } catch (e) {
      throw toApiFailure(e);
    }
  },
};
