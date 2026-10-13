import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  CANDIDATE_PROFILE_NOT_FOUND_CODE,
  getCandidateProfile,
  isCandidateProfileRecord,
  parseCandidateProfileError,
  parseCandidateProfileResponse,
} from "../services/candidateProfileService";
import type { CandidateProfileRecord } from "../types/dashboard.types";
import { apiClient } from "../../../../services/http/apiClient";
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

function createMockAxiosError(status?: number, data?: unknown, message = "Request failed"): AxiosError {
  const error = new AxiosError(message, status ? `ERR_BAD_REQUEST_${status}` : "ERR_NETWORK");
  if (status !== undefined) {
    error.response = {
      status,
      statusText:
        status === 404
          ? "Not Found"
          : status === 403
          ? "Forbidden"
          : status === 500
          ? "Internal Server Error"
          : "Error",
      data: data ?? { message },
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    } as AxiosResponse;
  }
  return error;
}

const mockValidProfile: CandidateProfileRecord = {
  id: "profile-uuid-001",
  userId: "user-uuid-123",
  fullName: "Nguyễn Văn Chuyên Nghiệp",
  phone: "+84912345678",
  dateOfBirth: "1998-05-20",
  gender: "MALE",
  countryCode: "VN",
  provinceId: "prov-01",
  wardId: "ward-01",
  addressLine: "123 Đường Công Nghệ",
  bio: "Kỹ sư phần mềm 5 năm kinh nghiệm",
  avatarAssetKey: null,
  careerStatus: "OPEN_TO_OPPORTUNITIES",
  createdAt: "2026-10-13T00:00:00.000Z",
  updatedAt: "2026-10-13T08:30:00.000Z",
  province: { id: "prov-01", code: "01", name: "Hà Nội", divisionType: "PROVINCE" },
  ward: { id: "ward-01", code: "001", name: "Phường Phúc Xá", divisionType: "WARD" },
  privacySetting: {
    id: "priv-01",
    candidateProfileId: "profile-uuid-001",
    searchableProfile: true,
    showEmail: false,
    showPhone: false,
    allowResumeDownload: true,
    allowJobMatching: true,
    createdAt: "2026-10-13T00:00:00.000Z",
    updatedAt: "2026-10-13T08:30:00.000Z",
  },
};

const originalGet = apiClient.get;

describe("Candidate Profile Backend Contract & Response Validation", () => {
  afterEach(() => {
    apiClient.get = originalGet;
  });

  // 1. 200 + Profile hợp lệ → exists
  it("Case 1: 200 + Profile hợp lệ → exists through getCandidateProfile()", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiClient.get = (async () => ({ data: mockValidProfile })) as any;

    const result = await getCandidateProfile();
    assert.equal(result.status, "exists");
    assert.ok(result.profile !== null);
    assert.equal(result.profile?.id, "profile-uuid-001");
    assert.equal(result.profile?.fullName, "Nguyễn Văn Chuyên Nghiệp");
    assert.equal(result.profile?.careerStatus, "OPEN_TO_OPPORTUNITIES");
    assert.equal(result.profile?.province?.name, "Hà Nội");
    // CRITICAL: Prisma CandidateProfile has no publishedAt or publicationStatus
    assert.equal("publishedAt" in (result.profile ?? {}), false);
    assert.equal("publicationStatus" in (result.profile ?? {}), false);
  });

  // 1b. Wrapped { data: profile } response also resolves to exists
  it("Case 1b: 200 + wrapped { data: profile } → exists", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiClient.get = (async () => ({ data: { data: mockValidProfile } })) as any;

    const result = await getCandidateProfile();
    assert.equal(result.status, "exists");
    assert.equal(result.profile?.fullName, "Nguyễn Văn Chuyên Nghiệp");
  });

  // 2. 200 + null → error
  it("Case 2: 200 + null body → error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiClient.get = (async () => ({ data: null })) as any;

    const result = await getCandidateProfile();
    assert.equal(result.status, "error");
    assert.equal(result.profile, null);
    assert.notEqual(result.status, "not_created");
    assert.notEqual(result.status, "exists");
    assert.ok(result.errorMessage?.includes("không hợp lệ"));
  });

  // 3. 200 + object thiếu trường bắt buộc → error
  it("Case 3: 200 + object missing required fields (id, userId, or fullName) → error", async () => {
    const incompleteObject = {
      id: "profile-uuid-001",
      // missing userId, fullName, createdAt, updatedAt
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiClient.get = (async () => ({ data: incompleteObject })) as any;

    const result = await getCandidateProfile();
    assert.equal(result.status, "error");
    assert.equal(result.profile, null);
    assert.notEqual(result.status, "not_created");
    assert.notEqual(result.status, "exists");
  });

  // 4. 200 + field sai kiểu → error
  it("Case 4: 200 + field wrong type (fullName is number, phone is boolean) → error", async () => {
    const wrongTypeObject = {
      ...mockValidProfile,
      fullName: 12345, // invalid type
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiClient.get = (async () => ({ data: wrongTypeObject })) as any;

    const result = await getCandidateProfile();
    assert.equal(result.status, "error");
    assert.equal(result.profile, null);
    assert.notEqual(result.status, "not_created");
    assert.notEqual(result.status, "exists");
  });

  // 5. 404 + CANDIDATE_PROFILE_NOT_FOUND → not_created
  it("Case 5: 404 + CANDIDATE_PROFILE_NOT_FOUND → not_created", async () => {
    const error404Valid = createMockAxiosError(404, {
      code: CANDIDATE_PROFILE_NOT_FOUND_CODE,
      message: "Candidate profile was not found.",
    });
    apiClient.get = (async () => {
      throw error404Valid;
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await getCandidateProfile();
    assert.equal(result.status, "not_created");
    assert.equal(result.profile, null);
  });

  // 6. 404 + error code khác → error
  it("Case 6: 404 + different error code (NOT_FOUND, ROUTE_NOT_FOUND) → error, NOT not_created", async () => {
    const error404Other = createMockAxiosError(404, {
      code: "NOT_FOUND",
      message: "Route /api/v1/candidate/profile not found on server.",
    });
    apiClient.get = (async () => {
      throw error404Other;
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await getCandidateProfile();
    assert.equal(result.status, "error");
    assert.equal(result.profile, null);
    assert.notEqual(result.status, "not_created");
    assert.notEqual(result.status, "exists");
  });

  // 7. 404 + không có error code → error
  it("Case 7: 404 + missing error code → error, NOT not_created", async () => {
    const error404NoCode = createMockAxiosError(404, {
      message: "Resource was not found.",
    });
    apiClient.get = (async () => {
      throw error404NoCode;
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await getCandidateProfile();
    assert.equal(result.status, "error");
    assert.equal(result.profile, null);
    assert.notEqual(result.status, "not_created");
    assert.notEqual(result.status, "exists");
  });

  // 8. 403 → forbidden
  it("Case 8: 403 Forbidden → forbidden, NOT not_created", async () => {
    const error403 = createMockAxiosError(403, {
      code: "FORBIDDEN",
      message: "Forbidden resource - missing profile.view permission.",
    });
    apiClient.get = (async () => {
      throw error403;
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await getCandidateProfile();
    assert.equal(result.status, "forbidden");
    assert.equal(result.profile, null);
    assert.notEqual(result.status, "not_created");
    assert.ok(result.errorMessage?.includes("profile.view") || result.errorMessage?.includes("Forbidden"));
  });

  // 9. 500 → error
  it("Case 9: 500 Internal Server Error → error, NOT not_created", async () => {
    const error500 = createMockAxiosError(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "Database connection failed.",
    });
    apiClient.get = (async () => {
      throw error500;
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await getCandidateProfile();
    assert.equal(result.status, "error");
    assert.equal(result.profile, null);
    assert.notEqual(result.status, "not_created");
  });

  // 10. Network error → error
  it("Case 10: Network error (no response) → error, NOT not_created", async () => {
    const networkError = createMockAxiosError(undefined, undefined, "Network Error: ECONNREFUSED");
    apiClient.get = (async () => {
      throw networkError;
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const result = await getCandidateProfile();
    assert.equal(result.status, "error");
    assert.equal(result.profile, null);
    assert.notEqual(result.status, "not_created");
  });

  // Unit tests for runtime type guard
  it("runtime type guard isCandidateProfileRecord strictly validates types", () => {
    assert.equal(isCandidateProfileRecord(mockValidProfile), true);
    assert.equal(isCandidateProfileRecord(null), false);
    assert.equal(isCandidateProfileRecord(undefined), false);
    assert.equal(isCandidateProfileRecord("string"), false);
    assert.equal(isCandidateProfileRecord([]), false);
    assert.equal(isCandidateProfileRecord({}), false);
    assert.equal(isCandidateProfileRecord({ id: "", userId: "u", fullName: "n", createdAt: "d", updatedAt: "d" }), false);
    assert.equal(isCandidateProfileRecord({ id: "1", userId: "", fullName: "n", createdAt: "d", updatedAt: "d" }), false);
    assert.equal(isCandidateProfileRecord({ id: "1", userId: "u", fullName: "", createdAt: "d", updatedAt: "d" }), false);
  });

  // Unit tests for parseCandidateProfileResponse & parseCandidateProfileError
  it("standalone parser functions handle custom inputs predictably", () => {
    const validState = parseCandidateProfileResponse(mockValidProfile);
    assert.equal(validState.status, "exists");

    const invalidState = parseCandidateProfileResponse({ randomKey: true });
    assert.equal(invalidState.status, "error");

    const clientErrorState = parseCandidateProfileError(new Error("Local exception"));
    assert.equal(clientErrorState.status, "error");
    assert.equal(clientErrorState.errorMessage, "Local exception");
  });
});
