import { apiClient } from "../http/apiClient";
import { toApiFailure } from "./apiFailure";
import {
  normalizeCompanyApplication,
  normalizePaged,
  unwrapData,
  type CompanyApplicationDto,
  type Paged,
} from "./apiTypes";

export interface SubmitApplicationInput {
  resumeId: string;
  resumeVersionId: string;
  coverLetter?: string;
}

export interface CandidateApplicationQuery {
  page?: number;
  pageSize?: number;
  status?: string;
}

export const candidateApplicationApi = {
  /**
   * POST /api/v1/jobs/:jobId/applications
   * Nộp đơn ứng tuyển cho một tin tuyển dụng đang mở.
   * Yêu cầu CandidateProfile đã tồn tại và CV thuộc quyền sở hữu của ứng viên.
   */
  async submit(
    jobId: string,
    input: SubmitApplicationInput,
    signal?: AbortSignal,
  ): Promise<CompanyApplicationDto> {
    try {
      const res = await apiClient.post(
        `/jobs/${encodeURIComponent(jobId)}/applications`,
        {
          resumeId: input.resumeId,
          resumeVersionId: input.resumeVersionId,
          ...(input.coverLetter?.trim() ? { coverLetter: input.coverLetter.trim() } : {}),
        },
        { signal },
      );
      return normalizeCompanyApplication(unwrapData(res.data));
    } catch (e) {
      throw toApiFailure(e);
    }
  },

  /**
   * GET /api/v1/candidate/applications
   * Danh sách đơn ứng tuyển của ứng viên đang đăng nhập.
   */
  async list(
    query: CandidateApplicationQuery = {},
    signal?: AbortSignal,
  ): Promise<Paged<CompanyApplicationDto>> {
    try {
      const params: Record<string, string | number> = {};
      if (query.page && query.page > 1) params.page = query.page;
      if (query.pageSize) params.pageSize = query.pageSize;
      if (query.status && query.status.trim()) params.status = query.status.trim();

      const res = await apiClient.get("/candidate/applications", { params, signal });
      return normalizePaged(res.data, normalizeCompanyApplication);
    } catch (e) {
      throw toApiFailure(e);
    }
  },

  /**
   * GET /api/v1/candidate/applications/:applicationId
   * Xem chi tiết một đơn ứng tuyển kèm nội dung CV snapshot.
   */
  async get(
    applicationId: string,
    signal?: AbortSignal,
  ): Promise<CompanyApplicationDto> {
    try {
      const res = await apiClient.get(
        `/candidate/applications/${encodeURIComponent(applicationId)}`,
        { signal },
      );
      return normalizeCompanyApplication(unwrapData(res.data));
    } catch (e) {
      throw toApiFailure(e);
    }
  },
};
