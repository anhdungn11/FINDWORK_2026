import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../../store/authStore";
import { loadOnboardingDraft, type OnboardingDraft } from "../../services/onboardingDraft";
import { resumeService } from "../../../resume/services/resumeService";
import type { Resume } from "../../../resume/types/resume.types";
import {
  calculateDashboardProgress,
  getCandidateDisplayName,
  CANDIDATE_DASHBOARD_QUERY_KEYS,
} from "../utils/dashboardProgress";
import { getCandidateProfile } from "../services/candidateProfileService";
import type {
  CandidateDashboardData,
  CandidateProfileState,
} from "../types/dashboard.types";

export interface UseCandidateDashboardResult {
  data: CandidateDashboardData | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  isAuthenticated: boolean;
  refetch: () => Promise<unknown>;
}

export function useCandidateDashboardData(): UseCandidateDashboardResult {
  const user = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    if (authStatus === "idle") {
      void checkAuth();
    }
  }, [authStatus, checkAuth]);

  const isAuthed = authStatus === "authenticated" && Boolean(user?.id);
  const userId = user?.id;

  const draftQuery = useQuery<OnboardingDraft | null, Error>({
    queryKey: CANDIDATE_DASHBOARD_QUERY_KEYS.draft(userId),
    queryFn: async () => {
      return await loadOnboardingDraft();
    },
    enabled: isAuthed,
    staleTime: 1000 * 30, // 30s
  });

  // Resumes query: uses resumeService.list() as the unified source of truth.
  // staleTime: 0 & refetchOnMount: "always" ensures that any modifications
  // in CV Center (add/delete/rename) are immediately reflected upon navigating back to Candidate Dashboard.
  const resumesQuery = useQuery<Resume[], Error>({
    queryKey: CANDIDATE_DASHBOARD_QUERY_KEYS.resumes(userId),
    queryFn: async () => {
      return await resumeService.list();
    },
    enabled: isAuthed,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Candidate Profile query: verifies official CandidateProfile record from backend
  const profileQuery = useQuery<CandidateProfileState, Error>({
    queryKey: CANDIDATE_DASHBOARD_QUERY_KEYS.profile(userId),
    queryFn: async () => {
      return await getCandidateProfile();
    },
    enabled: isAuthed,
    staleTime: 1000 * 30,
    refetchOnMount: true,
  });

  const isInitialLoading =
    authStatus === "idle" ||
    authStatus === "loading" ||
    (isAuthed && (draftQuery.isLoading || resumesQuery.isLoading || profileQuery.isLoading));

  const isError = Boolean(draftQuery.isError || resumesQuery.isError);
  const errorMessage = draftQuery.error?.message || resumesQuery.error?.message || null;

  const dashboardData: CandidateDashboardData | null = useMemo(() => {
    if (!user) return null;

    const draft = draftQuery.data ?? null;
    const resumes = resumesQuery.data ?? [];
    const profileState: CandidateProfileState = profileQuery.data ?? {
      status: profileQuery.isLoading ? "loading" : "error",
      profile: null,
      errorMessage: profileQuery.error?.message ?? null,
    };

    const progress = calculateDashboardProgress(draft);
    const displayName = getCandidateDisplayName(
      user.fullName,
      draft?.data?.personal?.fullName,
      profileState.profile?.fullName,
    );

    return {
      user,
      draft,
      resumes,
      progress,
      displayName,
      profileState,
    };
  }, [user, draftQuery.data, resumesQuery.data, profileQuery.data, profileQuery.isLoading, profileQuery.error]);

  const refetch = async () => {
    await Promise.allSettled([
      draftQuery.refetch(),
      resumesQuery.refetch(),
      profileQuery.refetch(),
    ]);
  };

  return {
    data: dashboardData,
    isLoading: isInitialLoading,
    isError,
    errorMessage,
    isAuthenticated: isAuthed,
    refetch,
  };
}
