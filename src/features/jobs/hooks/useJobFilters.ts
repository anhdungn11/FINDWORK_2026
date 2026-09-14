import {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  CURRENT_JOB_FILTER_VALUES,
  INITIAL_ADVANCED_FILTERS,
} from "../constants/job-filter.constants";

import type {
  AdvancedFilters,
  JobFilterRecord,
  JobSortOption,
  UpdateAdvancedFilter,
} from "../types/job-filter.types";

import {
  countActiveAdvancedFilters,
  filterJobs,
  getJobCategories,
  getJobExperiences,
  getJobLocations,
  getJobTypes,
  getJobWorkplaces,
  hasJobSearchCriteria,
} from "../utils/job-filter.utils";

import {
  sortJobs,
} from "../utils/job-sort.utils";

/**
 * Compatibility export cho component cũ chưa migrate import.
 * Consumer mới nên import trực tiếp từ ../types/job-filter.types.
 */
export type {
  AdvancedFilters,
} from "../types/job-filter.types";

interface UseJobFiltersResult<
  TJob extends JobFilterRecord,
> {
  keyword: string;
  location: string;
  sortBy: JobSortOption;

  advancedFilters: AdvancedFilters;

  locations: string[];
  categories: string[];
  jobTypes: string[];
  workplaces: string[];
  experiences: string[];

  filteredJobs: TJob[];

  isRemote: boolean;
  isFresher: boolean;
  isInternship: boolean;

  activeFilterCount: number;
  hasActiveFilters: boolean;
  hasSearchCriteria: boolean;

  setKeyword: (
    value: string,
  ) => void;

  setLocation: (
    value: string,
  ) => void;

  setSortBy: (
    value: JobSortOption,
  ) => void;

  updateAdvancedFilter:
    UpdateAdvancedFilter;

  applyAdvancedFilters: (
    filters: AdvancedFilters,
  ) => void;

  getAdvancedFilterResultCount: (
    filters: AdvancedFilters,
  ) => number;

  toggleRemote: () => void;
  toggleFresher: () => void;
  toggleInternship: () => void;

  clearAdvancedFilters: () => void;
  clearAllFilters: () => void;
}

const createInitialAdvancedFilters =
  (): AdvancedFilters => ({
    ...INITIAL_ADVANCED_FILTERS,
  });

export const useJobFilters = <
  TJob extends JobFilterRecord,
>(
  jobs: readonly TJob[],
): UseJobFiltersResult<TJob> => {
  const [
    keyword,
    setKeyword,
  ] = useState("");

  const [
    location,
    setLocation,
  ] = useState("");

  const [
    sortBy,
    setSortBy,
  ] =
    useState<JobSortOption>(
      "match",
    );

  const [
    advancedFilters,
    setAdvancedFilters,
  ] =
    useState<AdvancedFilters>(
      createInitialAdvancedFilters,
    );

  const locations = useMemo(
    () =>
      getJobLocations(jobs),
    [jobs],
  );

  const categories = useMemo(
    () =>
      getJobCategories(jobs),
    [jobs],
  );

  const jobTypes = useMemo(
    () =>
      getJobTypes(jobs),
    [jobs],
  );

  const workplaces = useMemo(
    () =>
      getJobWorkplaces(jobs),
    [jobs],
  );

  const experiences = useMemo(
    () =>
      getJobExperiences(jobs),
    [jobs],
  );

  const updateAdvancedFilter:
    UpdateAdvancedFilter = (
      key,
      value,
    ) => {
      setAdvancedFilters(
        (current) => ({
          ...current,
          [key]: value,
        }),
      );
    };

  const applyAdvancedFilters = (
    filters: AdvancedFilters,
  ) => {
    setAdvancedFilters({
      ...filters,
    });
  };

  const getAdvancedFilterResultCount =
    useCallback(
      (
        filters:
          AdvancedFilters,
      ) => {
        return filterJobs(
          jobs,
          {
            keyword,
            location,
            category:
              filters.category,
            type:
              filters.type,
            workplace:
              filters.workplace,
            experience:
              filters.experience,
            salaryMin:
              filters.salaryMin,
          },
        ).length;
      },
      [
        jobs,
        keyword,
        location,
      ],
    );

  const isRemote =
    advancedFilters.workplace ===
    CURRENT_JOB_FILTER_VALUES.remoteWorkplace;

  const isFresher =
    advancedFilters.experience
      .toLowerCase()
      .includes(
        CURRENT_JOB_FILTER_VALUES.fresherExperience
          .toLowerCase(),
      );

  const isInternship =
    advancedFilters.type
      .toLowerCase() ===
    CURRENT_JOB_FILTER_VALUES.internshipType
      .toLowerCase();

  const toggleRemote = () => {
    updateAdvancedFilter(
      "workplace",
      isRemote
        ? ""
        : CURRENT_JOB_FILTER_VALUES.remoteWorkplace,
    );
  };

  const toggleFresher = () => {
    updateAdvancedFilter(
      "experience",
      isFresher
        ? ""
        : CURRENT_JOB_FILTER_VALUES.fresherExperience,
    );
  };

  const toggleInternship = () => {
    updateAdvancedFilter(
      "type",
      isInternship
        ? ""
        : CURRENT_JOB_FILTER_VALUES.internshipType,
    );
  };

  const clearAdvancedFilters =
    () => {
      setAdvancedFilters(
        createInitialAdvancedFilters(),
      );
    };

  const clearAllFilters = () => {
    setKeyword("");
    setLocation("");
    setAdvancedFilters(
      createInitialAdvancedFilters(),
    );
  };

  const activeFilterCount =
    countActiveAdvancedFilters(
      advancedFilters,
    );

  const hasActiveFilters =
    activeFilterCount > 0;

  const hasSearchCriteria =
    hasJobSearchCriteria(
      keyword,
      location,
      advancedFilters,
    );

  const filteredJobs = useMemo(
    () => {
      const result =
        filterJobs(jobs, {
          keyword,
          location,

          category:
            advancedFilters.category,

          type:
            advancedFilters.type,

          workplace:
            advancedFilters.workplace,

          experience:
            advancedFilters.experience,

          salaryMin:
            advancedFilters.salaryMin,
        });

      return sortJobs(
        result,
        sortBy,
      );
    },
    [
      jobs,
      keyword,
      location,
      advancedFilters,
      sortBy,
    ],
  );

  return {
    keyword,
    location,
    sortBy,

    advancedFilters,

    locations,
    categories,
    jobTypes,
    workplaces,
    experiences,

    filteredJobs,

    isRemote,
    isFresher,
    isInternship,

    activeFilterCount,
    hasActiveFilters,
    hasSearchCriteria,

    setKeyword,
    setLocation,
    setSortBy,

    updateAdvancedFilter,
    applyAdvancedFilters,
    getAdvancedFilterResultCount,

    toggleRemote,
    toggleFresher,
    toggleInternship,

    clearAdvancedFilters,
    clearAllFilters,
  };
};
