import {
  useMemo,
  useState,
} from "react";

import type { Job } from "@/data/mock/jobs.mock";

import {
  filterJobs,
  getJobCategories,
  getJobExperiences,
  getJobLocations,
  getJobTypes,
  getJobWorkplaces,
  sortJobs,
  type JobSortOption,
} from "../utils/job-filter.utils";

export interface AdvancedFilters {
  category: string;
  type: string;
  workplace: string;
  experience: string;
  salaryMin: number;
}

const initialAdvancedFilters: AdvancedFilters =
  {
    category: "",
    type: "",
    workplace: "",
    experience: "",
    salaryMin: 0,
  };

interface UseJobFiltersResult {
  keyword: string;
  location: string;
  sortBy: JobSortOption;

  advancedFilters: AdvancedFilters;

  locations: string[];
  categories: string[];
  jobTypes: string[];
  workplaces: string[];
  experiences: string[];

  filteredJobs: Job[];

  isRemote: boolean;
  isFresher: boolean;
  isInternship: boolean;

  activeFilterCount: number;
  hasActiveFilters: boolean;

  setKeyword: (
    value: string,
  ) => void;

  setLocation: (
    value: string,
  ) => void;

  setSortBy: (
    value: JobSortOption,
  ) => void;

  updateAdvancedFilter: <
    Key extends keyof AdvancedFilters,
  >(
    key: Key,
    value: AdvancedFilters[Key],
  ) => void;

  toggleRemote: () => void;
  toggleFresher: () => void;
  toggleInternship: () => void;

  clearAdvancedFilters: () => void;
}

export const useJobFilters = (
  jobs: Job[],
): UseJobFiltersResult => {
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
      initialAdvancedFilters,
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

  const updateAdvancedFilter = <
    Key extends keyof AdvancedFilters,
  >(
    key: Key,
    value: AdvancedFilters[Key],
  ) => {
    setAdvancedFilters(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  };

  const isRemote =
    advancedFilters.workplace ===
    "Remote";

  const isFresher =
    advancedFilters.experience
      .toLowerCase()
      .includes(
        "không yêu cầu",
      );

  const isInternship =
    advancedFilters.type
      .toLowerCase() ===
    "internship";

  const toggleRemote = () => {
    updateAdvancedFilter(
      "workplace",
      isRemote ? "" : "Remote",
    );
  };

  const toggleFresher = () => {
    updateAdvancedFilter(
      "experience",
      isFresher
        ? ""
        : "Không yêu cầu",
    );
  };

  const toggleInternship = () => {
    updateAdvancedFilter(
      "type",
      isInternship
        ? ""
        : "Internship",
    );
  };

  const clearAdvancedFilters =
    () => {
      setAdvancedFilters(
        initialAdvancedFilters,
      );
    };

  const activeFilterCount =
    Number(
      Boolean(
        advancedFilters.category,
      ),
    ) +
    Number(
      Boolean(
        advancedFilters.type,
      ),
    ) +
    Number(
      Boolean(
        advancedFilters.workplace,
      ),
    ) +
    Number(
      Boolean(
        advancedFilters.experience,
      ),
    ) +
    Number(
      advancedFilters.salaryMin >
        0,
    );

  const hasActiveFilters =
    activeFilterCount > 0;

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

    setKeyword,
    setLocation,
    setSortBy,

    updateAdvancedFilter,

    toggleRemote,
    toggleFresher,
    toggleInternship,

    clearAdvancedFilters,
  };
};