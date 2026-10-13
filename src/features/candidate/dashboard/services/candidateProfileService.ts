import axios, { type AxiosError } from "axios";
import { apiClient, extractApiErrorMessage, type ApiErrorResponse } from "../../../../services/http/apiClient";
import type {
  CandidateProfileRecord,
  CandidateProfileState,
} from "../types/dashboard.types";

export const CANDIDATE_PROFILE_NOT_FOUND_CODE = "CANDIDATE_PROFILE_NOT_FOUND";

/**
 * Validates at runtime whether an unknown object conforms to CandidateProfileRecord.
 * Prevents treating corrupted or malformed payloads as a valid existing profile.
 */
export function isCandidateProfileRecord(value: unknown): value is CandidateProfileRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  // Required non-empty string fields
  if (typeof candidate.id !== "string" || candidate.id.trim().length === 0) {
    return false;
  }
  if (typeof candidate.userId !== "string" || candidate.userId.trim().length === 0) {
    return false;
  }
  if (typeof candidate.fullName !== "string" || candidate.fullName.trim().length === 0) {
    return false;
  }

  // Required timestamps
  if (typeof candidate.createdAt !== "string" && !(candidate.createdAt instanceof Date)) {
    return false;
  }
  if (typeof candidate.updatedAt !== "string" && !(candidate.updatedAt instanceof Date)) {
    return false;
  }

  // Type checks for optional fields when defined
  if (candidate.phone !== undefined && candidate.phone !== null && typeof candidate.phone !== "string") {
    return false;
  }
  if (
    candidate.dateOfBirth !== undefined &&
    candidate.dateOfBirth !== null &&
    typeof candidate.dateOfBirth !== "string" &&
    !(candidate.dateOfBirth instanceof Date)
  ) {
    return false;
  }
  if (candidate.gender !== undefined && candidate.gender !== null && typeof candidate.gender !== "string") {
    return false;
  }
  if (candidate.countryCode !== undefined && candidate.countryCode !== null && typeof candidate.countryCode !== "string") {
    return false;
  }
  if (candidate.provinceId !== undefined && candidate.provinceId !== null && typeof candidate.provinceId !== "string") {
    return false;
  }
  if (candidate.wardId !== undefined && candidate.wardId !== null && typeof candidate.wardId !== "string") {
    return false;
  }
  if (candidate.addressLine !== undefined && candidate.addressLine !== null && typeof candidate.addressLine !== "string") {
    return false;
  }
  if (candidate.bio !== undefined && candidate.bio !== null && typeof candidate.bio !== "string") {
    return false;
  }
  if (candidate.avatarAssetKey !== undefined && candidate.avatarAssetKey !== null && typeof candidate.avatarAssetKey !== "string") {
    return false;
  }
  if (candidate.careerStatus !== undefined && candidate.careerStatus !== null && typeof candidate.careerStatus !== "string") {
    return false;
  }

  return true;
}

/**
 * Validates and parses successful HTTP 200 payload.
 * Supports both raw profile records and optional API response wrappers ({ data: profile }).
 * Classifies malformed payloads as error, never exists or not_created.
 */
export function parseCandidateProfileResponse(payload: unknown): CandidateProfileState {
  let target = payload;
  if (
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    "data" in payload &&
    typeof (payload as { data: unknown }).data === "object" &&
    (payload as { data: unknown }).data !== null
  ) {
    target = (payload as { data: unknown }).data;
  }

  if (isCandidateProfileRecord(target)) {
    return {
      status: "exists",
      profile: target,
    };
  }

  return {
    status: "error",
    profile: null,
    errorMessage: "Dữ liệu phản hồi hồ sơ ứng viên từ máy chủ không hợp lệ.",
  };
}

/**
 * Parses axios or generic error into explicit CandidateProfileState.
 * Strictly adheres to backend contract:
 * - 404 + CANDIDATE_PROFILE_NOT_FOUND: Profile not created.
 * - 404 + other/missing error code: Error (not assumed as not created).
 * - 403: Forbidden - missing profile.view permission.
 * - 500/network error: Error.
 */
export function parseCandidateProfileError(error: unknown): CandidateProfileState {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const status = axiosError.response?.status;
    const errorCode = axiosError.response?.data?.code;

    if (status === 404) {
      if (errorCode === CANDIDATE_PROFILE_NOT_FOUND_CODE) {
        return {
          status: "not_created",
          profile: null,
        };
      }
      return {
        status: "error",
        profile: null,
        errorMessage:
          extractApiErrorMessage(error, "Không tìm thấy tài nguyên yêu cầu trên máy chủ (404 Not Found)."),
      };
    }

    if (status === 403) {
      return {
        status: "forbidden",
        profile: null,
        errorMessage:
          extractApiErrorMessage(error, "Tài khoản chưa được cấp quyền xem hồ sơ ứng viên (profile.view)."),
      };
    }

    return {
      status: "error",
      profile: null,
      errorMessage: extractApiErrorMessage(error, "Lỗi máy chủ khi tải hồ sơ ứng viên."),
    };
  }

  return {
    status: "error",
    profile: null,
    errorMessage:
      error instanceof Error ? error.message : "Đã có lỗi xảy ra khi tải hồ sơ ứng viên.",
  };
}

/**
 * Fetches current candidate profile from GET /api/v1/candidate/profile.
 * Returns deterministic CandidateProfileState without throwing unhandled exceptions.
 */
export async function getCandidateProfile(): Promise<CandidateProfileState> {
  try {
    const response = await apiClient.get<unknown>("/candidate/profile");
    return parseCandidateProfileResponse(response.data);
  } catch (error: unknown) {
    return parseCandidateProfileError(error);
  }
}
