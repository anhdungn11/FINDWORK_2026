/**
 * DTO + normalizer cho Job / Company theo hợp đồng Backend MVP
 * (server/docs/SUBMISSION_BACKEND_MVP_API.md, bản nháp 2026-10-16).
 * Normalizer chịu được: Prisma Decimal dạng chuỗi, quan hệ lồng nhau tùy chọn,
 * và thiếu trường — không bịa dữ liệu.
 */

export type EmploymentType = "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT" | "FREELANCE" | "TEMPORARY" | "VOLUNTEER";
export type WorkplaceType = "ONSITE" | "HYBRID" | "REMOTE";
export type SalaryPeriod = "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";
export type JobStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED" | "EXPIRED" | "ARCHIVED";

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: "Toàn thời gian", PART_TIME: "Bán thời gian", INTERNSHIP: "Thực tập",
  CONTRACT: "Hợp đồng", FREELANCE: "Freelance", TEMPORARY: "Thời vụ", VOLUNTEER: "Tình nguyện",
};
export const WORKPLACE_TYPE_LABEL: Record<WorkplaceType, string> = {
  ONSITE: "Tại văn phòng", HYBRID: "Linh hoạt", REMOTE: "Từ xa",
};
export const SALARY_PERIOD_LABEL: Record<SalaryPeriod, string> = {
  HOUR: "giờ", DAY: "ngày", WEEK: "tuần", MONTH: "tháng", YEAR: "năm",
};

export interface JobDto {
  id: string;
  companyId: string | null;
  companyName: string | null;
  companySlug: string | null;
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  description: string | null;
  employmentType: EmploymentType | null;
  workplaceType: WorkplaceType | null;
  experienceMinMonths: number | null;
  experienceMaxMonths: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  salaryPeriod: SalaryPeriod | null;
  salaryNegotiable: boolean;
  showSalary: boolean;
  status: JobStatus | null;
  publishedAt: string | null;
  applicationDeadline: string | null;
  version: number | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  data: T[];
  pagination: Pagination;
}

export interface JobCategoryDto {
  id: string;
  code: string;
  name: string;
}

export interface MyCompanyDto {
  id: string;
  name: string;
  slug: string;
  status: string;
  verificationStatus: string;
  memberRoleNames: string[];
}

export interface CompanyProfileDto {
  id: string;
  name: string;
  slug: string | null;
  legalName: string | null;
  description: string | null;
  website: string | null;
  employeeSizeRange: string | null;
  foundedYear: number | null;
  verificationStatus: string | null;
  status: string | null;
}

export interface CompanyLocationDto {
  id: string;
  addressLine: string | null;
  provinceName: string | null;
  wardName: string | null;
  countryCode: string | null;
  isHeadquarters: boolean;
}

export type ApplicationReviewStatus = "REVIEWING" | "SHORTLISTED" | "INTERVIEW" | "OFFERED" | "REJECTED";
export type ApplicationStatus = "SUBMITTED" | ApplicationReviewStatus | "WITHDRAWN";

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  SUBMITTED: "Đã nộp",
  REVIEWING: "Đang xem xét",
  SHORTLISTED: "Đạt sơ tuyển",
  INTERVIEW: "Phỏng vấn",
  OFFERED: "Đã gửi offer",
  REJECTED: "Đã từ chối",
  WITHDRAWN: "Đã rút đơn",
};

export interface CompanyApplicationDto {
  id: string;
  companyId: string;
  jobId: string;
  status: ApplicationStatus;
  version: number;
  resumeId: string;
  resumeVersionId: string;
  fullNameSnapshot: string | null;
  emailSnapshot: string | null;
  phoneSnapshot: string | null;
  coverLetter: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  job?: { id: string; title: string; status: string; company?: { id: string; name: string; slug: string } };
  resumeVersion?: { id: string; versionNumber: number; builderContent: unknown };
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};

export function normalizeJob(value: unknown): JobDto {
  const r = obj(value);
  const company = obj(r.company);
  const category = obj(r.category);
  return {
    id: str(r.id) ?? "",
    companyId: str(r.companyId) ?? str(company.id),
    companyName: str(r.companyName) ?? str(company.name),
    companySlug: str(r.companySlug) ?? str(company.slug),
    categoryId: str(r.categoryId) ?? str(category.id),
    categoryName: str(r.categoryName) ?? str(category.name),
    title: str(r.title) ?? "(Không có tiêu đề)",
    description: str(r.description),
    employmentType: str(r.employmentType) as EmploymentType | null,
    workplaceType: str(r.workplaceType) as WorkplaceType | null,
    experienceMinMonths: num(r.experienceMinMonths),
    experienceMaxMonths: num(r.experienceMaxMonths),
    salaryMin: num(r.salaryMin),
    salaryMax: num(r.salaryMax),
    currency: str(r.currency) ?? "VND",
    salaryPeriod: str(r.salaryPeriod) as SalaryPeriod | null,
    salaryNegotiable: r.salaryNegotiable === true,
    showSalary: r.showSalary === true,
    status: str(r.status) as JobStatus | null,
    publishedAt: str(r.publishedAt),
    applicationDeadline: str(r.applicationDeadline),
    version: num(r.version),
  };
}

export function normalizePaged<T>(value: unknown, mapItem: (v: unknown) => T): Paged<T> {
  const r = obj(value);
  const rawItems = Array.isArray(value) ? value : Array.isArray(r.data) ? (r.data as unknown[]) : [];
  const data = rawItems.map(mapItem);
  const p = obj(r.pagination);
  const pageSize = num(p.pageSize) ?? (data.length || 20);
  const total = num(p.total) ?? data.length;
  const totalPages = num(p.totalPages) ?? Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  return { data, pagination: { page: num(p.page) ?? 1, pageSize, total, totalPages } };
}

export function normalizeCategory(value: unknown): JobCategoryDto {
  const r = obj(value);
  return { id: str(r.id) ?? "", code: str(r.code) ?? "", name: str(r.name) ?? "" };
}

export function normalizeMyCompany(value: unknown): MyCompanyDto {
  const r = obj(value);
  return {
    id: str(r.id) ?? "",
    name: str(r.name) ?? "",
    slug: str(r.slug) ?? "",
    status: str(r.status) ?? "",
    verificationStatus: str(r.verificationStatus) ?? "",
    memberRoleNames: Array.isArray(r.memberRoleNames) ? (r.memberRoleNames as unknown[]).filter((x): x is string => typeof x === "string") : [],
  };
}

export function normalizeCompanyProfile(value: unknown): CompanyProfileDto {
  const r = unwrapData(value);
  return {
    id: str(r.id) ?? "",
    name: str(r.name) ?? "",
    slug: str(r.slug),
    legalName: str(r.legalName),
    description: str(r.description),
    website: str(r.website),
    employeeSizeRange: str(r.employeeSizeRange),
    foundedYear: num(r.foundedYear),
    verificationStatus: str(r.verificationStatus),
    status: str(r.status),
  };
}

export function normalizeLocation(value: unknown): CompanyLocationDto {
  const r = obj(value);
  return {
    id: str(r.id) ?? "",
    addressLine: str(r.addressLine),
    provinceName: str(obj(r.province).name) ?? str(r.provinceName),
    wardName: str(obj(r.ward).name) ?? str(r.wardName),
    countryCode: str(r.countryCode),
    isHeadquarters: r.isHeadquarters === true,
  };
}

export function normalizeCompanyApplication(value: unknown): CompanyApplicationDto {
  const r = unwrapData(value);
  const j = obj(r.job);
  const jComp = obj(j.company);
  const rv = obj(r.resumeVersion);
  return {
    id: str(r.id) ?? "",
    companyId: str(r.companyId) ?? "",
    jobId: str(r.jobId) ?? "",
    status: (str(r.status) as ApplicationStatus) ?? "SUBMITTED",
    version: num(r.version) ?? 1,
    resumeId: str(r.resumeId) ?? "",
    resumeVersionId: str(r.resumeVersionId) ?? "",
    fullNameSnapshot: str(r.fullNameSnapshot),
    emailSnapshot: str(r.emailSnapshot),
    phoneSnapshot: str(r.phoneSnapshot),
    coverLetter: str(r.coverLetter),
    submittedAt: str(r.submittedAt),
    createdAt: str(r.createdAt) ?? "",
    updatedAt: str(r.updatedAt) ?? "",
    job: j.id ? {
      id: str(j.id) ?? "",
      title: str(j.title) ?? "",
      status: str(j.status) ?? "",
      company: jComp.id ? { id: str(jComp.id) ?? "", name: str(jComp.name) ?? "", slug: str(jComp.slug) ?? "" } : undefined,
    } : undefined,
    resumeVersion: rv.id ? {
      id: str(rv.id) ?? "",
      versionNumber: num(rv.versionNumber) ?? 1,
      builderContent: rv.builderContent,
    } : undefined,
  };
}

/** Bóc lớp `{data: {...}}` nếu có. */
export function unwrapData(value: unknown): Raw {
  const r = obj(value);
  return r.data && typeof r.data === "object" && !Array.isArray(r.data) ? obj(r.data) : r;
}

export function formatSalary(job: Pick<JobDto, "salaryMin" | "salaryMax" | "currency" | "salaryPeriod" | "salaryNegotiable" | "showSalary">): string {
  if (!job.showSalary) return job.salaryNegotiable ? "Thương lượng" : "Không công bố";
  const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
  const per = job.salaryPeriod ? ` / ${SALARY_PERIOD_LABEL[job.salaryPeriod]}` : "";
  if (job.salaryMin !== null && job.salaryMax !== null) return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)} ${job.currency}${per}`;
  if (job.salaryMin !== null) return `Từ ${fmt(job.salaryMin)} ${job.currency}${per}`;
  if (job.salaryMax !== null) return `Đến ${fmt(job.salaryMax)} ${job.currency}${per}`;
  return job.salaryNegotiable ? "Thương lượng" : "Không công bố";
}
