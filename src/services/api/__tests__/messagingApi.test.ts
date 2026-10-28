import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { messagingApi } from "../messagingApi";
import { apiClient } from "../../http/apiClient";

describe("P1 Candidate <-> Employer Messaging API Client", () => {
  let interceptedUrl = "";
  let interceptedData: any = null;
  let interceptedParams: any = null;

  beforeEach(() => {
    interceptedUrl = "";
    interceptedData = null;
    interceptedParams = null;
  });

  it("listCandidateConversations sends GET /candidate/conversations with query params", async () => {
    const originalGet = apiClient.get;
    apiClient.get = (async (url: string, config?: any) => {
      interceptedUrl = url;
      interceptedParams = config?.params;
      return {
        data: {
          data: [
            {
              applicationId: "app-123",
              companyId: "comp-456",
              jobId: "job-789",
              applicationStatus: "REVIEWING",
              companyName: "Acme Corp",
              jobTitle: "Senior Engineer",
              lastMessageAt: "2026-10-26T07:00:00Z",
              unreadCount: 2,
            },
          ],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      };
    }) as any;

    try {
      const res = await messagingApi.listCandidateConversations({ page: 2, pageSize: 10 });
      assert.equal(interceptedUrl, "/candidate/conversations");
      assert.deepEqual(interceptedParams, { page: 2, pageSize: 10 });
      assert.equal(res.data.length, 1);
      assert.equal(res.data[0].unreadCount, 2);
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("getCandidateMessages sends GET /candidate/conversations/:applicationId/messages", async () => {
    const originalGet = apiClient.get;
    apiClient.get = (async (url: string) => {
      interceptedUrl = url;
      return {
        data: {
          data: [
            {
              id: "msg-1",
              senderRole: "COMPANY",
              body: "Hello candidate",
              createdAt: "2026-10-26T07:10:00Z",
              candidateReadAt: null,
              companyReadAt: "2026-10-26T07:10:00Z",
            },
          ],
          unreadCount: 1,
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      };
    }) as any;

    try {
      const res = await messagingApi.getCandidateMessages("app-uuid-1");
      assert.equal(interceptedUrl, "/candidate/conversations/app-uuid-1/messages");
      assert.equal(res.data[0].body, "Hello candidate");
      assert.equal(res.unreadCount, 1);
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("sendCandidateMessage sends POST /candidate/conversations/:applicationId/messages with trimmed body", async () => {
    const originalPost = apiClient.post;
    apiClient.post = (async (url: string, data: any) => {
      interceptedUrl = url;
      interceptedData = data;
      return {
        data: {
          id: "msg-2",
          senderRole: "CANDIDATE",
          body: data.body,
          createdAt: "2026-10-26T07:15:00Z",
          candidateReadAt: "2026-10-26T07:15:00Z",
          companyReadAt: null,
        },
      };
    }) as any;

    try {
      const res = await messagingApi.sendCandidateMessage("app-uuid-1", "  Thank you for reaching out  ");
      assert.equal(interceptedUrl, "/candidate/conversations/app-uuid-1/messages");
      assert.deepEqual(interceptedData, { body: "Thank you for reaching out" });
      assert.equal(res.senderRole, "CANDIDATE");
    } finally {
      apiClient.post = originalPost;
    }
  });

  it("sendCompanyMessage sends POST /companies/:companyId/conversations/:applicationId/messages", async () => {
    const originalPost = apiClient.post;
    apiClient.post = (async (url: string, data: any) => {
      interceptedUrl = url;
      interceptedData = data;
      return {
        data: {
          id: "msg-3",
          senderRole: "COMPANY",
          body: data.body,
          createdAt: "2026-10-26T07:20:00Z",
          candidateReadAt: null,
          companyReadAt: "2026-10-26T07:20:00Z",
        },
      };
    }) as any;

    try {
      const res = await messagingApi.sendCompanyMessage("comp-1", "app-1", "We'd like to schedule an interview");
      assert.equal(interceptedUrl, "/companies/comp-1/conversations/app-1/messages");
      assert.deepEqual(interceptedData, { body: "We'd like to schedule an interview" });
      assert.equal(res.senderRole, "COMPANY");
    } finally {
      apiClient.post = originalPost;
    }
  });

  it("markCompanyRead sends POST /companies/:companyId/conversations/:applicationId/read", async () => {
    const originalPost = apiClient.post;
    apiClient.post = (async (url: string) => {
      interceptedUrl = url;
      return { data: { readCount: 3 } };
    }) as any;

    try {
      const res = await messagingApi.markCompanyRead("comp-1", "app-1");
      assert.equal(interceptedUrl, "/companies/comp-1/conversations/app-1/read");
      assert.equal(res.readCount, 3);
    } finally {
      apiClient.post = originalPost;
    }
  });
});
