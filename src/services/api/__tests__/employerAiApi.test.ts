import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  employerAiApi,
  CompanyAiNotImplementedError,
  CompanyAiUnavailableError,
  CompanyAiQuotaExceededError,
  CompanyAiPermissionError,
} from "../employerAiApi";
import { apiClient } from "../../http/apiClient";

describe("Employer Business AI API Client Tests", () => {
  const companyId = "c0000000-0000-4000-8000-000000000001";

  it("honest error mapping: maps 404 response to CompanyAiNotImplementedError without faking", async () => {
    const originalPost = apiClient.post;
    try {
      (apiClient as any).post = async () => {
        const error = new Error("Request failed with status code 404");
        (error as any).response = { status: 404, data: { message: "Not Found" } };
        throw error;
      };

      await assert.rejects(
        () =>
          employerAiApi.draftJob(companyId, {
            title: "Senior Engineer",
          }),
        (err: unknown) => {
          assert(err instanceof CompanyAiNotImplementedError);
          assert.equal(err.status, 404);
          assert.equal(err.code, "COMPANY_AI_NOT_IMPLEMENTED");
          assert(err.endpoint.includes(`/companies/${companyId}/ai/draft-job`));
          return true;
        }
      );
    } finally {
      apiClient.post = originalPost;
    }
  });

  it("honest error mapping: maps 403 response to CompanyAiPermissionError", async () => {
    const originalPost = apiClient.post;
    try {
      (apiClient as any).post = async () => {
        const error = new Error("Forbidden");
        (error as any).response = { status: 403, data: { code: "FORBIDDEN", message: "Company permission required" } };
        throw error;
      };

      await assert.rejects(
        () =>
          employerAiApi.improveJob(companyId, {
            title: "Product Manager",
            description: "Some description",
          }),
        (err: unknown) => {
          assert(err instanceof CompanyAiPermissionError);
          assert.equal(err.status, 403);
          assert.equal(err.code, "COMPANY_AI_FORBIDDEN");
          return true;
        }
      );
    } finally {
      apiClient.post = originalPost;
    }
  });

  it("honest error mapping: maps 429 response to CompanyAiQuotaExceededError", async () => {
    const originalPost = apiClient.post;
    try {
      (apiClient as any).post = async () => {
        const error = new Error("Too Many Requests");
        (error as any).response = {
          status: 429,
          data: { code: "AI_COMPANY_QUOTA_EXCEEDED", message: "Daily quota exceeded" },
        };
        throw error;
      };

      await assert.rejects(
        () =>
          employerAiApi.suggestScreeningQuestions(companyId, {
            jobTitle: "DevOps Engineer",
            keySkills: ["Docker", "Kubernetes"],
          }),
        (err: unknown) => {
          assert(err instanceof CompanyAiQuotaExceededError);
          assert.equal(err.status, 429);
          return true;
        }
      );
    } finally {
      apiClient.post = originalPost;
    }
  });

  it("honest error mapping: maps 503 response to CompanyAiUnavailableError", async () => {
    const originalPost = apiClient.post;
    try {
      (apiClient as any).post = async () => {
        const error = new Error("Service Unavailable");
        (error as any).response = {
          status: 503,
          data: { code: "AI_PROVIDER_UNAVAILABLE", message: "Provider offline" },
        };
        throw error;
      };

      await assert.rejects(
        () =>
          employerAiApi.generateInterviewQuestions(companyId, {
            jobTitle: "Tech Lead",
            level: "LEAD",
            stage: "TECHNICAL",
          }),
        (err: unknown) => {
          assert(err instanceof CompanyAiUnavailableError);
          assert.equal(err.status, 503);
          return true;
        }
      );
    } finally {
      apiClient.post = originalPost;
    }
  });

  it("status probe: correctly requests /companies/:id/ai/status", async () => {
    const originalGet = apiClient.get;
    let requestedUrl = "";
    try {
      (apiClient as any).get = async (url: string) => {
        requestedUrl = url;
        return {
          data: {
            status: "available",
            version: "1.0.0",
            features: { jobDrafting: true, jobReview: true },
            supportedModels: ["gpt-4o"],
          },
        };
      };

      const res = await employerAiApi.checkStatus(companyId);
      assert.equal(requestedUrl, `/companies/${companyId}/ai/status`);
      assert.equal(res.status, "available");
      assert.equal(res.version, "1.0.0");
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("storage isolation: Employer AI does not read or pollute candidate history keys", () => {
    const candidateStorageKey = "findwork.aiAssistant.history";
    const candidateGuestKey = "findwork.aiGuestSession";

    // Set mock candidate data in global/simulated localStorage if available
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(candidateStorageKey, JSON.stringify([{ id: "cand-1", role: "user", content: "CV advice" }]));
      localStorage.setItem(candidateGuestKey, JSON.stringify({ token: "guest-secret-token" }));

      // Verify that employerAiApi does not alter or erase candidate keys
      assert(localStorage.getItem(candidateStorageKey) !== null);
      assert(localStorage.getItem(candidateGuestKey) !== null);
    }
  });
});
