import { apiClient } from "../http/apiClient";
import { isWorkspaceWritesEnabled } from "../../config/featureFlags";
import { toApiFailure, writeBlockedFailure } from "./apiFailure";
import { normalizePaged, type Paged } from "./apiTypes";

export interface AdminDashboardCounts {
  users: number;
  activeUsers: number;
  companies: number;
  activeCompanies: number;
  pendingCompanies: number;
  jobs: number;
  publishedJobs: number;
  applications: number;
}

export interface AdminUserDto {
  id: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED" | "DISABLED";
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCompanyDto {
  id: string;
  name: string;
  slug: string | null;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminJobDto {
  id: string;
  companyId: string;
  categoryId: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED" | "EXPIRED" | "ARCHIVED";
  version: number;
  publishedAt: string | null;
  applicationDeadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditDto {
  id: string;
  actorUserId: string | null;
  companyId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

const guardWrite = (op: string): void => {
  if (!isWorkspaceWritesEnabled()) throw writeBlockedFailure(op);
};

const run = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    throw toApiFailure(e);
  }
};

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function normalizeAdminUser(value: unknown): AdminUserDto {
  const r = obj(value);
  return {
    id: str(r.id) ?? "",
    email: str(r.email) ?? "",
    status: (str(r.status) as AdminUserDto["status"]) ?? "ACTIVE",
    emailVerifiedAt: str(r.emailVerifiedAt),
    createdAt: str(r.createdAt) ?? "",
    updatedAt: str(r.updatedAt) ?? "",
  };
}

export function normalizeAdminCompany(value: unknown): AdminCompanyDto {
  const r = obj(value);
  return {
    id: str(r.id) ?? "",
    name: str(r.name) ?? "",
    slug: str(r.slug),
    status: (str(r.status) as AdminCompanyDto["status"]) ?? "ACTIVE",
    verificationStatus: (str(r.verificationStatus) as AdminCompanyDto["verificationStatus"]) ?? "PENDING",
    verifiedAt: str(r.verifiedAt),
    createdAt: str(r.createdAt) ?? "",
    updatedAt: str(r.updatedAt) ?? "",
  };
}

export function normalizeAdminJob(value: unknown): AdminJobDto {
  const r = obj(value);
  return {
    id: str(r.id) ?? "",
    companyId: str(r.companyId) ?? "",
    categoryId: str(r.categoryId) ?? "",
    title: str(r.title) ?? "(Không có tiêu đề)",
    status: (str(r.status) as AdminJobDto["status"]) ?? "DRAFT",
    version: num(r.version) ?? 1,
    publishedAt: str(r.publishedAt),
    applicationDeadline: str(r.applicationDeadline),
    createdAt: str(r.createdAt) ?? "",
    updatedAt: str(r.updatedAt) ?? "",
  };
}

export function normalizeAdminAudit(value: unknown): AdminAuditDto {
  const r = obj(value);
  return {
    id: str(r.id) ?? "",
    actorUserId: str(r.actorUserId),
    companyId: str(r.companyId),
    action: str(r.action) ?? "",
    targetType: str(r.targetType) ?? "",
    targetId: str(r.targetId) ?? "",
    createdAt: str(r.createdAt) ?? "",
  };
}

export const adminApi = {
  getDashboard: (signal?: AbortSignal): Promise<AdminDashboardCounts> =>
    run(async () => {
      const res = await apiClient.get("/admin/dashboard", { signal });
      const d = obj(res.data);
      return {
        users: num(d.users) ?? 0,
        activeUsers: num(d.activeUsers) ?? 0,
        companies: num(d.companies) ?? 0,
        activeCompanies: num(d.activeCompanies) ?? 0,
        pendingCompanies: num(d.pendingCompanies) ?? 0,
        jobs: num(d.jobs) ?? 0,
        publishedJobs: num(d.publishedJobs) ?? 0,
        applications: num(d.applications) ?? 0,
      };
    }),

  listUsers: (
    params: { page?: number; pageSize?: number; status?: string; q?: string },
    signal?: AbortSignal,
  ): Promise<Paged<AdminUserDto>> =>
    run(async () => {
      const query: Record<string, string | number> = {};
      if (params.page && params.page > 1) query.page = params.page;
      if (params.pageSize) query.pageSize = params.pageSize;
      if (params.status) query.status = params.status;
      if (params.q?.trim()) query.q = params.q.trim();
      return normalizePaged(
        (await apiClient.get("/admin/users", { params: query, signal })).data,
        normalizeAdminUser,
      );
    }),

  setUserStatus: (userId: string, status: "ACTIVE" | "SUSPENDED"): Promise<AdminUserDto> => {
    guardWrite("cập nhật trạng thái người dùng");
    return run(async () =>
      normalizeAdminUser((await apiClient.patch(`/admin/users/${userId}/status`, { status })).data),
    );
  },

  disableUser: (userId: string): Promise<void> => {
    guardWrite("vô hiệu hóa tài khoản");
    return run(async () => {
      await apiClient.post(`/admin/users/${userId}/disable`);
    });
  },

  listCompanies: (
    params: { page?: number; pageSize?: number; status?: string },
    signal?: AbortSignal,
  ): Promise<Paged<AdminCompanyDto>> =>
    run(async () => {
      const query: Record<string, string | number> = {};
      if (params.page && params.page > 1) query.page = params.page;
      if (params.pageSize) query.pageSize = params.pageSize;
      if (params.status) query.status = params.status;
      return normalizePaged(
        (await apiClient.get("/admin/companies", { params: query, signal })).data,
        normalizeAdminCompany,
      );
    }),

  verifyCompany: (companyId: string, status: "VERIFIED" | "REJECTED", reason?: string): Promise<AdminCompanyDto> => {
    guardWrite("xét duyệt doanh nghiệp");
    return run(async () =>
      normalizeAdminCompany(
        (await apiClient.patch(`/admin/companies/${companyId}/verification`, { status, ...(reason && { reason }) })).data,
      ),
    );
  },

  setCompanyStatus: (companyId: string, status: "ACTIVE" | "SUSPENDED"): Promise<AdminCompanyDto> => {
    guardWrite("cập nhật trạng thái doanh nghiệp");
    return run(async () =>
      normalizeAdminCompany(
        (await apiClient.patch(`/admin/companies/${companyId}/status`, { status })).data,
      ),
    );
  },

  listJobs: (
    params: { page?: number; pageSize?: number; status?: string; companyId?: string },
    signal?: AbortSignal,
  ): Promise<Paged<AdminJobDto>> =>
    run(async () => {
      const query: Record<string, string | number> = {};
      if (params.page && params.page > 1) query.page = params.page;
      if (params.pageSize) query.pageSize = params.pageSize;
      if (params.status) query.status = params.status;
      if (params.companyId) query.companyId = params.companyId;
      return normalizePaged(
        (await apiClient.get("/admin/jobs", { params: query, signal })).data,
        normalizeAdminJob,
      );
    }),

  closeJob: (jobId: string): Promise<AdminJobDto> => {
    guardWrite("gỡ bỏ tin tuyển dụng");
    return run(async () =>
      normalizeAdminJob((await apiClient.post(`/admin/jobs/${jobId}/close`)).data),
    );
  },

  listAudits: (
    params: { page?: number; pageSize?: number },
    signal?: AbortSignal,
  ): Promise<Paged<AdminAuditDto>> =>
    run(async () => {
      const query: Record<string, string | number> = {};
      if (params.page && params.page > 1) query.page = params.page;
      if (params.pageSize) query.pageSize = params.pageSize;
      return normalizePaged(
        (await apiClient.get("/admin/audit", { params: query, signal })).data,
        normalizeAdminAudit,
      );
    }),
};
