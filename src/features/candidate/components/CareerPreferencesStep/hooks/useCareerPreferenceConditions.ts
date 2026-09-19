import type {
  CareerLevel,
  CareerPreferences,
  PreferredEmploymentType,
  PreferredWorkplaceType,
  SalaryExpectationType,
} from "@/features/candidate/types/onboarding.types";

interface UseCareerPreferenceConditionsOptions {
  value: CareerPreferences;
  onChange: (
    value: CareerPreferences,
  ) => void;
}

export const useCareerPreferenceConditions = ({
  value,
  onChange,
}: UseCareerPreferenceConditionsOptions) => {
  const update = (
    patch: Partial<CareerPreferences>,
  ) => {
    onChange({
      ...value,
      ...patch,
    });
  };

  const toggleEmploymentType = (
    employmentType: PreferredEmploymentType,
  ) => {
    const selected =
      value.employmentTypes.includes(
        employmentType,
      );

    update({
      employmentTypes: selected
        ? value.employmentTypes.filter(
            (current) =>
              current !== employmentType,
          )
        : [
            ...value.employmentTypes,
            employmentType,
          ],
    });
  };

  const toggleWorkplaceType = (
    workplaceType: PreferredWorkplaceType,
  ) => {
    const selected =
      value.workplaceTypes.includes(
        workplaceType,
      );

    update({
      workplaceTypes: selected
        ? value.workplaceTypes.filter(
            (current) =>
              current !== workplaceType,
          )
        : [
            ...value.workplaceTypes,
            workplaceType,
          ],
    });
  };

  const setSalaryType = (
    type: SalaryExpectationType,
  ) => {
    update({
      salaryExpectation: {
        ...value.salaryExpectation,
        type,
        min:
          type === "range"
            ? value.salaryExpectation.min
            : null,
        max:
          type === "range"
            ? value.salaryExpectation.max
            : null,
      },
    });
  };

  const setSalaryMin = (
    min: number | null,
  ) => {
    update({
      salaryExpectation: {
        ...value.salaryExpectation,
        min,
      },
    });
  };

  const setSalaryMax = (
    max: number | null,
  ) => {
    update({
      salaryExpectation: {
        ...value.salaryExpectation,
        max,
      },
    });
  };

  const setCareerLevel = (
    desiredCareerLevel: CareerLevel,
  ) => {
    update({
      desiredCareerLevel,
    });
  };

  const setAvailabilityType = (
    type: CareerPreferences["availability"]["type"],
  ) => {
    update({
      availability: {
        type,
        availableFrom:
          type === "specific-date"
            ? value.availability.availableFrom
            : "",
      },
    });
  };

  const setAvailableFrom = (
    availableFrom: string,
  ) => {
    update({
      availability: {
        type: "specific-date",
        availableFrom,
      },
    });
  };

  const setWillingToRelocate = (
    willingToRelocate: boolean,
  ) => {
    update({
      willingToRelocate,
    });
  };

  return {
    toggleEmploymentType,
    toggleWorkplaceType,
    setSalaryType,
    setSalaryMin,
    setSalaryMax,
    setCareerLevel,
    setAvailabilityType,
    setAvailableFrom,
    setWillingToRelocate,
  };
};
