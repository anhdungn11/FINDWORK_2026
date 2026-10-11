import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { apiClient, getAuthToken } from "../../services/http/apiClient";
import { API_ENDPOINTS } from "../../services/http/endpoints";
import { useAuthStore, type AuthUser } from "../authStore";

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
    useAuthStore.getState().clearAuth();
    try {
      apiClient.post = (async (endpoint: string) => {
        if (endpoint === API_ENDPOINTS.AUTH.REFRESH) return pending.promise;
        if (endpoint === API_ENDPOINTS.AUTH.LOGOUT) return { data: undefined };
        throw new Error("Unexpected endpoint");
      }) as never;
      const check = useAuthStore.getState().checkAuth();
      await useAuthStore.getState().logout();
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
    useAuthStore.getState().clearAuth();
    try {
      apiClient.post = (async (endpoint: string) => {
        if (endpoint === API_ENDPOINTS.AUTH.REFRESH) return pending.promise;
        if (endpoint === API_ENDPOINTS.AUTH.LOGIN) return { data: { user: bob, accessToken: "bob-access" } };
        throw new Error("Unexpected endpoint");
      }) as never;
      const check = useAuthStore.getState().checkAuth();
      await useAuthStore.getState().login({ email: bob.email, password: "test-password" });
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
