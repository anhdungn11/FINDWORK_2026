import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAuthResponse } from "../authResponse";

describe("authentication API response validation", () => {
  it("accepts a real-shaped backend login/register response", () => {
    const result = parseAuthResponse({
      accessToken: "test-access-token",
      accessTokenExpiresInSeconds: 900,
      user: { id: "test-user-id", email: "candidate@example.com" },
    });
    assert.equal(result.user.email, "candidate@example.com");
  });
  it("rejects Vite HTML fallback masquerading as an API response", () => {
    assert.throws(() => parseAuthResponse("<!doctype html><html></html>"), /không hợp lệ/);
  });
  it("rejects missing access token", () => {
    assert.throws(() => parseAuthResponse({ user: { id: "1", email: "x@example.com" } }), /không hợp lệ/);
  });
  it("rejects absent or malformed user identity", () => {
    assert.throws(() => parseAuthResponse({ accessToken: "token", user: { id: "1" } }), /không hợp lệ/);
    assert.throws(() => parseAuthResponse(null), /không hợp lệ/);
  });
});
