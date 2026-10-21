import { apiClient } from "../http/apiClient";
import { toApiFailure } from "./apiFailure";
import {
  normalizeCategory,
  normalizeCareerCategory,
  normalizeSkillCategory,
  normalizeSkill,
  normalizeJob,
  normalizePaged,
  normalizePublicCompany,
  type CareerCategoryDto,
  type SkillCategoryDto,
  type SkillDto,
  type JobCategoryDto,
  type JobDto,
  type Paged,
  type PublicCompanyDto,
  type PublicCompanyQuery,
} from "./apiTypes";

export { type PublicCompanyQuery, type CareerCategoryDto, type SkillCategoryDto, type SkillDto };

export interface PublicJobQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  categoryCode?: string;
  employmentType?: string;
  workplaceType?: string;
  companyId?: string;
}

/** Chỉ gửi tham số có giá trị — không để chuỗi rỗng làm sai bộ lọc Backend. */
export const buildJobQueryParams = (query: PublicJobQuery): Record<string, string | number> => {
  const out: Record<string, string | number> = {};
  if (query.page && query.page > 1) out.page = query.page;
  if (query.pageSize) out.pageSize = query.pageSize;
  for (const key of ["q", "categoryCode", "employmentType", "workplaceType", "companyId"] as const) {
    const v = query[key]?.trim();
    if (v) out[key] = v;
  }
  return out;
};

/** Query params cho Public Company search/filter theo hợp đồng backend. */
export const buildCompanyQueryParams = (query: PublicCompanyQuery): Record<string, string | number | boolean> => {
  const out: Record<string, string | number | boolean> = {};
  if (query.page && query.page > 1) out.page = query.page;
  if (query.pageSize) out.pageSize = query.pageSize;
  if (query.q && query.q.trim()) out.q = query.q.trim();
  if (query.industryCode && query.industryCode.trim()) out.industryCode = query.industryCode.trim();
  if (query.provinceId && query.provinceId.trim()) out.provinceId = query.provinceId.trim();
  if (query.verifiedOnly === true) out.verifiedOnly = true;
  return out;
};

/** API công khai: GET /jobs, GET /jobs/:id, GET /companies, GET /companies/:id, GET /reference/job-categories, GET /career/categories. */
export const publicApi = {
  async listJobs(query: PublicJobQuery = {}, signal?: AbortSignal): Promise<Paged<JobDto>> {
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
  async listCompanies(query: PublicCompanyQuery = {}, signal?: AbortSignal): Promise<Paged<PublicCompanyDto>> {
    try {
      const res = await apiClient.get("/companies", { params: buildCompanyQueryParams(query), signal });
      return normalizePaged(res.data, normalizePublicCompany);
    } catch (e) {
      throw toApiFailure(e);
    }
  },
  async listFeaturedCompanies(
    query: { page?: number; pageSize?: number } = {},
    signal?: AbortSignal,
  ): Promise<Paged<PublicCompanyDto>> {
    try {
      const page = query.page && query.page > 0 ? query.page : 1;
      const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 12;
      const res = await apiClient.get("/companies/featured", {
        params: { page, pageSize },
        signal,
      });
      return normalizePaged(res.data, normalizePublicCompany);
    } catch (e) {
      throw toApiFailure(e);
    }
  },
  async getCompany(companyId: string, signal?: AbortSignal): Promise<PublicCompanyDto> {
    try {
      const res = await apiClient.get(`/companies/${encodeURIComponent(companyId)}`, { signal });
      const body = res.data as { data?: unknown } | undefined;
      return normalizePublicCompany(body && typeof body === "object" && "data" in body && body.data ? body.data : res.data);
    } catch (e) {
      throw toApiFailure(e);
    }
  },
  async listCompanyJobs(companyId: string, query: Omit<PublicJobQuery, "companyId"> = {}, signal?: AbortSignal): Promise<Paged<JobDto>> {
    return publicApi.listJobs({ ...query, companyId }, signal);
  },
  async listJobCategories(signal?: AbortSignal): Promise<JobCategoryDto[]> {
    try {
      const res = await apiClient.get("/reference/job-categories", { signal });
      return normalizePaged(res.data, normalizeCategory).data.filter((c) => c.id && c.name);
    } catch (e) {
      throw toApiFailure(e);
    }
  },
  async listCareerCategories(
    query: { page?: number; pageSize?: number; q?: string } = {},
    signal?: AbortSignal
  ): Promise<Paged<CareerCategoryDto>> {
    try {
      const params: Record<string, string | number> = {};
      if (query.page && query.page > 1) params.page = query.page;
      if (query.pageSize) params.pageSize = query.pageSize;
      if (query.q && query.q.trim()) params.q = query.q.trim();
      const res = await apiClient.get("/career/categories", { params, signal });
      return normalizePaged(res.data, normalizeCareerCategory);
    } catch (e) {
      throw toApiFailure(e);
    }
  },
  async listSkillCategories(
    query: { parentCode?: string; page?: number; pageSize?: number } = {},
    signal?: AbortSignal
  ): Promise<Paged<SkillCategoryDto>> {
    try {
      const params: Record<string, string | number> = {};
      if (query.parentCode && query.parentCode.trim()) params.parentCode = query.parentCode.trim();
      if (query.page && query.page > 1) params.page = query.page;
      if (query.pageSize) params.pageSize = query.pageSize;
      const res = await apiClient.get("/reference/skill-categories", { params, signal });
      return normalizePaged(res.data, normalizeSkillCategory);
    } catch (e) {
      throw toApiFailure(e);
    }
  },
  async listSkills(
    query: { categoryCode?: string; page?: number; pageSize?: number } = {},
    signal?: AbortSignal
  ): Promise<Paged<SkillDto>> {
    try {
      const params: Record<string, string | number> = {};
      if (query.categoryCode && query.categoryCode.trim()) params.categoryCode = query.categoryCode.trim();
      if (query.page && query.page > 1) params.page = query.page;
      if (query.pageSize) params.pageSize = query.pageSize;
      const res = await apiClient.get("/reference/skills", { params, signal });
      return normalizePaged(res.data, normalizeSkill);
    } catch (e) {
      throw toApiFailure(e);
    }
  },
};
