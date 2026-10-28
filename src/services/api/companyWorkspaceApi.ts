import { apiClient, getApiBaseUrl } from "../http/apiClient";
import { isWorkspaceWritesEnabled } from "../../config/featureFlags";
import { toApiFailure, writeBlockedFailure } from "./apiFailure";
import {
  normalizeCompanyProfile, normalizeJob, normalizeLocation, normalizeMyCompany, normalizePaged,
  normalizeCompanyApplication, normalizeCompanyMember, normalizeCompanyInvitation,
  normalizeScreeningQuestions, unwrapData, normalizeCompanyLegalData, normalizeCompanyLegalEvidence,
  normalizeCompanyInterview,
  type CompanyLocationDto, type CompanyProfileDto, type EmploymentType, type JobDto,
  type MyCompanyDto, type Paged, type SalaryPeriod, type WorkplaceType,
  type CompanyApplicationDto, type ApplicationReviewStatus,
  type CompanyMemberDto, type CompanyInvitationDto, type AssignableCompanyRole,
  type ScreeningQuestionDto, type ScreeningQuestionInput, type CompanyMediaKind, type CompanyMediaResponse,
  type CompanyLegalDataDto, type CompanyLegalEvidenceDto, type CompanyInterviewDto,
} from "./apiTypes";

export interface UpdateCompanyLegalInput {
  registeredAddress: string;
  representativeName: string;
  representativeTitle?: string | null;
  contactEmail: string;
  contactPhone: string;
}

export interface ScheduleInterviewInput {
  scheduledAt: string;
  durationMinutes: number;
  type: "ONSITE" | "PHONE" | "VIDEO";
  provider?: "MANUAL" | "ZOOM";
  location?: string | null;
  meetingUrl?: string | null;
}

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

export interface CreateCompanyInput {
  name: string;
  slug: string;
}

export interface UpdateCompanyProfileInput {
  name?: string;
  legalName?: string | null;
  taxCode?: string | null;
  industryId?: string | null;
  description?: string | null;
  website?: string | null;
  employeeSizeRange?: string | null;
  foundedYear?: number | null;
}

export interface CompanyLocationInput {
  addressLine?: string | null;
  countryCode?: string | null;
  provinceId?: string | null;
  wardId?: string | null;
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

/** Company workspace — đầy đủ các endpoint theo hợp đồng Backend. Quyền do Backend kiểm soát. */
export const companyWorkspaceApi = {
  listMine: (signal?: AbortSignal): Promise<MyCompanyDto[]> =>
    run(async () => items((await apiClient.get("/companies/me", { signal })).data).map(normalizeMyCompany)),

  createCompany: (input: CreateCompanyInput): Promise<MyCompanyDto> => {
    guardWrite("đăng ký doanh nghiệp mới");
    return run(async () => normalizeMyCompany(unwrapData((await apiClient.post("/companies", input)).data)));
  },

  getProfile: (companyId: string, signal?: AbortSignal): Promise<CompanyProfileDto> =>
    run(async () => normalizeCompanyProfile((await apiClient.get(`/companies/${companyId}/profile`, { signal })).data)),

  updateProfile: (companyId: string, input: UpdateCompanyProfileInput): Promise<CompanyProfileDto> => {
    guardWrite("cập nhật hồ sơ doanh nghiệp");
    return run(async () => normalizeCompanyProfile(unwrapData((await apiClient.patch(`/companies/${companyId}/profile`, input)).data)));
  },

  requestVerification: (companyId: string): Promise<void> => {
    guardWrite("gửi yêu cầu xác minh doanh nghiệp");
    return run(async () => {
      await apiClient.post(`/companies/${companyId}/verification-request`);
    });
  },

  listLocations: (companyId: string, signal?: AbortSignal): Promise<CompanyLocationDto[]> =>
    run(async () => items((await apiClient.get(`/companies/${companyId}/locations`, { signal })).data).map(normalizeLocation)),

  createLocation: (companyId: string, input: CompanyLocationInput): Promise<CompanyLocationDto> => {
    guardWrite("thêm địa điểm làm việc");
    return run(async () => normalizeLocation(unwrapData((await apiClient.post(`/companies/${companyId}/locations`, input)).data)));
  },

  updateLocation: (companyId: string, locationId: string, input: CompanyLocationInput): Promise<CompanyLocationDto> => {
    guardWrite("cập nhật địa điểm làm việc");
    return run(async () => normalizeLocation(unwrapData((await apiClient.patch(`/companies/${companyId}/locations/${locationId}`, input)).data)));
  },

  promoteHeadquarters: (companyId: string, locationId: string): Promise<CompanyLocationDto> => {
    guardWrite("chuyển trụ sở chính");
    return run(async () => normalizeLocation(unwrapData((await apiClient.put(`/companies/${companyId}/locations/${locationId}/headquarters`)).data)));
  },

  deleteLocation: (companyId: string, locationId: string): Promise<void> => {
    guardWrite("xóa địa điểm làm việc");
    return run(async () => {
      await apiClient.delete(`/companies/${companyId}/locations/${locationId}`);
    });
  },

  listMembers: (companyId: string, signal?: AbortSignal): Promise<CompanyMemberDto[]> =>
    run(async () => items((await apiClient.get(`/companies/${companyId}/members`, { signal })).data).map(normalizeCompanyMember)),

  updateMemberRole: (companyId: string, memberId: string, role: AssignableCompanyRole): Promise<CompanyMemberDto> => {
    guardWrite("thay đổi vai trò thành viên");
    return run(async () => normalizeCompanyMember(unwrapData((await apiClient.patch(`/companies/${companyId}/members/${memberId}/role`, { role })).data)));
  },

  removeMember: (companyId: string, memberId: string): Promise<{ id: string; status: string }> => {
    guardWrite("xóa thành viên khỏi doanh nghiệp");
    return run(async () => {
      const res = await apiClient.delete(`/companies/${companyId}/members/${memberId}`);
      return unwrapData(res.data) as { id: string; status: string };
    });
  },

  transferOwnership: (
    companyId: string,
    memberId: string,
  ): Promise<{ companyId: string; previousOwnerMemberId: string; ownerMemberId: string }> => {
    guardWrite("chuyển quyền chủ sở hữu");
    return run(async () => {
      const res = await apiClient.post(`/companies/${companyId}/members/ownership-transfer`, { memberId });
      return unwrapData(res.data) as { companyId: string; previousOwnerMemberId: string; ownerMemberId: string };
    });
  },

  listInvitations: (companyId: string, signal?: AbortSignal): Promise<CompanyInvitationDto[]> =>
    run(async () => items((await apiClient.get(`/companies/${companyId}/invitations`, { signal })).data).map(normalizeCompanyInvitation)),

  createInvitation: (companyId: string, email: string): Promise<CompanyInvitationDto> => {
    guardWrite("mời thành viên");
    return run(async () => normalizeCompanyInvitation(unwrapData((await apiClient.post(`/companies/${companyId}/invitations`, { email })).data)));
  },

  revokeInvitation: (companyId: string, invitationId: string): Promise<void> => {
    guardWrite("thu hồi lời mời");
    return run(async () => {
      await apiClient.post(`/companies/${companyId}/invitations/${invitationId}/revoke`);
    });
  },

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

  listScreeningQuestions: (companyId: string, jobId: string, signal?: AbortSignal): Promise<{ jobId: string; version: number; questions: ScreeningQuestionDto[] }> =>
    run(async () => {
      const res = await apiClient.get(`/companies/${companyId}/jobs/${jobId}/screening-questions`, { signal });
      const raw = unwrapData(res.data);
      return {
        jobId: String(raw.jobId ?? jobId),
        version: Number(raw.version ?? 1),
        questions: normalizeScreeningQuestions(raw.questions),
      };
    }),

  replaceScreeningQuestions: (companyId: string, jobId: string, version: number, questions: ScreeningQuestionInput[]): Promise<{ jobId: string; version: number; questions: ScreeningQuestionDto[] }> => {
    guardWrite("cập nhật câu hỏi sàng lọc");
    return run(async () => {
      const res = await apiClient.put(`/companies/${companyId}/jobs/${jobId}/screening-questions`, { version, questions });
      const raw = unwrapData(res.data);
      return {
        jobId: String(raw.jobId ?? jobId),
        version: Number(raw.version ?? version + 1),
        questions: normalizeScreeningQuestions(raw.questions),
      };
    });
  },

  listJobApplications: (
    companyId: string,
    jobId: string,
    params: { page?: number; pageSize?: number; status?: string },
    signal?: AbortSignal,
  ): Promise<Paged<CompanyApplicationDto>> =>
    run(async () => {
      const query: Record<string, string | number> = {};
      if (params.page && params.page > 1) query.page = params.page;
      if (params.pageSize) query.pageSize = params.pageSize;
      if (params.status) query.status = params.status;
      return normalizePaged(
        (await apiClient.get(`/companies/${companyId}/jobs/${jobId}/applications`, { params: query, signal })).data,
        normalizeCompanyApplication,
      );
    }),

  getApplication: (companyId: string, jobId: string, applicationId: string, signal?: AbortSignal): Promise<CompanyApplicationDto> =>
    run(async () =>
      normalizeCompanyApplication(
        unwrapData((await apiClient.get(`/companies/${companyId}/jobs/${jobId}/applications/${applicationId}`, { signal })).data),
      ),
    ),

  reviewApplication: (
    companyId: string,
    jobId: string,
    applicationId: string,
    version: number,
    status: ApplicationReviewStatus,
  ): Promise<CompanyApplicationDto> => {
    guardWrite("cập nhật trạng thái ứng viên");
    return run(async () =>
      normalizeCompanyApplication(
        unwrapData(
          (await apiClient.patch(`/companies/${companyId}/jobs/${jobId}/applications/${applicationId}/status`, {
            version,
            status,
          })).data,
        ),
      ),
    );
  },

  getMediaUrl: (companyId: string, kind: CompanyMediaKind, cacheBust?: number): string => {
    const base = `${getApiBaseUrl()}/companies/${encodeURIComponent(companyId)}/media/${kind}`;
    return cacheBust ? `${base}?t=${cacheBust}` : base;
  },

  uploadMedia: async (
    companyId: string,
    kind: CompanyMediaKind,
    file: File,
  ): Promise<CompanyMediaResponse> => {
    guardWrite(`tải lên phương tiện ${kind}`);
    return run(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.put<CompanyMediaResponse>(
        `/companies/${encodeURIComponent(companyId)}/media/${kind}`,
        formData,
      );
      return res.data;
    });
  },

  deleteMedia: async (
    companyId: string,
    kind: CompanyMediaKind,
  ): Promise<CompanyMediaResponse> => {
    guardWrite(`xóa phương tiện ${kind}`);
    return run(async () => {
      const res = await apiClient.delete<CompanyMediaResponse>(
        `/companies/${encodeURIComponent(companyId)}/media/${kind}`,
      );
      return res.data;
    });
  },

  getLegalData: (companyId: string, signal?: AbortSignal): Promise<CompanyLegalDataDto> =>
    run(async () => normalizeCompanyLegalData((await apiClient.get(`/companies/${encodeURIComponent(companyId)}/legal`, { signal })).data)),

  updateLegalProfile: (companyId: string, input: UpdateCompanyLegalInput): Promise<any> => {
    guardWrite("cập nhật thông tin pháp lý");
    return run(async () => unwrapData((await apiClient.patch(`/companies/${encodeURIComponent(companyId)}/legal`, input)).data));
  },

  uploadLegalEvidence: async (
    companyId: string,
    kind: "BUSINESS_REGISTRATION" | "TAX_CERTIFICATE" | "REPRESENTATIVE_AUTHORIZATION",
    file: File,
  ): Promise<CompanyLegalEvidenceDto> => {
    guardWrite("tải lên chứng từ pháp lý");
    return run(async () => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      const res = await apiClient.post(
        `/companies/${encodeURIComponent(companyId)}/legal/evidence`,
        formData,
      );
      return normalizeCompanyLegalEvidence(unwrapData(res.data));
    });
  },

  deleteLegalEvidence: async (companyId: string, evidenceId: string): Promise<{ id: string; removed: boolean }> => {
    guardWrite("xóa chứng từ pháp lý");
    return run(async () => {
      const res = await apiClient.delete(`/companies/${encodeURIComponent(companyId)}/legal/evidence/${encodeURIComponent(evidenceId)}`);
      return unwrapData(res.data) as { id: string; removed: boolean };
    });
  },

  adminSetCompanyVerification: async (companyId: string, status: "VERIFIED" | "REJECTED"): Promise<any> => {
    guardWrite("phê duyệt xác minh doanh nghiệp");
    return run(async () => {
      const res = await apiClient.patch(`/admin/companies/${encodeURIComponent(companyId)}/verification`, { status });
      return unwrapData(res.data);
    });
  },

  scheduleInterview: async (
    companyId: string,
    applicationId: string,
    input: ScheduleInterviewInput,
  ): Promise<CompanyInterviewDto> => {
    guardWrite("lên lịch phỏng vấn ứng viên");
    return run(async () => {
      const res = await apiClient.post(
        `/companies/${encodeURIComponent(companyId)}/applications/${encodeURIComponent(applicationId)}/interviews`,
        input,
      );
      return normalizeCompanyInterview(res.data);
    });
  },

  listApplicationInterviews: async (
    companyId: string,
    applicationId: string,
    signal?: AbortSignal,
  ): Promise<CompanyInterviewDto[]> =>
    run(async () =>
      items(
        (
          await apiClient.get(
            `/companies/${encodeURIComponent(companyId)}/applications/${encodeURIComponent(applicationId)}/interviews`,
            { signal }
          )
        ).data
      ).map(normalizeCompanyInterview)
    ),

  cancelInterview: async (companyId: string, interviewId: string): Promise<any> => {
    guardWrite("hủy lịch phỏng vấn");
    return run(async () => {
      const res = await apiClient.patch(`/companies/${encodeURIComponent(companyId)}/interviews/${encodeURIComponent(interviewId)}/cancel`);
      return unwrapData(res.data);
    });
  },

  completeInterview: async (companyId: string, interviewId: string): Promise<any> => {
    guardWrite("hoàn thành phỏng vấn");
    return run(async () => {
      const res = await apiClient.patch(`/companies/${encodeURIComponent(companyId)}/interviews/${encodeURIComponent(interviewId)}/complete`);
      return unwrapData(res.data);
    });
  },

  rescheduleInterview: async (companyId: string, interviewId: string, scheduledAt: string): Promise<any> => {
    guardWrite("dời lịch phỏng vấn");
    return run(async () => {
      const res = await apiClient.patch(`/companies/${encodeURIComponent(companyId)}/interviews/${encodeURIComponent(interviewId)}/reschedule`, { scheduledAt });
      return unwrapData(res.data);
    });
  },
};

/**
 * Các trạng thái chuyển tiếp ứng viên hợp lệ theo hợp đồng Backend:
 * SUBMITTED -> REVIEWING / REJECTED
 * REVIEWING -> SHORTLISTED / REJECTED
 * SHORTLISTED -> INTERVIEW / REJECTED
 * INTERVIEW -> OFFERED / REJECTED
 */
export const availableReviewTransitions = (status: string | null): ApplicationReviewStatus[] => {
  if (status === "SUBMITTED") return ["REVIEWING", "REJECTED"];
  if (status === "REVIEWING") return ["SHORTLISTED", "REJECTED"];
  if (status === "SHORTLISTED") return ["INTERVIEW", "REJECTED"];
  if (status === "INTERVIEW") return ["OFFERED", "REJECTED"];
  return [];
};

/** Chuyển trạng thái hợp lệ theo hợp đồng: DRAFT→PUBLISHED, PUBLISHED→PAUSED/CLOSED, PAUSED→PUBLISHED/CLOSED. */
export const availableTransitions = (status: string | null): JobTransition[] => {
  if (status === "DRAFT") return ["publish"];
  if (status === "PUBLISHED") return ["pause", "close"];
  if (status === "PAUSED") return ["publish", "close"];
  return [];
};

export const canEditJob = (status: string | null): boolean => status === "DRAFT";
