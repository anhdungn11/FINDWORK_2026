import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { apiClient, setAuthToken } from "../../../services/http/apiClient";
import { useAuthStore } from "../../../store/authStore";
import { candidateSavedJobsApi } from "../../../services/api/candidateSavedJobsApi";
import {
  savedJobsService,
  resetSavedJobsSyncForTesting,
} from "../../../features/candidate/savedJobs/savedJobsService";
import { setLiveWritesEnabledForTesting } from "../../../features/candidate/profile/config/candidateIntegrationConfig";

interface DispatchedRequest {
  method?: string;
  url?: string;
  authHeader?: string;
  data?: unknown;
}

describe("Saved Jobs Session Race — Axios Interceptor & Adapter Level Protection", () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  const dispatchedRequests: DispatchedRequest[] = [];
  const storageMap = new Map<string, string>();

  const mockStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, value: string) => storageMap.set(key, String(value)),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  const userA = {
    id: "user-A-uuid",
    email: "candidate-a@example.com",
    accountType: "CANDIDATE" as const,
    status: "ACTIVE",
  };
  const tokenA = "token-candidate-A-secret";

  const userB = {
    id: "user-B-uuid",
    email: "candidate-b@example.com",
    accountType: "CANDIDATE" as const,
    status: "ACTIVE",
  };
  const tokenB = "token-candidate-B-secret";

  beforeEach(() => {
    dispatchedRequests.length = 0;
    storageMap.clear();

    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: mockStorage,
        sessionStorage: mockStorage,
        dispatchEvent: () => true,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
      writable: true,
      configurable: true,
    });
    (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
    (globalThis as unknown as { sessionStorage: typeof mockStorage }).sessionStorage = mockStorage;

    setLiveWritesEnabledForTesting(true);
    resetSavedJobsSyncForTesting();

    // Attach custom Axios adapter to capture actual network requests dispatched
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      dispatchedRequests.push({
        method: config.method?.toUpperCase(),
        url: config.url,
        authHeader: (config.headers?.Authorization as string) || undefined,
        data: config.data,
      });

      const response: AxiosResponse = {
        data: {
          success: true,
          data: {
            id: "rec-1",
            jobId: typeof config.data === "string" ? JSON.parse(config.data).jobId : "mock-job-id",
            savedAt: new Date().toISOString(),
            isAvailable: true,
            job: null,
          },
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
      return response;
    };
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    setLiveWritesEnabledForTesting(null);
    resetSavedJobsSyncForTesting();
    useAuthStore.getState().clearAuth();
    setAuthToken(null, null);
    storageMap.clear();

    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
    (globalThis as unknown as { localStorage: typeof originalLocalStorage }).localStorage = originalLocalStorage;
    (globalThis as unknown as { sessionStorage: typeof originalSessionStorage }).sessionStorage = originalSessionStorage;
  });

  it("dispatches normally with token-A when auth session does not change", async () => {
    useAuthStore.getState().setAuth(userA, tokenA);

    await candidateSavedJobsApi.save("job-uuid-1", { userId: userA.id });

    assert.equal(dispatchedRequests.length, 1);
    assert.equal(dispatchedRequests[0].authHeader, `Bearer ${tokenA}`);
    assert.equal(dispatchedRequests[0].url, "/candidate/saved-jobs");
    assert.equal(dispatchedRequests[0].method, "POST");
  });

  it("save: rejects and never dispatches under token-B when auth switches from A to B before interceptor evaluates", async () => {
    useAuthStore.getState().setAuth(userA, tokenA);

    // Add a temporary interceptor simulating auth switch while request is queued
    const interceptorId = apiClient.interceptors.request.use(async (config) => {
      useAuthStore.getState().setAuth(userB, tokenB);
      return config;
    });

    try {
      await assert.rejects(async () => {
        await candidateSavedJobsApi.save("job-uuid-victim", {
          originatingToken: tokenA,
          originatingUserId: userA.id,
        });
      });

      // Assert that Axios adapter was NEVER called with token-B
      const dispatchedUnderB = dispatchedRequests.filter(
        (r) => r.authHeader === `Bearer ${tokenB}`
      );
      assert.equal(dispatchedUnderB.length, 0);
      assert.equal(dispatchedRequests.length, 0);
    } finally {
      apiClient.interceptors.request.eject(interceptorId);
    }
  });

  it("remove: rejects and never dispatches under token-B when auth switches from A to B", async () => {
    useAuthStore.getState().setAuth(userA, tokenA);

    const interceptorId = apiClient.interceptors.request.use(async (config) => {
      useAuthStore.getState().setAuth(userB, tokenB);
      return config;
    });

    try {
      await assert.rejects(async () => {
        await candidateSavedJobsApi.remove("job-uuid-to-remove", {
          originatingToken: tokenA,
          originatingUserId: userA.id,
        });
      });

      const dispatchedUnderB = dispatchedRequests.filter(
        (r) => r.authHeader === `Bearer ${tokenB}`
      );
      assert.equal(dispatchedUnderB.length, 0);
      assert.equal(dispatchedRequests.length, 0);
    } finally {
      apiClient.interceptors.request.eject(interceptorId);
    }
  });

  it("sync: never dispatches pending user A saves under token-B during syncFromBackend", async () => {
    useAuthStore.getState().setAuth(userA, tokenA);

    // Prepopulate user A's storage with an unsynced real job
    savedJobsService.saveJob(userA.id, {
      id: "9de313d4-865d-4716-8be3-86f7e0c79900",
      title: "Senior React Engineer",
      company: "FindWork Tech",
      location: "Da Nang",
      salary: "Negotiable",
      isMock: false,
    });
    dispatchedRequests.length = 0; // Clear the initial saveJob request

    // Configure adapter: when GET /candidate/saved-jobs arrives, switch user to B
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      dispatchedRequests.push({
        method: config.method?.toUpperCase(),
        url: config.url,
        authHeader: (config.headers?.Authorization as string) || undefined,
      });

      if (config.url === "/candidate/saved-jobs" && config.method?.toUpperCase() === "GET") {
        useAuthStore.getState().setAuth(userB, tokenB);
        return {
          data: {
            success: true,
            data: [],
            pagination: { page: 1, pageSize: 100, total: 0, totalPages: 1 },
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        } as AxiosResponse;
      }

      return {
        data: { success: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      } as AxiosResponse;
    };

    // Run syncFromBackend for User A
    await savedJobsService.syncFromBackend(userA.id);

    // Verify: ZERO POST /candidate/saved-jobs requests were dispatched under Bearer token-B!
    const postsUnderB = dispatchedRequests.filter(
      (r) => r.method === "POST" && r.authHeader === `Bearer ${tokenB}`
    );
    assert.equal(postsUnderB.length, 0);

    // User B storage is unpolluted
    assert.equal(savedJobsService.getSavedJobs(userB.id).length, 0);
  });
});
