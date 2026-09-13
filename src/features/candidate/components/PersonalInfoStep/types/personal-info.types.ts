import type {
  PersonalInfo,
} from "@/features/candidate/types/onboarding.types";

export interface PersonalInfoStepProps {
  value: PersonalInfo;
  onChange: (value: PersonalInfo) => void;
}

export type UpdatePersonalInfoField = <
  Key extends keyof PersonalInfo,
>(
  key: Key,
  fieldValue: PersonalInfo[Key],
) => void;
