import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  INITIAL_ADVANCED_FILTERS,
} from "../../../constants/job-filter.constants";

import type {
  AdvancedFilters,
  UpdateAdvancedFilter,
} from "../../../types/job-filter.types";

interface UseAdvancedFilterDraftParams {
  isOpen: boolean;
  filters: AdvancedFilters;
}

const areFiltersEqual = (
  left: AdvancedFilters,
  right: AdvancedFilters,
) => {
  return (
    left.category === right.category &&
    left.type === right.type &&
    left.workplace === right.workplace &&
    left.experience === right.experience &&
    left.salaryMin === right.salaryMin
  );
};

const createFiltersCopy = (
  filters: AdvancedFilters,
): AdvancedFilters => ({
  ...filters,
});

export const useAdvancedFilterDraft = ({
  isOpen,
  filters,
}: UseAdvancedFilterDraftParams) => {
  const [
    draftFilters,
    setDraftFilters,
  ] = useState<AdvancedFilters>(
    () => createFiltersCopy(filters),
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraftFilters(
      createFiltersCopy(filters),
    );
  }, [
    isOpen,
    filters,
  ]);

  const updateDraftFilter:
    UpdateAdvancedFilter = (
      key,
      value,
    ) => {
      setDraftFilters(
        (current) => ({
          ...current,
          [key]: value,
        }),
      );
    };

  const resetDraftFilters = () => {
    setDraftFilters({
      ...INITIAL_ADVANCED_FILTERS,
    });
  };

  const isDirty = useMemo(
    () =>
      !areFiltersEqual(
        draftFilters,
        filters,
      ),
    [
      draftFilters,
      filters,
    ],
  );

  return {
    draftFilters,
    isDirty,
    updateDraftFilter,
    resetDraftFilters,
  };
};
