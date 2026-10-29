import { apiClient, getApiBaseUrl } from "../http/apiClient";
import { isWorkspaceWritesEnabled } from "../../config/featureFlags";
import { toApiFailure, writeBlockedFailure } from "./apiFailure";
import { normalizePaged, type Paged } from "./apiTypes";
import { normalizeAdminReport, type AdminReportSummaryDto } from "../../features/reports/reportFormatters";

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
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  verifiedAt: string | null;
  verificationRejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCompanyLocationDto {
  id: string;
  countryCode: string | null;
  provinceId: string | null;
  wardId: string | null;
  addressLine: string | null;
  isHeadquarters: boolean;
}

export interface AdminCompanyDetailDto extends AdminCompanyDto {
  createdByUserId: string | null;
  legalName: string | null;
  taxCode: string | null;
  industryId: string | null;
  description: string | null;
  website: string | null;
  employeeSizeRange: string | null;
  foundedYear: number | null;
  locations: AdminCompanyLocationDto[];
  counts: {
    members: number;
    jobs: number;
    applications: number;
  };
}

export interface AdminLegalEvidenceDto {
  id: string;
  kind: "BUSINESS_REGISTRATION" | "TAX_CERTIFICATE" | "REPRESENTATIVE_AUTHORIZATION" | string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  createdAt: string;
}

export interface AdminCompanyLegalDto {
  profile: {
    companyId: string;
    registeredAddress: string;
    representativeName: string;
    representativeTitle?: string | null;
    contactEmail: string;
    contactPhone: string;
    updatedAt: string;
  } | null;
  evidences: AdminLegalEvidenceDto[];
}

export interface AdminCapabilityDto {
  code: string;
  available: boolean;
  isGranted: boolean;
  configured: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  changedByUserId: string | null;
  reason: string | null;
}

export interface AdminCompanyCapabilitiesDto {
  companyId: string;
  companyName: string;
  companyStatus: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  capabilities: AdminCapabilityDto[];
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

export interface AdminJobDetailDto extends AdminJobDto {
  description: string;
  employmentType: string;
  workplaceType: string;
  experienceMinMonths: number | null;
  experienceMaxMonths: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  salaryPeriod: string;
  salaryNegotiable: boolean;
  showSalary: boolean;
  expiresAt: string | null;
  company: {
    id: string;
    name: string;
    status: string;
    verificationStatus: string;
  } | null;
  category: {
    id: string;
    code: string;
    name: string;
  } | null;
  applicationsCount: number;
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
const bool = (v: unknown): boolean => Boolean(v);

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
    verificationStatus: (str(r.verificationStatus) as AdminCompanyDto["verificationStatus"]) ?? "UNVERIFIED",
    verifiedAt: str(r.verifiedAt),
    verificationRejectionReason: str(r.verificationRejectionReason),
    createdAt: str(r.createdAt) ?? "",
    updatedAt: str(r.updatedAt) ?? "",
  };
}

export function normalizeAdminCompanyDetail(value: unknown): AdminCompanyDetailDto {
  const r = obj(value);
  const base = normalizeAdminCompany(r);
  const countsObj = obj(r._count);
  const locationsArr = Array.isArray(r.locations) ? r.locations : [];
  return {
    ...base,
    createdByUserId: str(r.createdByUserId),
    legalName: str(r.legalName),
    taxCode: str(r.taxCode),
    industryId: str(r.industryId),
    description: str(r.description),
    website: str(r.website),
    employeeSizeRange: str(r.employeeSizeRange),
    foundedYear: num(r.foundedYear),
    locations: locationsArr.map((loc) => {
      const l = obj(loc);
      return {
        id: str(l.id) ?? "",
        countryCode: str(l.countryCode),
        provinceId: str(l.provinceId),
        wardId: str(l.wardId),
        addressLine: str(l.addressLine),
        isHeadquarters: bool(l.isHeadquarters),
      };
    }),
    counts: {
      members: num(countsObj.members) ?? 0,
      jobs: num(countsObj.jobs) ?? 0,
      applications: num(countsObj.applications) ?? 0,
    },
  };
}

export function normalizeAdminCompanyLegal(value: unknown): AdminCompanyLegalDto {
  const r = obj(value);
  const rawProfile = r.profile ? obj(r.profile) : null;
  const rawEvidences = Array.isArray(r.evidences) ? r.evidences : [];

  return {
    profile: rawProfile
      ? {
          companyId: str(rawProfile.companyId) ?? "",
          registeredAddress: str(rawProfile.registeredAddress) ?? "",
          representativeName: str(rawProfile.representativeName) ?? "",
          representativeTitle: str(rawProfile.representativeTitle),
          contactEmail: str(rawProfile.contactEmail) ?? "",
          contactPhone: str(rawProfile.contactPhone) ?? "",
          updatedAt: str(rawProfile.updatedAt) ?? "",
        }
      : null,
    evidences: rawEvidences.map((ev) => {
      const e = obj(ev);
      return {
        id: str(e.id) ?? "",
        kind: str(e.kind) ?? "",
        originalName: str(e.originalName) ?? "",
        mimeType: str(e.mimeType) ?? "",
        byteSize: num(e.byteSize) ?? 0,
        sha256: str(e.sha256) ?? "",
        createdAt: str(e.createdAt) ?? "",
      };
    }),
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

export function normalizeAdminJobDetail(value: unknown): AdminJobDetailDto {
  const r = obj(value);
  const base = normalizeAdminJob(r);
  const rawComp = r.company ? obj(r.company) : null;
  const rawCat = r.category ? obj(r.category) : null;
  const countObj = obj(r._count);

  return {
    ...base,
    description: str(r.description) ?? "",
    employmentType: str(r.employmentType) ?? "FULL_TIME",
    workplaceType: str(r.workplaceType) ?? "ON_SITE",
    experienceMinMonths: num(r.experienceMinMonths),
    experienceMaxMonths: num(r.experienceMaxMonths),
    salaryMin: num(r.salaryMin),
    salaryMax: num(r.salaryMax),
    currency: str(r.currency) ?? "VND",
    salaryPeriod: str(r.salaryPeriod) ?? "MONTHLY",
    salaryNegotiable: bool(r.salaryNegotiable),
    showSalary: bool(r.showSalary),
    expiresAt: str(r.expiresAt),
    company: rawComp
      ? {
          id: str(rawComp.id) ?? "",
          name: str(rawComp.name) ?? "",
          status: str(rawComp.status) ?? "ACTIVE",
          verificationStatus: str(rawComp.verificationStatus) ?? "UNVERIFIED",
        }
      : null,
    category: rawCat
      ? {
          id: str(rawCat.id) ?? "",
          code: str(rawCat.code) ?? "",
          name: str(rawCat.name) ?? "",
        }
      : null,
    applicationsCount: num(countObj.applications) ?? 0,
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
  getReportsSummary: (
    params?: { period?: string; startDate?: string; endDate?: string },
    signal?: AbortSignal,
  ): Promise<AdminReportSummaryDto> =>
    run(async () => {
      const query: Record<string, string> = {};
      if (params?.period) query.period = params.period;
      if (params?.startDate) query.startDate = params.startDate;
      if (params?.endDate) query.endDate = params.endDate;
      const res = await apiClient.get("/admin/reports/summary", { params: query, signal });
      return normalizeAdminReport(res.data);
    }),

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

  getUser: (userId: string, signal?: AbortSignal): Promise<AdminUserDto> =>
    run(async () => normalizeAdminUser((await apiClient.get(`/admin/users/${userId}`, { signal })).data)),

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
    params: { page?: number; pageSize?: number; status?: string; verificationStatus?: string; q?: string },
    signal?: AbortSignal,
  ): Promise<Paged<AdminCompanyDto>> =>
    run(async () => {
      const query: Record<string, string | number> = {};
      if (params.page && params.page > 1) query.page = params.page;
      if (params.pageSize) query.pageSize = params.pageSize;
      if (params.status) query.status = params.status;
      if (params.verificationStatus) query.verificationStatus = params.verificationStatus;
      if (params.q?.trim()) query.q = params.q.trim();
      return normalizePaged(
        (await apiClient.get("/admin/companies", { params: query, signal })).data,
        normalizeAdminCompany,
      );
    }),

  getCompany: (companyId: string, signal?: AbortSignal): Promise<AdminCompanyDetailDto> =>
    run(async () => normalizeAdminCompanyDetail((await apiClient.get(`/admin/companies/${companyId}`, { signal })).data)),

  getCompanyLegal: (companyId: string, signal?: AbortSignal): Promise<AdminCompanyLegalDto> =>
    run(async () => normalizeAdminCompanyLegal((await apiClient.get(`/admin/companies/${companyId}/legal`, { signal })).data)),

  getLegalEvidenceDownloadUrl: (companyId: string, evidenceId: string): string =>
    `${getApiBaseUrl()}/admin/companies/${encodeURIComponent(companyId)}/legal/evidence/${encodeURIComponent(evidenceId)}`,

  getCompanyCapabilities: (companyId: string, signal?: AbortSignal): Promise<AdminCompanyCapabilitiesDto> =>
    run(async () => (await apiClient.get(`/admin/companies/${encodeURIComponent(companyId)}/capabilities`, { signal })).data as AdminCompanyCapabilitiesDto),

  setCompanyCapability: (companyId: string, code: string, isGranted: boolean, reason: string): Promise<void> => {
    guardWrite("cập nhật năng lực doanh nghiệp");
    return run(async () => {
      await apiClient.patch(
        `/admin/companies/${encodeURIComponent(companyId)}/capabilities/${encodeURIComponent(code)}`,
        { isGranted, reason },
      );
    });
  },

  verifyCompany: (companyId: string, status: "VERIFIED" | "REJECTED", reason?: string): Promise<AdminCompanyDto> => {
    guardWrite("xét duyệt doanh nghiệp");
    return run(async () =>
      normalizeAdminCompany(
        (await apiClient.patch(`/admin/companies/${companyId}/verification`, {
          status,
          ...(reason && reason.trim() ? { reason: reason.trim() } : {}),
        })).data,
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

  getJob: (jobId: string, signal?: AbortSignal): Promise<AdminJobDetailDto> =>
    run(async () => normalizeAdminJobDetail((await apiClient.get(`/admin/jobs/${jobId}`, { signal })).data)),

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
