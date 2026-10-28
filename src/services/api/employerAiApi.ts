/**
 * FINDWORK — Employer Business AI API Client & Type Definitions
 *
 * Chú ý bảo mật:
 * - Mọi endpoint đều thuộc phạm vi Doanh nghiệp (Company-scoped): /companies/:companyId/ai/*
 * - Xác thực thông qua Bearer Access Token + Quyền thành viên nội bộ (Company RBAC)
 * - Tách biệt hoàn toàn với Candidate AI: Không lưu hoặc đọc lịch sử trò chuyện của ứng viên
 * - Tuân thủ nguyên tắc AI Tuyển dụng có trách nhiệm (Responsible Recruiting AI):
 *   Không tự động ra quyết định tuyển dụng/từ chối, không tự động publish tin tuyển dụng.
 */

import { apiClient, extractApiErrorMessage } from "../http/apiClient";

/* =========================================================================
 * Request / Response Interfaces
 * ========================================================================= */

export type AiTone = "PROFESSIONAL" | "CASUAL" | "STARTUP" | "EXECUTIVE";
export type WorkplaceType = "ON_SITE" | "REMOTE" | "HYBRID";
export type ExperienceLevel = "INTERN" | "FRESHER" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "MANAGER" | "DIRECTOR";
export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";

export interface DraftJobRequest {
  title: string;
  department?: string;
  employmentType?: EmploymentType;
  workplaceType?: WorkplaceType;
  experienceLevel?: ExperienceLevel;
  location?: string;
  salaryRange?: string;
  primarySkills?: string[];
  responsibilitiesBrief?: string;
  requirementsBrief?: string;
  tone?: AiTone;
}

export interface DraftJobResponse {
  title: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave?: string[];
  benefits: string[];
  suggestedSkills: string[];
  fullMarkdown: string;
}

export type JobImprovementFocus = "CLARITY" | "INCLUSIVITY" | "ENGAGEMENT" | "COMPLIANCE" | "ALL";

export interface ImproveJobRequest {
  jobId?: string;
  title: string;
  description: string;
  requirements?: string;
  focusArea?: JobImprovementFocus;
}

export interface JobCritiqueItem {
  category: "clarity" | "inclusivity" | "engagement" | "compliance";
  feedback: string;
  severity: "SUGGESTION" | "RECOMMENDED" | "CRITICAL";
}

export interface ImproveJobResponse {
  improvedDescription: string;
  improvedRequirements: string;
  critique: JobCritiqueItem[];
  readabilityScore?: number;
  inclusivityScore?: number;
}

export type ScreeningQuestionType = "YES_NO" | "NUMBER" | "SINGLE_CHOICE" | "TEXT";

export interface AiScreeningQuestion {
  question: string;
  type: ScreeningQuestionType;
  isRequired: boolean;
  idealAnswer?: string;
  options?: string[];
  competencyTarget?: string;
}

export interface ScreeningQuestionsRequest {
  jobTitle: string;
  keySkills: string[];
  experienceYears?: number;
  questionCount?: number;
}

export interface ScreeningQuestionsResponse {
  jobTitle: string;
  questions: AiScreeningQuestion[];
}

export type InterviewStage = "HR_SCREENING" | "TECHNICAL" | "CULTURE_FIT" | "HIRING_MANAGER";

export interface InterviewQuestionItem {
  question: string;
  purpose: string;
  sampleEvaluationCriteria: string;
  redFlags?: string;
}

export interface InterviewQuestionCategory {
  categoryName: string;
  questions: InterviewQuestionItem[];
}

export interface InterviewQuestionsRequest {
  jobTitle: string;
  level: ExperienceLevel;
  stage: InterviewStage;
  focusSkills?: string[];
  customContext?: string;
}

export interface InterviewQuestionsResponse {
  jobTitle: string;
  stage: InterviewStage;
  categories: InterviewQuestionCategory[];
}

export interface RecruitmentPlanPhase {
  phaseName: string;
  timelineWeeks: string;
  keyActivities: string[];
  recommendedSourcingChannels: string[];
  kpiMilestones: string[];
}

export interface RecruitmentPlanRequest {
  jobTitle: string;
  targetHires: number;
  targetTimelineDays: number;
  urgencyLevel?: "NORMAL" | "HIGH" | "CRITICAL";
  companySize?: string;
}

export interface RecruitmentPlanResponse {
  jobTitle: string;
  estimatedTimeToHire: string;
  phases: RecruitmentPlanPhase[];
  riskMitigationTips: string[];
}

export interface CompanyAiQuotaDto {
  companyId: string;
  planName: string;
  monthlyCreditsTotal: number;
  monthlyCreditsRemaining: number;
  dailyRequestsUsed: number;
  dailyRequestsLimit: number;
  renewsAt: string;
}

export interface CompanyAiStatusResponse {
  status: "available" | "unavailable" | "unconfigured" | "pending_codex_backend";
  version: string;
  features: {
    jobDrafting: boolean;
    jobReview: boolean;
    screeningQuestions: boolean;
    interviewQuestions: boolean;
    recruitmentPlan: boolean;
  };
  supportedModels: string[];
}

/* =========================================================================
 * Error Hierarchy
 * ========================================================================= */

export class CompanyAiNotImplementedError extends Error {
  readonly code = "COMPANY_AI_NOT_IMPLEMENTED";
  readonly status = 404;
  readonly endpoint: string;

  constructor(endpoint: string, message?: string) {
    super(
      message ||
        `Endpoint trí tuệ nhân tạo doanh nghiệp (${endpoint}) chưa được triển khai trên máy chủ Backend (HTTP 404). ` +
        `Đặc tả API Contract CP13B đã sẵn sàng cho Codex tích hợp.`
    );
    this.name = "CompanyAiNotImplementedError";
    this.endpoint = endpoint;
  }
}

export class CompanyAiUnavailableError extends Error {
  readonly code: string;
  readonly status = 503;

  constructor(code = "AI_PROVIDER_UNAVAILABLE", message?: string) {
    super(
      message ||
        "Dịch vụ AI Doanh nghiệp chưa kết nối với nhà cung cấp LLM hoặc cấu hình API Key chưa hoàn tất trên máy chủ (HTTP 503)."
    );
    this.name = "CompanyAiUnavailableError";
    this.code = code;
  }
}

export class CompanyAiQuotaExceededError extends Error {
  readonly code: string;
  readonly status = 429;

  constructor(code = "AI_COMPANY_QUOTA_EXCEEDED", message?: string) {
    super(
      message ||
        "Doanh nghiệp đã dùng hết định mức AI trong ngày hoặc trong tháng. Vui lòng thử lại sau hoặc nâng cấp gói thành viên."
    );
    this.name = "CompanyAiQuotaExceededError";
    this.code = code;
  }
}

export class CompanyAiPermissionError extends Error {
  readonly code = "COMPANY_AI_FORBIDDEN";
  readonly status = 403;

  constructor(message?: string) {
    super(
      message ||
        "Tài khoản của bạn không có quyền sử dụng tính năng AI trong phạm vi Doanh nghiệp này (Yêu cầu vai trò OWNER, ADMIN, HR_MANAGER hoặc RECRUITER)."
    );
    this.name = "CompanyAiPermissionError";
  }
}

/* =========================================================================
 * Internal Error Translator
 * ========================================================================= */

function translateAiError(err: unknown, endpoint: string): never {
  const anyErr = err as {
    response?: {
      status?: number;
      data?: { code?: string; message?: string };
    };
    message?: string;
  };

  const status = anyErr?.response?.status;
  const code = anyErr?.response?.data?.code;
  const msg = extractApiErrorMessage(err);

  if (status === 404) {
    throw new CompanyAiNotImplementedError(endpoint);
  }
  if (status === 403) {
    throw new CompanyAiPermissionError(msg);
  }
  if (status === 429 || code === "AI_DAILY_BUDGET_EXCEEDED" || code === "AI_COMPANY_QUOTA_EXCEEDED") {
    throw new CompanyAiQuotaExceededError(code, msg);
  }
  if (
    status === 503 ||
    code === "AI_PROVIDER_NOT_CONFIGURED" ||
    code === "AI_PROVIDER_UNAVAILABLE" ||
    code === "AI_PROVIDER_AUTH_INVALID"
  ) {
    throw new CompanyAiUnavailableError(code, msg);
  }

  throw new Error(msg || `Lỗi thao tác AI Doanh nghiệp (${endpoint})`);
}

/* =========================================================================
 * Real Backend API Callers
 * ========================================================================= */

export const employerAiApi = {
  /**
   * Tạo bản thảo mô tả công việc (JD) dựa trên dữ liệu đầu vào có cấu trúc
   */
  draftJob: async (
    companyId: string,
    payload: DraftJobRequest,
    signal?: AbortSignal
  ): Promise<DraftJobResponse> => {
    const endpoint = `/companies/${encodeURIComponent(companyId)}/ai/draft-job`;
    try {
      const res = await apiClient.post<DraftJobResponse>(endpoint, payload, { signal });
      return res.data;
    } catch (err) {
      return translateAiError(err, endpoint);
    }
  },

  /**
   * Rà soát, tối ưu hóa và phát hiện thiếu sót/định kiến trong JD
   */
  improveJob: async (
    companyId: string,
    payload: ImproveJobRequest,
    signal?: AbortSignal
  ): Promise<ImproveJobResponse> => {
    const endpoint = `/companies/${encodeURIComponent(companyId)}/ai/improve-job`;
    try {
      const res = await apiClient.post<ImproveJobResponse>(endpoint, payload, { signal });
      return res.data;
    } catch (err) {
      return translateAiError(err, endpoint);
    }
  },

  /**
   * Gợi ý câu hỏi sàng lọc hồ sơ ứng viên theo tiêu chí tin tuyển dụng
   */
  suggestScreeningQuestions: async (
    companyId: string,
    payload: ScreeningQuestionsRequest,
    signal?: AbortSignal
  ): Promise<ScreeningQuestionsResponse> => {
    const endpoint = `/companies/${encodeURIComponent(companyId)}/ai/screening-questions`;
    try {
      const res = await apiClient.post<ScreeningQuestionsResponse>(endpoint, payload, { signal });
      return res.data;
    } catch (err) {
      return translateAiError(err, endpoint);
    }
  },

  /**
   * Tạo bộ câu hỏi phỏng vấn theo khung năng lực & phương pháp STAR
   */
  generateInterviewQuestions: async (
    companyId: string,
    payload: InterviewQuestionsRequest,
    signal?: AbortSignal
  ): Promise<InterviewQuestionsResponse> => {
    const endpoint = `/companies/${encodeURIComponent(companyId)}/ai/interview-questions`;
    try {
      const res = await apiClient.post<InterviewQuestionsResponse>(endpoint, payload, { signal });
      return res.data;
    } catch (err) {
      return translateAiError(err, endpoint);
    }
  },

  /**
   * Tạo lộ trình kế hoạch tuyển dụng & gợi ý kênh phân phối nhân tài
   */
  generateRecruitmentPlan: async (
    companyId: string,
    payload: RecruitmentPlanRequest,
    signal?: AbortSignal
  ): Promise<RecruitmentPlanResponse> => {
    const endpoint = `/companies/${encodeURIComponent(companyId)}/ai/recruitment-plan`;
    try {
      const res = await apiClient.post<RecruitmentPlanResponse>(endpoint, payload, { signal });
      return res.data;
    } catch (err) {
      return translateAiError(err, endpoint);
    }
  },

  /**
   * Kiểm tra hạn mức sử dụng AI còn lại của doanh nghiệp
   */
  getQuota: async (companyId: string, signal?: AbortSignal): Promise<CompanyAiQuotaDto> => {
    const endpoint = `/companies/${encodeURIComponent(companyId)}/ai/quota`;
    try {
      const res = await apiClient.get<CompanyAiQuotaDto>(endpoint, { signal });
      return res.data;
    } catch (err) {
      return translateAiError(err, endpoint);
    }
  },

  /**
   * Kiểm tra trạng thái sẵn sàng của dịch vụ AI doanh nghiệp
   */
  checkStatus: async (companyId: string, signal?: AbortSignal): Promise<CompanyAiStatusResponse> => {
    const endpoint = `/companies/${encodeURIComponent(companyId)}/ai/status`;
    try {
      const res = await apiClient.get<CompanyAiStatusResponse>(endpoint, { signal });
      return res.data;
    } catch (err) {
      return translateAiError(err, endpoint);
    }
  },
};
