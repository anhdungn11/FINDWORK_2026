import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { emailVerificationApi } from "../emailVerificationApi";
import { apiClient } from "../../http/apiClient";

test("emailVerificationApi: confirm sends POST /auth/email-verification/confirm with token", async () => {
  let capturedUrl = "";
  let capturedBody: any = null;

  const originalPost = apiClient.post;
  apiClient.post = (async (url: string, body?: any) => {
    capturedUrl = url;
    capturedBody = body;
    return { data: null, status: 204 };
  }) as any;

  try {
    await emailVerificationApi.confirm("valid-base64url-token-12345678901234567890123");
    assert.equal(capturedUrl, "/auth/email-verification/confirm");
    assert.deepEqual(capturedBody, { token: "valid-base64url-token-12345678901234567890123" });
  } finally {
    apiClient.post = originalPost;
  }
});

test("emailVerificationApi: request sends POST /auth/email-verification/request with auth token", async () => {
  let capturedUrl = "";
  const originalPost = apiClient.post;
  apiClient.post = (async (url: string) => {
    capturedUrl = url;
    return { data: null, status: 204 };
  }) as any;

  try {
    await emailVerificationApi.request();
    assert.equal(capturedUrl, "/auth/email-verification/request");
  } finally {
    apiClient.post = originalPost;
  }
});

test("emailVerificationApi: confirm maps network/server error to ApiFailure", async () => {
  const originalPost = apiClient.post;
  apiClient.post = (async () => {
    const error: any = new axios.AxiosError("Unauthorized", "401", undefined, undefined, {
      status: 401,
      statusText: "Unauthorized",
      data: { code: "AUTH_EMAIL_VERIFICATION_TOKEN_INVALID", message: "Token is invalid" },
      headers: {},
      config: {} as any,
    });
    throw error;
  }) as any;

  try {
    await assert.rejects(
      async () => {
        await emailVerificationApi.confirm("bad-token");
      },
      (err: any) => {
        assert.equal(err.kind, "unauthenticated");
        assert.equal(err.code, "AUTH_EMAIL_VERIFICATION_TOKEN_INVALID");
        return true;
      }
    );
  } finally {
    apiClient.post = originalPost;
  }
});
