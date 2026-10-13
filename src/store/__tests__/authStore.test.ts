import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { apiClient, getAuthToken } from "../../services/http/apiClient";
import { API_ENDPOINTS } from "../../services/http/endpoints";
import { useAuthStore, type AuthUser } from "../authStore";
import { getCandidateRouteState } from "../../app/guards/CandidateRoute";

const alice: AuthUser = { id: "alice-id", email: "alice@example.test" };
const bob: AuthUser = { id: "bob-id", email: "bob@example.test" };

interface DeferredResponse {
  resolve: (value: unknown) => void;
  promise: Promise<unknown>;
}
function deferred(): DeferredResponse {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>((done) => { resolve = done; });
  return { resolve, promise };
}

describe("authStore session race regression", () => {
  test("candidate route waits for refresh and denies access after logout", () => {
    assert.equal(getCandidateRouteState("idle", false), "loading");
    assert.equal(getCandidateRouteState("loading", false), "loading");
    assert.equal(getCandidateRouteState("loggingOut", false), "loading");
    assert.equal(getCandidateRouteState("authenticated", true), "allowed");
    assert.equal(getCandidateRouteState("authenticated", false), "denied");
    assert.equal(getCandidateRouteState("unauthenticated", false), "denied");
  });

  test("login stores the returned account and bearer token", async () => {
    const originalPost = apiClient.post;
    useAuthStore.getState().clearAuth();
    try {
      apiClient.post = (async (endpoint: string, body: { email: string }) => {
        assert.equal(endpoint, API_ENDPOINTS.AUTH.LOGIN);
        assert.equal(body.email, "bob@example.test");
        return { data: { user: bob, accessToken: "bob-access" } };
      }) as never;
      await useAuthStore.getState().login({ email: " BOB@example.test ", password: "secret" });
      assert.equal(useAuthStore.getState().status, "authenticated");
      assert.equal(useAuthStore.getState().user?.id, bob.id);
      assert.equal(getAuthToken(), "bob-access");
    } finally {
      apiClient.post = originalPost;
      useAuthStore.getState().clearAuth();
    }
  });

  test("successful logout revokes through the API and blocks the old route", async () => {
    const originalPost = apiClient.post;
    const calls: string[] = [];
    useAuthStore.getState().setAuth(alice, "alice-access");
    try {
      apiClient.post = (async (endpoint: string) => {
        calls.push(endpoint);
        return { data: undefined };
      }) as never;
      assert.equal(await useAuthStore.getState().logout(), true);
      assert.deepEqual(calls, [API_ENDPOINTS.AUTH.LOGOUT]);
      assert.equal(getAuthToken(), null);
      assert.equal(useAuthStore.getState().status, "unauthenticated");
      assert.equal(getCandidateRouteState(useAuthStore.getState().status, false), "denied");
    } finally {
      apiClient.post = originalPost;
      useAuthStore.getState().clearAuth();
    }
  });

  test("failed server logout keeps the local route closed and can be retried", async () => {
    const originalPost = apiClient.post;
    let calls = 0;
    useAuthStore.getState().setAuth(alice, "alice-access");
    try {
      apiClient.post = (async (endpoint: string) => {
        assert.equal(endpoint, API_ENDPOINTS.AUTH.LOGOUT);
        calls += 1;
        if (calls === 1) throw new Error("offline");
        return { data: undefined };
      }) as never;
      assert.equal(await useAuthStore.getState().logout(), false);
      assert.equal(useAuthStore.getState().user, null);
      assert.equal(getAuthToken(), null);
      assert.ok(useAuthStore.getState().logoutError);
      assert.equal(await useAuthStore.getState().checkAuth(), null);
      assert.equal(await useAuthStore.getState().logout(), true);
      assert.equal(calls, 2);
      assert.equal(useAuthStore.getState().logoutError, null);
    } finally {
      apiClient.post = originalPost;
      useAuthStore.getState().clearAuth();
    }
  });
  test("two simultaneous checkAuth calls share one refresh request", async () => {
    const originalPost = apiClient.post;
    const pending = deferred();
    let calls = 0;
    useAuthStore.getState().clearAuth();
    try {
      apiClient.post = (async (endpoint: string) => {
        if (endpoint !== API_ENDPOINTS.AUTH.REFRESH) throw new Error("Unexpected endpoint");
        calls += 1;
        return pending.promise;
      }) as never;
      const first = useAuthStore.getState().checkAuth();
      const second = useAuthStore.getState().checkAuth();
      assert.strictEqual(first, second);
      assert.strictEqual(calls, 1);
      pending.resolve({ data: { user: alice, accessToken: "alice-access" } });
      await Promise.all([first, second]);
      assert.strictEqual(useAuthStore.getState().user?.id, alice.id);
    } finally {
      apiClient.post = originalPost;
      useAuthStore.getState().clearAuth();
    }
  });

  test("late refresh cannot restore a session after logout", async () => {
    const originalPost = apiClient.post;
    const pending = deferred();
    let refreshSignal: AbortSignal | undefined;
    useAuthStore.getState().clearAuth();
    try {
      apiClient.post = (async (endpoint: string, _body: unknown, config?: { signal?: AbortSignal }) => {
        if (endpoint === API_ENDPOINTS.AUTH.REFRESH) {
          refreshSignal = config?.signal;
          return pending.promise;
        }
        if (endpoint === API_ENDPOINTS.AUTH.LOGOUT) return { data: undefined };
        throw new Error("Unexpected endpoint");
      }) as never;
      const check = useAuthStore.getState().checkAuth();
      await useAuthStore.getState().logout();
      assert.equal(refreshSignal?.aborted, true);
      pending.resolve({ data: { user: alice, accessToken: "stale-access" } });
      await check;
      assert.strictEqual(useAuthStore.getState().user, null);
      assert.strictEqual(getAuthToken(), null);
    } finally {
      apiClient.post = originalPost;
      useAuthStore.getState().clearAuth();
    }
  });

  test("late refresh cannot replace a newer login", async () => {
    const originalPost = apiClient.post;
    const pending = deferred();
    let refreshSignal: AbortSignal | undefined;
    useAuthStore.getState().clearAuth();
    try {
      apiClient.post = (async (endpoint: string, _body: unknown, config?: { signal?: AbortSignal }) => {
        if (endpoint === API_ENDPOINTS.AUTH.REFRESH) {
          refreshSignal = config?.signal;
          return pending.promise;
        }
        if (endpoint === API_ENDPOINTS.AUTH.LOGIN) return { data: { user: bob, accessToken: "bob-access" } };
        throw new Error("Unexpected endpoint");
      }) as never;
      const check = useAuthStore.getState().checkAuth();
      await useAuthStore.getState().login({ email: bob.email, password: "test-password" });
      assert.equal(refreshSignal?.aborted, true);
      pending.resolve({ data: { user: alice, accessToken: "stale-access" } });
      await check;
      assert.strictEqual(useAuthStore.getState().user?.id, bob.id);
      assert.strictEqual(getAuthToken(), "bob-access");
    } finally {
      apiClient.post = originalPost;
      useAuthStore.getState().clearAuth();
    }
  });
});
