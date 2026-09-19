import type {
  CareerPreferences,
} from "@/features/candidate/types/onboarding.types";

import { useCareerPreferenceConditions } from "./useCareerPreferenceConditions";
import { useCareerPreferenceTargets } from "./useCareerPreferenceTargets";

interface UseCareerPreferencesFormOptions {
  value: CareerPreferences;
  onChange: (
    value: CareerPreferences,
  ) => void;
}

export const useCareerPreferencesForm = (
  options: UseCareerPreferencesFormOptions,
) => {
  const targets =
    useCareerPreferenceTargets(options);

  const conditions =
    useCareerPreferenceConditions(options);

  return {
    ...targets,
    ...conditions,
  };
};
