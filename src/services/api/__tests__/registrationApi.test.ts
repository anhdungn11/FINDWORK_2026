import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { apiClient } from "../../http/apiClient";
import { API_ENDPOINTS } from "../../http/endpoints";
import { registerAccount, type RegistrationPayload } from "../registrationApi";

describe("registration API contract", () => {
  it("sends the exact required Backend DTO for Candidate and Employer", async () => {
    const originalPost = apiClient.post;
    try {
      for (const accountType of ["CANDIDATE", "EMPLOYER"] as const) {
        const payload: RegistrationPayload = {
          email: accountType.toLowerCase() + "@example.invalid",
          password: "SyntheticPassword123!",
          accountType,
        };
        let captured: { route: string; body: unknown } | undefined;
        apiClient.post = (async (route: string, body: unknown) => {
          captured = { route, body };
          return {
            data: { accessToken: "synthetic-token", user: {
              id: "synthetic-id", email: payload.email, accountType,
            } },
          };
        }) as typeof apiClient.post;
        const session = await registerAccount(payload);
        assert.equal(captured?.route, API_ENDPOINTS.AUTH.REGISTER_V2);
        assert.deepEqual(captured?.body, payload);
        assert.deepEqual(Object.keys(captured?.body as object).sort(), ["accountType", "email", "password"]);
        assert.equal(session.user.accountType, accountType);
      }
    } finally {
      apiClient.post = originalPost;
    }
  });

  it("rejects a mismatched Backend account type instead of reporting success", async () => {
    const originalPost = apiClient.post;
    try {
      apiClient.post = (async () => ({
        data: { accessToken: "synthetic-token", user: {
          id: "synthetic-id", email: "candidate@example.invalid", accountType: "EMPLOYER",
        } },
      })) as typeof apiClient.post;
      await assert.rejects(registerAccount({
        email: "candidate@example.invalid",
        password: "SyntheticPassword123!",
        accountType: "CANDIDATE",
      }), /did not match/);
    } finally {
      apiClient.post = originalPost;
    }
  });

  it("propagates server rejection instead of reporting success", async () => {
    const originalPost = apiClient.post;
    const rejection = new Error("synthetic registration rejection");
    try {
      apiClient.post = (async () => { throw rejection; }) as typeof apiClient.post;
      await assert.rejects(registerAccount({
        email: "candidate@example.invalid",
        password: "SyntheticPassword123!",
        accountType: "CANDIDATE",
      }), (caught) => caught === rejection);
    } finally {
      apiClient.post = originalPost;
    }
  });
});
