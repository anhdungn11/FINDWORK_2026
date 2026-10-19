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

export const SCREENING_QUESTION_TYPES = ["TEXT", "TEXTAREA", "YES_NO", "SELECT", "MULTI_SELECT"] as const;
export type ScreeningQuestionType = (typeof SCREENING_QUESTION_TYPES)[number];

export interface ScreeningQuestionDto {
  id: string;
  type: ScreeningQuestionType;
  label: string;
  isRequired: boolean;
  displayOrder: number;
  options: string[] | null;
}

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
  screeningQuestions?: ScreeningQuestionDto[];
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
  taxCode?: string | null;
  industryId?: string | null;
  description: string | null;
  website: string | null;
  employeeSizeRange: string | null;
  foundedYear: number | null;
  verificationStatus: string | null;
  status: string | null;
}

export const ASSIGNABLE_COMPANY_ROLES = ["ADMIN", "HR_MANAGER", "RECRUITER", "HIRING_MANAGER", "VIEWER"] as const;
export type AssignableCompanyRole = (typeof ASSIGNABLE_COMPANY_ROLES)[number];

export interface CompanyMemberDto {
  id: string;
  companyId: string;
  status: "ACTIVE" | "INACTIVE" | "REMOVED";
  isOwner: boolean;
  joinedAt: string;
  removedAt: string | null;
  user: {
    id: string;
    email: string;
    status: string;
  };
  roles: Array<{
    role: {
      id: string;
      name: string;
    };
  }>;
}

export interface CompanyInvitationDto {
  id: string;
  companyId: string;
  emailNormalized: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  invitedByMemberId: string | null;
}

export interface ScreeningQuestionInput {
  type: ScreeningQuestionType;
  label: string;
  isRequired: boolean;
  displayOrder: number;
  options?: string[];
}

export interface CompanyLocationDto {
  id: string;
  addressLine: string | null;
  provinceName: string | null;
  wardName: string | null;
  countryCode: string | null;
  isHeadquarters: boolean;
}

export interface PublicCompanyDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  employeeSizeRange: string | null;
  foundedYear: number | null;
  isVerified: boolean;
  industry: { id: string; code: string; name: string } | null;
  headquarters: {
    countryCode: string | null;
    province: { id: string; code: string; name: string } | null;
    ward: { id: string; code: string; name: string } | null;
  } | null;
  jobsCount: number;
}

export interface PublicCompanyQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  industryCode?: string;
  provinceId?: string;
  verifiedOnly?: boolean;
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

export const formatAvailability = (val?: string | null): string => {
  if (!val) return "—";
  const normalized = val.toUpperCase().replaceAll("-", "_");
  const map: Record<string, string> = {
    IMMEDIATELY: "Có thể đi làm ngay",
    WITHIN_1_WEEK: "Trong vòng 1 tuần",
    WITHIN_2_WEEKS: "Trong vòng 2 tuần",
    WITHIN_1_MONTH: "Trong vòng 1 tháng",
    NEGOTIABLE: "Thương lượng",
  };
  return map[normalized] || val;
};

export const formatContactMethod = (val?: string | null): string => {
  if (!val) return "—";
  const normalized = val.toUpperCase();
  if (normalized === "EMAIL") return "Email";
  if (normalized === "PHONE") return "Điện thoại";
  return val;
};


export interface CompanyApplicationAnswerDto {
  id: string;
  screeningQuestionId: string;
  questionSnapshot: unknown;
  answerValue: unknown;
  createdAt: string;
}

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
  currentLocationSnapshot?: string | null;
  availability?: string | null;
  preferredContactMethod?: string | null;
  jobSnapshot?: unknown;
  coverLetter: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  job?: { id: string; title: string; status: string; company?: { id: string; name: string; slug: string } };
  resumeVersion?: {
    id: string;
    versionNumber: number;
    templateCode?: string | null;
    builderContent?: unknown;
    builderSettings?: unknown;
  };
  answers?: CompanyApplicationAnswerDto[];
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};

export function normalizeScreeningQuestions(raw: unknown): ScreeningQuestionDto[] {
  if (!Array.isArray(raw)) return [];
  const validTypes: readonly ScreeningQuestionType[] = ["TEXT", "TEXTAREA", "YES_NO", "SELECT", "MULTI_SELECT"];
  return raw
    .filter((q): q is Record<string, unknown> => typeof q === "object" && q !== null)
    .map((q) => {
      const rawType = typeof q.type === "string" ? q.type.toUpperCase() : "TEXT";
      const type = validTypes.includes(rawType as ScreeningQuestionType)
        ? (rawType as ScreeningQuestionType)
        : "TEXT";
      return {
        id: str(q.id) ?? "",
        type,
        label: str(q.label) ?? "",
        isRequired: q.isRequired === true,
        displayOrder: num(q.displayOrder) ?? 0,
        options: Array.isArray(q.options)
          ? q.options.filter((opt): opt is string => typeof opt === "string")
          : null,
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

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
    screeningQuestions: normalizeScreeningQuestions(r.screeningQuestions),
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
    taxCode: str(r.taxCode),
    industryId: str(r.industryId),
    description: str(r.description),
    website: str(r.website),
    employeeSizeRange: str(r.employeeSizeRange),
    foundedYear: num(r.foundedYear),
    verificationStatus: str(r.verificationStatus),
    status: str(r.status),
  };
}

export function normalizeCompanyMember(value: unknown): CompanyMemberDto {
  const r = obj(value);
  const u = obj(r.user);
  const rawRoles = Array.isArray(r.roles) ? r.roles : [];
  return {
    id: str(r.id) ?? "",
    companyId: str(r.companyId) ?? "",
    status: (str(r.status) as CompanyMemberDto["status"]) ?? "ACTIVE",
    isOwner: r.isOwner === true,
    joinedAt: str(r.joinedAt) ?? "",
    removedAt: str(r.removedAt),
    user: {
      id: str(u.id) ?? "",
      email: str(u.email) ?? "",
      status: str(u.status) ?? "ACTIVE",
    },
    roles: rawRoles.map((item) => {
      const ro = obj(item);
      const inner = obj(ro.role);
      return {
        role: {
          id: str(inner.id) ?? "",
          name: str(inner.name) ?? "",
        },
      };
    }),
  };
}

export function normalizeCompanyInvitation(value: unknown): CompanyInvitationDto {
  const r = obj(value);
  return {
    id: str(r.id) ?? "",
    companyId: str(r.companyId) ?? "",
    emailNormalized: str(r.emailNormalized) ?? str(r.email) ?? "",
    status: (str(r.status) as CompanyInvitationDto["status"]) ?? "PENDING",
    expiresAt: str(r.expiresAt) ?? "",
    acceptedAt: str(r.acceptedAt),
    revokedAt: str(r.revokedAt),
    createdAt: str(r.createdAt) ?? "",
    invitedByMemberId: str(r.invitedByMemberId),
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

export function normalizePublicCompany(value: unknown): PublicCompanyDto {
  const r = unwrapData(value);
  const ind = r.industry && typeof r.industry === "object" ? (r.industry as Record<string, unknown>) : null;
  const hq = r.headquarters && typeof r.headquarters === "object" ? (r.headquarters as Record<string, unknown>) : null;
  const loc0 = Array.isArray(r.locations) && r.locations[0] && typeof r.locations[0] === "object"
    ? (r.locations[0] as Record<string, unknown>)
    : null;
  const effectiveHq = hq ?? loc0;
  const prov = effectiveHq && effectiveHq.province && typeof effectiveHq.province === "object"
    ? (effectiveHq.province as Record<string, unknown>)
    : null;
  const ward = effectiveHq && effectiveHq.ward && typeof effectiveHq.ward === "object"
    ? (effectiveHq.ward as Record<string, unknown>)
    : null;

  return {
    id: str(r.id) ?? "",
    name: str(r.name) ?? "",
    slug: str(r.slug) ?? "",
    description: str(r.description),
    website: str(r.website),
    employeeSizeRange: str(r.employeeSizeRange),
    foundedYear: num(r.foundedYear),
    isVerified: r.isVerified === true || r.verificationStatus === "VERIFIED",
    industry: ind && str(ind.id) ? {
      id: str(ind.id) ?? "",
      code: str(ind.code) ?? "",
      name: str(ind.name) ?? "",
    } : null,
    headquarters: effectiveHq ? {
      countryCode: str(effectiveHq.countryCode),
      province: prov && (str(prov.id) || str(prov.name)) ? {
        id: str(prov.id) ?? "",
        code: str(prov.code) ?? "",
        name: str(prov.name) ?? "",
      } : null,
      ward: ward && (str(ward.id) || str(ward.name)) ? {
        id: str(ward.id) ?? "",
        code: str(ward.code) ?? "",
        name: str(ward.name) ?? "",
      } : null,
    } : null,
    jobsCount: num(r.jobsCount) ?? (typeof r._count === "object" && r._count !== null && "jobs" in r._count ? num((r._count as Record<string, unknown>).jobs) ?? 0 : 0),
  };
}

export function normalizeCompanyApplication(value: unknown): CompanyApplicationDto {
  const r = unwrapData(value);
  const j = obj(r.job);
  const jComp = obj(j.company);
  const rv = obj(r.resumeVersion);
  const rawAnswers = Array.isArray(r.answers) ? r.answers : [];

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
    currentLocationSnapshot: str(r.currentLocationSnapshot),
    availability: str(r.availability),
    preferredContactMethod: str(r.preferredContactMethod),
    jobSnapshot: r.jobSnapshot,
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
      templateCode: str(rv.templateCode),
      builderContent: rv.builderContent,
      builderSettings: rv.builderSettings,
    } : undefined,
    answers: rawAnswers.map((a: unknown) => {
      const aObj = obj(a);
      return {
        id: str(aObj.id) ?? "",
        screeningQuestionId: str(aObj.screeningQuestionId) ?? "",
        questionSnapshot: aObj.questionSnapshot,
        answerValue: aObj.answerValue,
        createdAt: str(aObj.createdAt) ?? "",
      };
    }),
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
