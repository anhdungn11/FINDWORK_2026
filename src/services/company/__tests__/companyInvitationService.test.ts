import test, { describe } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";

import {
  validateInvitationToken,
  extractTokenFromHash,
  sanitizeHashFromUrl,
  acceptCompanyInvitation,
  CompanyInvitationError,
} from "../companyInvitationService";
import { apiClient } from "../../http/apiClient";

describe("Phase 4.3C.3 Company Invitation Acceptance Client Tests", () => {
  const VALID_SAMPLE_TOKEN = "aB3_dE5-gH7_jK9-mN1_pQ3-sU5_wY7-zB9_dE1-gH3"; // exactly 43 chars

  describe("Token format validation", () => {
    test("accepts valid 43-character base64url token", () => {
      assert.strictEqual(VALID_SAMPLE_TOKEN.length, 43);
      assert.strictEqual(validateInvitationToken(VALID_SAMPLE_TOKEN), true);
    });

    test("accepts base64url tokens containing hyphens and underscores", () => {
      const token = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop_";
      assert.strictEqual(token.length, 43);
      assert.strictEqual(validateInvitationToken(token), true);
    });

    test("rejects token with invalid length", () => {
      assert.strictEqual(validateInvitationToken("too-short"), false);
      assert.strictEqual(validateInvitationToken(VALID_SAMPLE_TOKEN + "x"), false); // 44 chars
      assert.strictEqual(validateInvitationToken(""), false);
    });

    test("rejects token with invalid characters (standard base64 '+' or '/' or '=')", () => {
      const withPlus = VALID_SAMPLE_TOKEN.slice(0, 42) + "+";
      const withSlash = VALID_SAMPLE_TOKEN.slice(0, 42) + "/";
      const withEqual = VALID_SAMPLE_TOKEN.slice(0, 42) + "=";
      assert.strictEqual(validateInvitationToken(withPlus), false);
      assert.strictEqual(validateInvitationToken(withSlash), false);
      assert.strictEqual(validateInvitationToken(withEqual), false);
    });

    test("rejects non-string values", () => {
      assert.strictEqual(validateInvitationToken(null), false);
      assert.strictEqual(validateInvitationToken(undefined), false);
      assert.strictEqual(validateInvitationToken(12345), false);
    });
  });

  describe("Hash extraction and URL sanitization", () => {
    test("extracts token from '#token=<secret>' format", () => {
      const result = extractTokenFromHash(`#token=${VALID_SAMPLE_TOKEN}`);
      assert.strictEqual(result.status, "VALID");
      assert.strictEqual(result.token, VALID_SAMPLE_TOKEN);
    });

    test("extracts token from raw '#<secret>' format", () => {
      const result = extractTokenFromHash(`#${VALID_SAMPLE_TOKEN}`);
      assert.strictEqual(result.status, "VALID");
      assert.strictEqual(result.token, VALID_SAMPLE_TOKEN);
    });

    test("extracts token when multiple hash params exist", () => {
      const result = extractTokenFromHash(`#source=email&token=${VALID_SAMPLE_TOKEN}&utm=test`);
      assert.strictEqual(result.status, "VALID");
      assert.strictEqual(result.token, VALID_SAMPLE_TOKEN);
    });

    test("returns MISSING status when hash is empty or missing token param", () => {
      assert.strictEqual(extractTokenFromHash("").status, "MISSING");
      assert.strictEqual(extractTokenFromHash("#").status, "MISSING");
      assert.strictEqual(extractTokenFromHash("#other=val").status, "MISSING");
    });

    test("returns INVALID_FORMAT status when candidate does not match 43 chars regex", () => {
      const result = extractTokenFromHash("#token=invalid_short_token");
      assert.strictEqual(result.status, "INVALID_FORMAT");
      assert.strictEqual(result.token, null);
    });

    test("sanitizes hash from window.location if history.replaceState is present", () => {
      let replacedUrl = "";
      let retainedState: unknown;
      const routerState = { key: "current-router-entry" };
      (globalThis as unknown as { window: unknown }).window = {
        location: {
          pathname: "/company-invitations/accept",
          search: "",
          hash: `#token=${VALID_SAMPLE_TOKEN}`,
        },
        history: {
          state: routerState,
          replaceState: (data: unknown, _title: string, url: string) => {
            retainedState = data;
            replacedUrl = url;
          },
        },
      };

      sanitizeHashFromUrl();
      assert.strictEqual(replacedUrl, "/company-invitations/accept");
      assert.strictEqual(retainedState, routerState);
      delete (globalThis as unknown as { window?: unknown }).window;
    });
  });

  describe("acceptCompanyInvitation API caller", () => {
    test("throws INVALID_TOKEN_FORMAT early without network call if token is invalid", async () => {
      await assert.rejects(
        () => acceptCompanyInvitation("bad_token"),
        (err: unknown) => {
          if (!(err instanceof CompanyInvitationError)) return false;
          assert.strictEqual(err.code, "INVALID_TOKEN_FORMAT");
          assert.strictEqual(err.statusCode, 400);
          return true;
        },
      );
    });

    test("successfully resolves with companyId and role on 201 response", async () => {
      const originalPost = apiClient.post;
      try {
        apiClient.post = (async () => ({
          data: {
            companyId: "comp-uuid-1234",
            companyMemberId: "member-uuid-5678",
            role: "VIEWER",
          },
          status: 201,
          statusText: "Created",
          headers: {},
          config: {} as never,
        })) as never;

        const result = await acceptCompanyInvitation(VALID_SAMPLE_TOKEN, "mock-access-token");
        assert.strictEqual(result.companyId, "comp-uuid-1234");
        assert.strictEqual(result.companyMemberId, "member-uuid-5678");
        assert.strictEqual(result.role, "VIEWER");
      } finally {
        apiClient.post = originalPost;
      }
    });

    test("maps 401 error to UNAUTHORIZED", async () => {
      const originalPost = apiClient.post;
      try {
        apiClient.post = (async () => {
          const err = new axios.AxiosError("Unauthorized", "401");
          err.response = { status: 401, data: { message: "Unauthorized" } } as never;
          throw err;
        }) as never;

        await assert.rejects(
          () => acceptCompanyInvitation(VALID_SAMPLE_TOKEN),
          (err: unknown) => {
            if (!(err instanceof CompanyInvitationError)) return false;
            assert.strictEqual(err.code, "UNAUTHORIZED");
            assert.strictEqual(err.statusCode, 401);
            return true;
          },
        );
      } finally {
        apiClient.post = originalPost;
      }
    });

    test("maps 403 error without asserting the exact reason for denial", async () => {
      const originalPost = apiClient.post;
      try {
        apiClient.post = (async () => {
          const err = new axios.AxiosError("Forbidden", "403");
          err.response = { status: 403, data: { code: "AUTHORIZATION_FORBIDDEN" } } as never;
          throw err;
        }) as never;

        await assert.rejects(
          () => acceptCompanyInvitation(VALID_SAMPLE_TOKEN, "token"),
          (err: unknown) => {
            if (!(err instanceof CompanyInvitationError)) return false;
            assert.strictEqual(err.code, "FORBIDDEN");
            assert.strictEqual(err.statusCode, 403);
            return true;
          },
        );
      } finally {
        apiClient.post = originalPost;
      }
    });

    test("maps 404 error to NOT_FOUND_OR_REVOKED", async () => {
      const originalPost = apiClient.post;
      try {
        apiClient.post = (async () => {
          const err = new axios.AxiosError("Not Found", "404");
          err.response = { status: 404, data: { code: "COMPANY_INVITATION_NOT_FOUND" } } as never;
          throw err;
        }) as never;

        await assert.rejects(
          () => acceptCompanyInvitation(VALID_SAMPLE_TOKEN, "token"),
          (err: unknown) => {
            if (!(err instanceof CompanyInvitationError)) return false;
            assert.strictEqual(err.code, "NOT_FOUND_OR_REVOKED");
            assert.strictEqual(err.statusCode, 404);
            return true;
          },
        );
      } finally {
        apiClient.post = originalPost;
      }
    });

    test("maps 410 error to EXPIRED", async () => {
      const originalPost = apiClient.post;
      try {
        apiClient.post = (async () => {
          const err = new axios.AxiosError("Gone", "410");
          err.response = { status: 410, data: { code: "COMPANY_INVITATION_EXPIRED" } } as never;
          throw err;
        }) as never;

        await assert.rejects(
          () => acceptCompanyInvitation(VALID_SAMPLE_TOKEN, "token"),
          (err: unknown) => {
            if (!(err instanceof CompanyInvitationError)) return false;
            assert.strictEqual(err.code, "EXPIRED");
            assert.strictEqual(err.statusCode, 410);
            return true;
          },
        );
      } finally {
        apiClient.post = originalPost;
      }
    });

    test("maps 409 ALREADY_MEMBER conflict error", async () => {
      const originalPost = apiClient.post;
      try {
        apiClient.post = (async () => {
          const err = new axios.AxiosError("Conflict", "409");
          err.response = { status: 409, data: { code: "COMPANY_INVITATION_ALREADY_MEMBER" } } as never;
          throw err;
        }) as never;

        await assert.rejects(
          () => acceptCompanyInvitation(VALID_SAMPLE_TOKEN, "token"),
          (err: unknown) => {
            if (!(err instanceof CompanyInvitationError)) return false;
            assert.strictEqual(err.code, "ALREADY_MEMBER");
            assert.strictEqual(err.statusCode, 409);
            return true;
          },
        );
      } finally {
        apiClient.post = originalPost;
      }
    });

    test("maps 409 VIEWER_ROLE_UNAVAILABLE error", async () => {
      const originalPost = apiClient.post;
      try {
        apiClient.post = (async () => {
          const err = new axios.AxiosError("Conflict", "409");
          err.response = { status: 409, data: { code: "COMPANY_INVITATION_VIEWER_ROLE_UNAVAILABLE" } } as never;
          throw err;
        }) as never;

        await assert.rejects(
          () => acceptCompanyInvitation(VALID_SAMPLE_TOKEN, "token"),
          (err: unknown) => {
            if (!(err instanceof CompanyInvitationError)) return false;
            assert.strictEqual(err.code, "VIEWER_ROLE_UNAVAILABLE");
            assert.strictEqual(err.statusCode, 409);
            return true;
          },
        );
      } finally {
        apiClient.post = originalPost;
      }
    });

    test("maps network failure to NETWORK_ERROR", async () => {
      const originalPost = apiClient.post;
      try {
        apiClient.post = (async () => {
          const err = new axios.AxiosError("Network Error");
          throw err;
        }) as never;

        await assert.rejects(
          () => acceptCompanyInvitation(VALID_SAMPLE_TOKEN, "token"),
          (err: unknown) => {
            if (!(err instanceof CompanyInvitationError)) return false;
            assert.strictEqual(err.code, "NETWORK_ERROR");
            return true;
          },
        );
      } finally {
        apiClient.post = originalPost;
      }
    });
  });
});
