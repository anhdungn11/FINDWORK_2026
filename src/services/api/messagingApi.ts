import { apiClient } from "../http/apiClient";
import { toApiFailure } from "./apiFailure";
import { type Paged } from "./apiTypes";

export interface ApplicationMessageDto {
  id: string;
  senderRole: "CANDIDATE" | "COMPANY";
  body: string;
  createdAt: string;
  candidateReadAt: string | null;
  companyReadAt: string | null;
}

export interface ConversationSummaryDto {
  applicationId: string;
  companyId: string;
  jobId: string;
  applicationStatus: string;
  companyName: string;
  jobTitle: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ConversationMessagesResponse {
  data: ApplicationMessageDto[];
  unreadCount: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const messagingApi = {
  // CANDIDATE
  listCandidateConversations: async (
    params: { page?: number; pageSize?: number } = {},
    signal?: AbortSignal
  ): Promise<Paged<ConversationSummaryDto>> => {
    try {
      const res = await apiClient.get<Paged<ConversationSummaryDto>>("/candidate/conversations", {
        params,
        signal,
      });
      return res.data;
    } catch (err) {
      throw toApiFailure(err);
    }
  },

  getCandidateMessages: async (
    applicationId: string,
    params: { page?: number; pageSize?: number } = {},
    signal?: AbortSignal
  ): Promise<ConversationMessagesResponse> => {
    try {
      const res = await apiClient.get<ConversationMessagesResponse>(
        `/candidate/conversations/${encodeURIComponent(applicationId)}/messages`,
        { params, signal }
      );
      return res.data;
    } catch (err) {
      throw toApiFailure(err);
    }
  },

  sendCandidateMessage: async (
    applicationId: string,
    body: string
  ): Promise<ApplicationMessageDto> => {
    try {
      const res = await apiClient.post<ApplicationMessageDto>(
        `/candidate/conversations/${encodeURIComponent(applicationId)}/messages`,
        { body: body.trim() }
      );
      return res.data;
    } catch (err) {
      throw toApiFailure(err);
    }
  },

  markCandidateRead: async (applicationId: string): Promise<{ readCount: number }> => {
    try {
      const res = await apiClient.post<{ readCount: number }>(
        `/candidate/conversations/${encodeURIComponent(applicationId)}/read`
      );
      return res.data;
    } catch (err) {
      throw toApiFailure(err);
    }
  },

  // COMPANY
  listCompanyConversations: async (
    companyId: string,
    params: { page?: number; pageSize?: number } = {},
    signal?: AbortSignal
  ): Promise<Paged<ConversationSummaryDto>> => {
    try {
      const res = await apiClient.get<Paged<ConversationSummaryDto>>(
        `/companies/${encodeURIComponent(companyId)}/conversations`,
        { params, signal }
      );
      return res.data;
    } catch (err) {
      throw toApiFailure(err);
    }
  },

  getCompanyMessages: async (
    companyId: string,
    applicationId: string,
    params: { page?: number; pageSize?: number } = {},
    signal?: AbortSignal
  ): Promise<ConversationMessagesResponse> => {
    try {
      const res = await apiClient.get<ConversationMessagesResponse>(
        `/companies/${encodeURIComponent(companyId)}/conversations/${encodeURIComponent(applicationId)}/messages`,
        { params, signal }
      );
      return res.data;
    } catch (err) {
      throw toApiFailure(err);
    }
  },

  sendCompanyMessage: async (
    companyId: string,
    applicationId: string,
    body: string
  ): Promise<ApplicationMessageDto> => {
    try {
      const res = await apiClient.post<ApplicationMessageDto>(
        `/companies/${encodeURIComponent(companyId)}/conversations/${encodeURIComponent(applicationId)}/messages`,
        { body: body.trim() }
      );
      return res.data;
    } catch (err) {
      throw toApiFailure(err);
    }
  },

  markCompanyRead: async (companyId: string, applicationId: string): Promise<{ readCount: number }> => {
    try {
      const res = await apiClient.post<{ readCount: number }>(
        `/companies/${encodeURIComponent(companyId)}/conversations/${encodeURIComponent(applicationId)}/read`
      );
      return res.data;
    } catch (err) {
      throw toApiFailure(err);
    }
  },
};
