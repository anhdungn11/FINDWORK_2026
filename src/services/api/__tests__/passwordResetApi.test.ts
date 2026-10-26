import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { passwordResetApi } from "../passwordResetApi";
import { apiClient } from "../../http/apiClient";

const VALID_43_CHAR_TOKEN = "JERfcRhnDyyj5tAfTWkT7dyqej401ZExK6TEsd1ykTE";

test("passwordResetApi: request sends POST /auth/password-reset/request with normalized email", async () => {
  let capturedUrl = "";
  let capturedBody: any = null;

  const originalPost = apiClient.post;
  apiClient.post = (async (url: string, body?: any) => {
    capturedUrl = url;
    capturedBody = body;
    return { data: null, status: 204 };
  }) as any;

  try {
    await passwordResetApi.request("  TestUser@Example.COM  ");
    assert.equal(capturedUrl, "/auth/password-reset/request");
    assert.deepEqual(capturedBody, { email: "testuser@example.com" });
  } finally {
    apiClient.post = originalPost;
  }
});

test("passwordResetApi: confirm sends POST /auth/password-reset/confirm with token and password", async () => {
  let capturedUrl = "";
  let capturedBody: any = null;

  const originalPost = apiClient.post;
  apiClient.post = (async (url: string, body?: any) => {
    capturedUrl = url;
    capturedBody = body;
    return { data: null, status: 204 };
  }) as any;

  try {
    await passwordResetApi.confirm(VALID_43_CHAR_TOKEN, "SecurePassword123!");
    assert.equal(capturedUrl, "/auth/password-reset/confirm");
    assert.deepEqual(capturedBody, { token: VALID_43_CHAR_TOKEN, password: "SecurePassword123!" });
  } finally {
    apiClient.post = originalPost;
  }
});

test("passwordResetApi: request maps 503 delivery unavailable to ApiFailure", async () => {
  const originalPost = apiClient.post;
  apiClient.post = (async () => {
    const error: any = new axios.AxiosError("Service Unavailable", "503", undefined, undefined, {
      status: 503,
      statusText: "Service Unavailable",
      data: { code: "AUTH_PASSWORD_RESET_DELIVERY_UNAVAILABLE", message: "Delivery unavailable" },
      headers: {},
      config: {} as any,
    });
    throw error;
  }) as any;

  try {
    await assert.rejects(
      async () => {
        await passwordResetApi.request("user@example.com");
      },
      (err: any) => {
        assert.equal(err.kind, "unavailable");
        assert.equal(err.status, 503);
        assert.equal(err.code, "AUTH_PASSWORD_RESET_DELIVERY_UNAVAILABLE");
        assert.match(err.message, /chưa được cấu hình/);
        return true;
      }
    );
  } finally {
    apiClient.post = originalPost;
  }
});

test("passwordResetApi: confirm maps 401 invalid/expired token to ApiFailure", async () => {
  const originalPost = apiClient.post;
  apiClient.post = (async () => {
    const error: any = new axios.AxiosError("Unauthorized", "401", undefined, undefined, {
      status: 401,
      statusText: "Unauthorized",
      data: { code: "AUTH_PASSWORD_RESET_TOKEN_INVALID", message: "Password reset token is invalid or expired." },
      headers: {},
      config: {} as any,
    });
    throw error;
  }) as any;

  try {
    await assert.rejects(
      async () => {
        await passwordResetApi.confirm(VALID_43_CHAR_TOKEN, "NewPass123456!");
      },
      (err: any) => {
        assert.equal(err.kind, "unauthenticated");
        assert.equal(err.status, 401);
        assert.equal(err.code, "AUTH_PASSWORD_RESET_TOKEN_INVALID");
        assert.match(err.message, /không hợp lệ hoặc đã hết hạn/);
        return true;
      }
    );
  } finally {
    apiClient.post = originalPost;
  }
});

test("passwordResetApi: token regex accepts valid 43-char base64url tokens and rejects others", () => {
  const TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;
  assert.equal(TOKEN_REGEX.test(VALID_43_CHAR_TOKEN), true);
  assert.equal(TOKEN_REGEX.test("abc_123-XYZ_456-789_01234567890123456789012"), true); // 43 chars
  // Invalid lengths
  assert.equal(TOKEN_REGEX.test("short"), false);
  assert.equal(TOKEN_REGEX.test(VALID_43_CHAR_TOKEN + "A"), false); // 44 chars
  // Invalid chars (standard base64 + / =)
  assert.equal(TOKEN_REGEX.test("JERfcRhnDyyj5tAfTWkT7dyqej401ZExK6TEsd1ykT+"), false);
  assert.equal(TOKEN_REGEX.test("JERfcRhnDyyj5tAfTWkT7dyqej401ZExK6TEsd1ykT="), false);
});
