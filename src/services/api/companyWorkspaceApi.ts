import { apiClient } from "../http/apiClient";
import { isWorkspaceWritesEnabled } from "../../config/featureFlags";
import { toApiFailure, writeBlockedFailure } from "./apiFailure";
import {
  normalizeCompanyProfile, normalizeJob, normalizeLocation, normalizeMyCompany, normalizePaged,
  unwrapData,
  type CompanyLocationDto, type CompanyProfileDto, type EmploymentType, type JobDto,
  type MyCompanyDto, type Paged, type SalaryPeriod, type WorkplaceType,
} from "./apiTypes";

export interface JobInput {
  categoryId: string;
  title: string;
  description: string;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  experienceMinMonths?: number;
  experienceMaxMonths?: number;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  salaryPeriod?: SalaryPeriod;
  salaryNegotiable?: boolean;
  showSalary?: boolean;
  applicationDeadline?: string;
}

export type JobTransition = "publish" | "pause" | "close";

/** Mọi thao tác ghi đi qua cổng này: tắt cờ => không gửi request. */
const guardWrite = (operation: string): void => {
  if (!isWorkspaceWritesEnabled()) throw writeBlockedFailure(operation);
};

const run = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    throw toApiFailure(e);
  }
};

const items = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  const data = (value as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? data : [];
};

/** Company workspace — chỉ các endpoint có trong hợp đồng Backend. Quyền do Backend quyết định. */
export const companyWorkspaceApi = {
  listMine: (signal?: AbortSignal): Promise<MyCompanyDto[]> =>
    run(async () => items((await apiClient.get("/companies/me", { signal })).data).map(normalizeMyCompany)),

  getProfile: (companyId: string, signal?: AbortSignal): Promise<CompanyProfileDto> =>
    run(async () => normalizeCompanyProfile((await apiClient.get(`/companies/${companyId}/profile`, { signal })).data)),

  listLocations: (companyId: string, signal?: AbortSignal): Promise<CompanyLocationDto[]> =>
    run(async () => items((await apiClient.get(`/companies/${companyId}/locations`, { signal })).data).map(normalizeLocation)),

  listInvitations: (companyId: string, signal?: AbortSignal): Promise<Array<Record<string, unknown>>> =>
    run(async () => items((await apiClient.get(`/companies/${companyId}/invitations`, { signal })).data) as Array<Record<string, unknown>>),

  listJobs: (companyId: string, params: { page?: number; pageSize?: number; status?: string }, signal?: AbortSignal): Promise<Paged<JobDto>> =>
    run(async () => {
      const query: Record<string, string | number> = {};
      if (params.page && params.page > 1) query.page = params.page;
      if (params.pageSize) query.pageSize = params.pageSize;
      if (params.status) query.status = params.status;
      return normalizePaged((await apiClient.get(`/companies/${companyId}/jobs`, { params: query, signal })).data, normalizeJob);
    }),

  getJob: (companyId: string, jobId: string, signal?: AbortSignal): Promise<JobDto> =>
    run(async () => normalizeJob(unwrapData((await apiClient.get(`/companies/${companyId}/jobs/${jobId}`, { signal })).data))),

  createJob: (companyId: string, input: JobInput): Promise<JobDto> => {
    guardWrite("tạo tin tuyển dụng");
    return run(async () => normalizeJob(unwrapData((await apiClient.post(`/companies/${companyId}/jobs`, input)).data)));
  },

  updateJob: (companyId: string, jobId: string, version: number, input: JobInput): Promise<JobDto> => {
    guardWrite("cập nhật tin tuyển dụng");
    return run(async () => normalizeJob(unwrapData((await apiClient.patch(`/companies/${companyId}/jobs/${jobId}`, { ...input, version })).data)));
  },

  transitionJob: (companyId: string, jobId: string, version: number, action: JobTransition): Promise<JobDto> => {
    guardWrite(`${action} tin tuyển dụng`);
    return run(async () => normalizeJob(unwrapData((await apiClient.post(`/companies/${companyId}/jobs/${jobId}/${action}`, { version })).data)));
  },
};

/** Chuyển trạng thái hợp lệ theo hợp đồng: DRAFT→PUBLISHED, PUBLISHED→PAUSED, PUBLISHED/PAUSED→CLOSED. */
export const availableTransitions = (status: string | null): JobTransition[] => {
  if (status === "DRAFT") return ["publish"];
  if (status === "PUBLISHED") return ["pause", "close"];
  if (status === "PAUSED") return ["close"];
  return [];
};

export const canEditJob = (status: string | null): boolean => status === "DRAFT";
