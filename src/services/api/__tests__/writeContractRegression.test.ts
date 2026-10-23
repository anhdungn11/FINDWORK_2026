import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { apiClient } from "../../http/apiClient";
import { adminApi } from "../adminApi";
import { companyWorkspaceApi } from "../companyWorkspaceApi";
import { isWorkspaceWritesEnabled, setWorkspaceWritesForTesting } from "../../../config/featureFlags";
import {
  isLiveWritesEnabled,
  setLiveWritesEnabledForTesting,
  assertLiveWritesAllowed,
  CandidateWriteGateBlockedError,
} from "../../../features/candidate/profile/config/candidateIntegrationConfig";

describe("P0-01 Backend API Contract & HTTP Method Regression", () => {
  const companyId = "c1111111-1111-4111-8111-111111111111";
  const userId = "u2222222-2222-4222-8222-222222222222";
  const jobId = "j3333333-3333-4333-8333-333333333333";
  const memberId = "m4444444-4444-4444-8444-444444444444";
  const invitationId = "i5555555-5555-4555-8555-555555555555";
  const applicationId = "a6666666-6666-4666-8666-666666666666";
  describe("Admin API write routes and methods", () => {
    it("adminApi.verifyCompany sends PATCH /admin/companies/:id/verification with status", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPatch = apiClient.patch;
      let recordedUrl = "";
      let recordedBody: unknown = null;

      try {
        apiClient.patch = (async (url: string, body: unknown) => {
          recordedUrl = url;
          recordedBody = body;
          return { data: { id: companyId, name: "Test Corp", verificationStatus: "VERIFIED" } };
        }) as never;

        const res = await adminApi.verifyCompany(companyId, "VERIFIED");
        assert.equal(recordedUrl, `/admin/companies/${companyId}/verification`);
        assert.deepEqual(recordedBody, { status: "VERIFIED" });
        assert.equal(res.verificationStatus, "VERIFIED");
      } finally {
        apiClient.patch = originalPatch;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("adminApi.setUserStatus sends PATCH /admin/users/:userId/status with status", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPatch = apiClient.patch;
      let recordedUrl = "";
      let recordedBody: unknown = null;

      try {
        apiClient.patch = (async (url: string, body: unknown) => {
          recordedUrl = url;
          recordedBody = body;
          return { data: { id: userId, email: "user@test.vn", status: "SUSPENDED" } };
        }) as never;

        const res = await adminApi.setUserStatus(userId, "SUSPENDED");
        assert.equal(recordedUrl, `/admin/users/${userId}/status`);
        assert.deepEqual(recordedBody, { status: "SUSPENDED" });
        assert.equal(res.status, "SUSPENDED");
      } finally {
        apiClient.patch = originalPatch;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("adminApi.disableUser sends POST /admin/users/:userId/disable", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPost = apiClient.post;
      let recordedUrl = "";

      try {
        apiClient.post = (async (url: string) => {
          recordedUrl = url;
          return { data: { id: userId, status: "DISABLED" } };
        }) as never;

        await adminApi.disableUser(userId);
        assert.equal(recordedUrl, `/admin/users/${userId}/disable`);
      } finally {
        apiClient.post = originalPost;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("adminApi.setCompanyStatus sends PATCH /admin/companies/:companyId/status with status", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPatch = apiClient.patch;
      let recordedUrl = "";
      let recordedBody: unknown = null;

      try {
        apiClient.patch = (async (url: string, body: unknown) => {
          recordedUrl = url;
          recordedBody = body;
          return { data: { id: companyId, name: "Test Corp", status: "SUSPENDED" } };
        }) as never;

        const res = await adminApi.setCompanyStatus(companyId, "SUSPENDED");
        assert.equal(recordedUrl, `/admin/companies/${companyId}/status`);
        assert.deepEqual(recordedBody, { status: "SUSPENDED" });
        assert.equal(res.status, "SUSPENDED");
      } finally {
        apiClient.patch = originalPatch;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("adminApi.closeJob sends POST /admin/jobs/:jobId/close", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPost = apiClient.post;
      let recordedUrl = "";

      try {
        apiClient.post = (async (url: string) => {
          recordedUrl = url;
          return { data: { id: jobId, title: "Violating Job", status: "CLOSED" } };
        }) as never;

        const res = await adminApi.closeJob(jobId);
        assert.equal(recordedUrl, `/admin/jobs/${jobId}/close`);
        assert.equal(res.status, "CLOSED");
      } finally {
        apiClient.post = originalPost;
        setWorkspaceWritesForTesting(null);
      }
    });
  });

  describe("Company Workspace API write routes and methods", () => {
    it("companyWorkspaceApi.createCompany sends POST /companies with name and slug", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPost = apiClient.post;
      let recordedUrl = "";
      let recordedBody: unknown = null;

      try {
        apiClient.post = (async (url: string, body: unknown) => {
          recordedUrl = url;
          recordedBody = body;
          return {
            data: {
              data: {
                id: companyId,
                name: "Tập Đoàn Mới",
                slug: "tap-doan-moi",
                status: "ACTIVE",
                verificationStatus: "UNVERIFIED",
              },
            },
          };
        }) as never;

        const res = await companyWorkspaceApi.createCompany({
          name: "Tập Đoàn Mới",
          slug: "tap-doan-moi",
        });
        assert.equal(recordedUrl, "/companies");
        assert.deepEqual(recordedBody, { name: "Tập Đoàn Mới", slug: "tap-doan-moi" });
        assert.equal(res.name, "Tập Đoàn Mới");
        assert.equal(res.slug, "tap-doan-moi");
      } finally {
        apiClient.post = originalPost;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("companyWorkspaceApi.updateProfile sends PATCH /companies/:id/profile with profile fields", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPatch = apiClient.patch;
      let recordedUrl = "";
      let recordedBody: unknown = null;

      try {
        apiClient.patch = (async (url: string, body: unknown) => {
          recordedUrl = url;
          recordedBody = body;
          return {
            data: {
              data: {
                id: companyId,
                legalName: "Công ty Cổ phần Công nghệ ABC",
                taxCode: "0123456789",
                description: "Mô tả doanh nghiệp",
              },
            },
          };
        }) as never;

        const res = await companyWorkspaceApi.updateProfile(companyId, {
          legalName: "Công ty Cổ phần Công nghệ ABC",
          taxCode: "0123456789",
          description: "Mô tả doanh nghiệp",
        });
        assert.equal(recordedUrl, `/companies/${companyId}/profile`);
        assert.deepEqual(recordedBody, {
          legalName: "Công ty Cổ phần Công nghệ ABC",
          taxCode: "0123456789",
          description: "Mô tả doanh nghiệp",
        });
        assert.equal(res.legalName, "Công ty Cổ phần Công nghệ ABC");
        assert.equal(res.taxCode, "0123456789");
      } finally {
        apiClient.patch = originalPatch;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("companyWorkspaceApi.requestVerification sends POST /companies/:id/verification-request", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPost = apiClient.post;
      let recordedUrl = "";

      try {
        apiClient.post = (async (url: string) => {
          recordedUrl = url;
          return { data: { success: true } };
        }) as never;

        await companyWorkspaceApi.requestVerification(companyId);
        assert.equal(recordedUrl, `/companies/${companyId}/verification-request`);
      } finally {
        apiClient.post = originalPost;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("companyWorkspaceApi.updateMemberRole sends PATCH /companies/:id/members/:memberId/role", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPatch = apiClient.patch;
      let recordedUrl = "";
      let recordedBody: unknown = null;

      try {
        apiClient.patch = (async (url: string, body: unknown) => {
          recordedUrl = url;
          recordedBody = body;
          return {
            data: {
              data: {
                id: memberId,
                companyId,
                status: "ACTIVE",
                roles: [{ role: { id: "r-hr", name: "HR_MANAGER" } }],
              },
            },
          };
        }) as never;

        const res = await companyWorkspaceApi.updateMemberRole(companyId, memberId, "HR_MANAGER");
        assert.equal(recordedUrl, `/companies/${companyId}/members/${memberId}/role`);
        assert.deepEqual(recordedBody, { role: "HR_MANAGER" });
        assert.equal(res.roles[0].role.name, "HR_MANAGER");
      } finally {
        apiClient.patch = originalPatch;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("companyWorkspaceApi.removeMember sends DELETE /companies/:id/members/:memberId", async () => {
      setWorkspaceWritesForTesting(true);
      const originalDelete = apiClient.delete;
      let recordedUrl = "";

      try {
        apiClient.delete = (async (url: string) => {
          recordedUrl = url;
          return { data: { data: { id: memberId, status: "REMOVED" } } };
        }) as never;

        const res = await companyWorkspaceApi.removeMember(companyId, memberId);
        assert.equal(recordedUrl, `/companies/${companyId}/members/${memberId}`);
        assert.equal(res.status, "REMOVED");
      } finally {
        apiClient.delete = originalDelete;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("companyWorkspaceApi.transferOwnership sends POST /companies/:id/members/ownership-transfer", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPost = apiClient.post;
      let recordedUrl = "";
      let recordedBody: unknown = null;

      try {
        apiClient.post = (async (url: string, body: unknown) => {
          recordedUrl = url;
          recordedBody = body;
          return {
            data: {
              data: {
                companyId,
                previousOwnerMemberId: "prev-owner",
                ownerMemberId: memberId,
              },
            },
          };
        }) as never;

        const res = await companyWorkspaceApi.transferOwnership(companyId, memberId);
        assert.equal(recordedUrl, `/companies/${companyId}/members/ownership-transfer`);
        assert.deepEqual(recordedBody, { memberId });
        assert.equal(res.ownerMemberId, memberId);
      } finally {
        apiClient.post = originalPost;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("companyWorkspaceApi.createInvitation sends POST /companies/:id/invitations", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPost = apiClient.post;
      let recordedUrl = "";
      let recordedBody: unknown = null;

      try {
        apiClient.post = (async (url: string, body: unknown) => {
          recordedUrl = url;
          recordedBody = body;
          return {
            data: {
              data: {
                id: invitationId,
                companyId,
                emailNormalized: "colleague@test.vn",
                status: "PENDING",
              },
            },
          };
        }) as never;

        const res = await companyWorkspaceApi.createInvitation(companyId, "colleague@test.vn");
        assert.equal(recordedUrl, `/companies/${companyId}/invitations`);
        assert.deepEqual(recordedBody, { email: "colleague@test.vn" });
        assert.equal(res.emailNormalized, "colleague@test.vn");
      } finally {
        apiClient.post = originalPost;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("companyWorkspaceApi.revokeInvitation sends POST /companies/:id/invitations/:id/revoke", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPost = apiClient.post;
      let recordedUrl = "";

      try {
        apiClient.post = (async (url: string) => {
          recordedUrl = url;
          return { data: { success: true } };
        }) as never;

        await companyWorkspaceApi.revokeInvitation(companyId, invitationId);
        assert.equal(recordedUrl, `/companies/${companyId}/invitations/${invitationId}/revoke`);
      } finally {
        apiClient.post = originalPost;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("companyWorkspaceApi.transitionJob sends POST /companies/:id/jobs/:jobId/(publish|pause|close) with version", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPost = apiClient.post;
      const history: Array<{ url: string; body: unknown }> = [];

      try {
        apiClient.post = (async (url: string, body: unknown) => {
          history.push({ url, body });
          return { data: { data: { id: jobId, status: "PUBLISHED", version: 2 } } };
        }) as never;

        // 1. Publish (draft -> published or paused -> published)
        await companyWorkspaceApi.transitionJob(companyId, jobId, 1, "publish");
        assert.equal(history[0].url, `/companies/${companyId}/jobs/${jobId}/publish`);
        assert.deepEqual(history[0].body, { version: 1 });

        // 2. Pause
        await companyWorkspaceApi.transitionJob(companyId, jobId, 2, "pause");
        assert.equal(history[1].url, `/companies/${companyId}/jobs/${jobId}/pause`);
        assert.deepEqual(history[1].body, { version: 2 });

        // 3. Close
        await companyWorkspaceApi.transitionJob(companyId, jobId, 3, "close");
        assert.equal(history[2].url, `/companies/${companyId}/jobs/${jobId}/close`);
        assert.deepEqual(history[2].body, { version: 3 });
      } finally {
        apiClient.post = originalPost;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("companyWorkspaceApi.reviewApplication sends PATCH /companies/:id/jobs/:jobId/applications/:appId/status with version and status", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPatch = apiClient.patch;
      let recordedUrl = "";
      let recordedBody: unknown = null;

      try {
        apiClient.patch = (async (url: string, body: unknown) => {
          recordedUrl = url;
          recordedBody = body;
          return {
            data: {
              data: {
                id: applicationId,
                jobId,
                status: "SHORTLISTED",
                version: 2,
              },
            },
          };
        }) as never;

        const res = await companyWorkspaceApi.reviewApplication(
          companyId,
          jobId,
          applicationId,
          1,
          "SHORTLISTED",
        );
        assert.equal(
          recordedUrl,
          `/companies/${companyId}/jobs/${jobId}/applications/${applicationId}/status`,
        );
        assert.deepEqual(recordedBody, { version: 1, status: "SHORTLISTED" });
        assert.equal(res.status, "SHORTLISTED");
      } finally {
        apiClient.patch = originalPatch;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("companyWorkspaceApi.replaceScreeningQuestions sends PUT /companies/:id/jobs/:jobId/screening-questions", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPut = apiClient.put;
      let recordedUrl = "";
      let recordedBody: unknown = null;

      try {
        apiClient.put = (async (url: string, body: unknown) => {
          recordedUrl = url;
          recordedBody = body;
          return {
            data: {
              data: {
                jobId,
                version: 2,
                questions: [
                  { id: "sq-1", type: "TEXT", label: "Kinh nghiệm của bạn?", isRequired: true, displayOrder: 0, options: [] },
                ],
              },
            },
          };
        }) as never;

        const questions = [
          { type: "TEXT" as const, label: "Kinh nghiệm của bạn?", isRequired: true, displayOrder: 0 },
        ];
        const res = await companyWorkspaceApi.replaceScreeningQuestions(companyId, jobId, 1, questions);
        assert.equal(recordedUrl, `/companies/${companyId}/jobs/${jobId}/screening-questions`);
        assert.deepEqual(recordedBody, { version: 1, questions });
        assert.equal(res.questions.length, 1);
        assert.equal(res.questions[0].label, "Kinh nghiệm của bạn?");
      } finally {
        apiClient.put = originalPut;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("companyWorkspaceApi.getMediaUrl constructs correct URLs with optional cache busting", () => {
      const logoUrl = companyWorkspaceApi.getMediaUrl(companyId, "logo");
      assert.ok(logoUrl.includes(`/companies/${companyId}/media/logo`));

      const coverUrlWithBust = companyWorkspaceApi.getMediaUrl(companyId, "cover", 123456789);
      assert.ok(coverUrlWithBust.includes(`/companies/${companyId}/media/cover?t=123456789`));
    });

    it("companyWorkspaceApi.uploadMedia sends PUT /companies/:id/media/:kind with FormData", async () => {
      setWorkspaceWritesForTesting(true);
      const originalPut = apiClient.put;
      let recordedUrl = "";
      let recordedConfig: unknown = null;

      try {
        apiClient.put = (async (url: string, _body: unknown, config: unknown) => {
          recordedUrl = url;
          recordedConfig = config;
          return { data: { kind: "logo", available: true } };
        }) as never;

        const fakeFile = new Blob(["fake-image-content"], { type: "image/png" }) as File;
        const res = await companyWorkspaceApi.uploadMedia(companyId, "logo", fakeFile);

        assert.equal(recordedUrl, `/companies/${companyId}/media/logo`);
        assert.equal(res.kind, "logo");
        assert.equal(res.available, true);
        assert.ok((recordedConfig as { headers?: Record<string, string> })?.headers?.["Content-Type"]?.includes("multipart/form-data"));
      } finally {
        apiClient.put = originalPut;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("companyWorkspaceApi.deleteMedia sends DELETE /companies/:id/media/:kind", async () => {
      setWorkspaceWritesForTesting(true);
      const originalDelete = apiClient.delete;
      let recordedUrl = "";

      try {
        apiClient.delete = (async (url: string) => {
          recordedUrl = url;
          return { data: { kind: "cover", available: false } };
        }) as never;

        const res = await companyWorkspaceApi.deleteMedia(companyId, "cover");
        assert.equal(recordedUrl, `/companies/${companyId}/media/cover`);
        assert.equal(res.kind, "cover");
        assert.equal(res.available, false);
      } finally {
        apiClient.delete = originalDelete;
        setWorkspaceWritesForTesting(null);
      }
    });
  });

  describe("P0-04 Write Safety Gate Fail-Closed Verification", () => {
    it("blocks company writes when workspace writes are disabled", async () => {
      setWorkspaceWritesForTesting(false);
      let callMade = false;
      const originalPost = apiClient.post;
      apiClient.post = (async () => {
        callMade = true;
        return { data: {} };
      }) as never;

      try {
        await assert.rejects(
          async () => {
            await companyWorkspaceApi.createCompany({ name: "Blocked", slug: "blocked" });
          },
          (err: any) => {
            assert.equal(err.kind, "write_blocked");
            assert.equal(err.status, 403);
            assert.match(err.message, /thao tác ghi dữ liệu đang tắt/i);
            return true;
          },
        );
        assert.equal(callMade, false, "apiClient.post MUST NOT be called when write gate is closed");
      } finally {
        apiClient.post = originalPost;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("blocks admin writes when workspace writes are disabled", async () => {
      setWorkspaceWritesForTesting(false);
      let callMade = false;
      const originalPatch = apiClient.patch;
      apiClient.patch = (async () => {
        callMade = true;
        return { data: {} };
      }) as never;

      try {
        await assert.rejects(
          async () => {
            await adminApi.verifyCompany(companyId, "VERIFIED");
          },
          (err: any) => {
            assert.equal(err.kind, "write_blocked");
            assert.equal(err.status, 403);
            assert.match(err.message, /thao tác ghi dữ liệu đang tắt/i);
            return true;
          },
        );
        assert.equal(callMade, false, "apiClient.patch MUST NOT be called when write gate is closed");
      } finally {
        apiClient.patch = originalPatch;
        setWorkspaceWritesForTesting(null);
      }
    });

    it("blocks media uploads and deletions when workspace writes are disabled", async () => {
      setWorkspaceWritesForTesting(false);
      const fakeFile = new Blob(["test"], { type: "image/png" }) as File;

      await assert.rejects(
        async () => {
          await companyWorkspaceApi.uploadMedia("comp-1", "logo", fakeFile);
        },
        (err: any) => {
          assert.equal(err.kind, "write_blocked");
          assert.equal(err.status, 403);
          return true;
        },
      );

      await assert.rejects(
        async () => {
          await companyWorkspaceApi.deleteMedia("comp-1", "cover");
        },
        (err: any) => {
          assert.equal(err.kind, "write_blocked");
          assert.equal(err.status, 403);
          return true;
        },
      );
      setWorkspaceWritesForTesting(null);
    });

    it("defaults both write gates to CLOSED (false)", () => {
      setWorkspaceWritesForTesting(null);
      setLiveWritesEnabledForTesting(null);

      // In default test/node environment without explicit opt-in, both gates must be closed
      assert.equal(isWorkspaceWritesEnabled(), false, "isWorkspaceWritesEnabled must default to false");
      assert.equal(isLiveWritesEnabled(), false, "isLiveWritesEnabled must default to false");
    });

    it("Candidate write gate blocks mutations and throws CandidateWriteGateBlockedError when closed", () => {
      setLiveWritesEnabledForTesting(false);
      assert.equal(isLiveWritesEnabled(), false);

      assert.throws(
        () => assertLiveWritesAllowed("submitApplication"),
        (err: unknown) => {
          assert.ok(err instanceof CandidateWriteGateBlockedError);
          assert.equal(err.operation, "submitApplication");
          assert.equal(err.code, "WRITE_GATE_BLOCKED");
          assert.equal(err.status, 403);
          return true;
        },
      );

      setLiveWritesEnabledForTesting(null);
    });

    it("Candidate write gate allows mutations when explicitly enabled for testing", () => {
      setLiveWritesEnabledForTesting(true);
      assert.equal(isLiveWritesEnabled(), true);
      assert.doesNotThrow(() => assertLiveWritesAllowed("submitApplication"));
      setLiveWritesEnabledForTesting(null);
    });
  });
});
