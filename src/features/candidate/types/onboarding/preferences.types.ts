import type {
  EmploymentType,
  WorkplaceType,
} from "./experience.types";

export type PreferredEmploymentType = Exclude<
  EmploymentType,
  ""
>;

export type PreferredWorkplaceType = Exclude<
  WorkplaceType,
  ""
>;

export type CareerLevel =
  | ""
  | "intern"
  | "fresher"
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "manager";

export type LocationPreferenceMode =
  | "selected"
  | "nationwide";

export type SalaryExpectationType =
  | "range"
  | "negotiable"
  | "not-important";

export type AvailabilityType =
  | ""
  | "immediately"
  | "specific-date";

export interface CareerPreferences {
  desiredPositions: string[];
  preferredCategoryCodes: string[];

  locationPreference: {
    mode: LocationPreferenceMode;
    provinceCodes: string[];
  };

  employmentTypes: PreferredEmploymentType[];
  workplaceTypes: PreferredWorkplaceType[];

  salaryExpectation: {
    type: SalaryExpectationType;
    min: number | null;
    max: number | null;
    currency: "VND";
    period: "month";
  };

  desiredCareerLevel: CareerLevel;

  availability: {
    type: AvailabilityType;
    availableFrom: string;
  };

  willingToRelocate: boolean;
}
