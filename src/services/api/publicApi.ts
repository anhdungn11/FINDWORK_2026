import { apiClient } from "../http/apiClient";
import { toApiFailure } from "./apiFailure";
import {
  normalizeCategory, normalizeJob, normalizePaged,
  type JobCategoryDto, type JobDto, type Paged,
} from "./apiTypes";

export interface PublicJobQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  categoryCode?: string;
  employmentType?: string;
  workplaceType?: string;
}

/** Chỉ gửi tham số có giá trị — không để chuỗi rỗng làm sai bộ lọc Backend. */
export const buildJobQueryParams = (query: PublicJobQuery): Record<string, string | number> => {
  const out: Record<string, string | number> = {};
  if (query.page && query.page > 1) out.page = query.page;
  if (query.pageSize) out.pageSize = query.pageSize;
  for (const key of ["q", "categoryCode", "employmentType", "workplaceType"] as const) {
    const v = query[key]?.trim();
    if (v) out[key] = v;
  }
  return out;
};

/** API công khai: GET /jobs, GET /jobs/:id, GET /reference/job-categories. Không có dữ liệu giả. */
export const publicApi = {
  async listJobs(query: PublicJobQuery, signal?: AbortSignal): Promise<Paged<JobDto>> {
    try {
      const res = await apiClient.get("/jobs", { params: buildJobQueryParams(query), signal });
      return normalizePaged(res.data, normalizeJob);
    } catch (e) {
      throw toApiFailure(e);
    }
  },
  async getJob(jobId: string, signal?: AbortSignal): Promise<JobDto> {
    try {
      const res = await apiClient.get(`/jobs/${encodeURIComponent(jobId)}`, { signal });
      const body = res.data as { data?: unknown } | undefined;
      return normalizeJob(body && typeof body === "object" && "data" in body && body.data ? body.data : res.data);
    } catch (e) {
      throw toApiFailure(e);
    }
  },
  async listJobCategories(signal?: AbortSignal): Promise<JobCategoryDto[]> {
    try {
      const res = await apiClient.get("/reference/job-categories", { signal });
      return normalizePaged(res.data, normalizeCategory).data.filter((c) => c.id && c.name);
    } catch (e) {
      throw toApiFailure(e);
    }
  },
};
