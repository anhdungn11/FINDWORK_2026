import type {
  AdvancedFilters,
  JobFilterOptions,
  JobFilterRecord,
  JobSortOption,
} from "../types/job-filter.types";

import {
  getLegacySalaryValue,
  normalizeLegacyJobText,
} from "./job-legacy-value.utils";

const matchesKeyword = (
  job: JobFilterRecord,
  keyword: string,
) => {
  const normalizedKeyword =
    normalizeLegacyJobText(
      keyword,
    );

  if (!normalizedKeyword) {
    return true;
  }

  return (
    normalizeLegacyJobText(
      job.title,
    ).includes(
      normalizedKeyword,
    ) ||
    normalizeLegacyJobText(
      job.company,
    ).includes(
      normalizedKeyword,
    ) ||
    normalizeLegacyJobText(
      job.category,
    ).includes(
      normalizedKeyword,
    ) ||
    job.skills.some((skill) =>
      normalizeLegacyJobText(
        skill,
      ).includes(
        normalizedKeyword,
      ),
    )
  );
};

const matchesLocation = (
  job: JobFilterRecord,
  location: string,
) => {
  if (!location) {
    return true;
  }

  return job.location === location;
};

const matchesCategory = (
  job: JobFilterRecord,
  category: string,
) => {
  if (!category) {
    return true;
  }

  return job.category === category;
};

const matchesType = (
  job: JobFilterRecord,
  type: string,
) => {
  if (!type) {
    return true;
  }

  return job.type === type;
};

const matchesWorkplace = (
  job: JobFilterRecord,
  workplace: string,
) => {
  if (!workplace) {
    return true;
  }

  return job.workplace === workplace;
};

const matchesExperience = (
  job: JobFilterRecord,
  experience: string,
) => {
  if (!experience) {
    return true;
  }

  return job.experience === experience;
};

const matchesSalary = (
  job: JobFilterRecord,
  salaryMin: number,
) => {
  if (salaryMin <= 0) {
    return true;
  }

  return (
    getLegacySalaryValue(
      job.salary,
    ) >= salaryMin
  );
};

export const filterJobs = <
  TJob extends JobFilterRecord,
>(
  jobs: readonly TJob[],
  filters: JobFilterOptions,
): TJob[] => {
  return jobs.filter((job) => {
    return (
      matchesKeyword(
        job,
        filters.keyword,
      ) &&
      matchesLocation(
        job,
        filters.location,
      ) &&
      matchesCategory(
        job,
        filters.category,
      ) &&
      matchesType(
        job,
        filters.type,
      ) &&
      matchesWorkplace(
        job,
        filters.workplace,
      ) &&
      matchesExperience(
        job,
        filters.experience,
      ) &&
      matchesSalary(
        job,
        filters.salaryMin,
      )
    );
  });
};

const getUniqueValues = <
  TJob extends JobFilterRecord,
>(
  jobs: readonly TJob[],
  selectValue: (
    job: TJob,
  ) => string,
) => {
  return Array.from(
    new Set(
      jobs.map(selectValue),
    ),
  );
};

export const getJobLocations = <
  TJob extends JobFilterRecord,
>(
  jobs: readonly TJob[],
) => {
  return getUniqueValues(
    jobs,
    (job) => job.location,
  );
};

export const getJobCategories = <
  TJob extends JobFilterRecord,
>(
  jobs: readonly TJob[],
) => {
  return getUniqueValues(
    jobs,
    (job) => job.category,
  );
};

export const getJobTypes = <
  TJob extends JobFilterRecord,
>(
  jobs: readonly TJob[],
) => {
  return getUniqueValues(
    jobs,
    (job) => job.type,
  );
};

export const getJobWorkplaces = <
  TJob extends JobFilterRecord,
>(
  jobs: readonly TJob[],
) => {
  return getUniqueValues(
    jobs,
    (job) => job.workplace,
  );
};

export const getJobExperiences = <
  TJob extends JobFilterRecord,
>(
  jobs: readonly TJob[],
) => {
  return getUniqueValues(
    jobs,
    (job) => job.experience,
  );
};

export const countActiveAdvancedFilters = (
  filters: AdvancedFilters,
) => {
  return (
    Number(
      Boolean(
        filters.category,
      ),
    ) +
    Number(
      Boolean(
        filters.type,
      ),
    ) +
    Number(
      Boolean(
        filters.workplace,
      ),
    ) +
    Number(
      Boolean(
        filters.experience,
      ),
    ) +
    Number(
      filters.salaryMin > 0,
    )
  );
};

export const hasJobSearchCriteria = (
  keyword: string,
  location: string,
  filters: AdvancedFilters,
) => {
  return (
    Boolean(keyword.trim()) ||
    Boolean(location) ||
    countActiveAdvancedFilters(
      filters,
    ) > 0
  );
};

/**
 * Compatibility exports để consumer cũ vẫn build được trong batch 1.
 */
export type {
  JobSortOption,
};

export {
  getLegacyPostedAgeHours as getPostedAge,
  getLegacySalaryValue as getSalaryValue,
} from "./job-legacy-value.utils";

export {
  sortJobs,
} from "./job-sort.utils";
