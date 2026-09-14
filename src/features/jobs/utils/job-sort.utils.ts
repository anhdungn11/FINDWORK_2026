import type {
  JobFilterRecord,
  JobSortOption,
} from "../types/job-filter.types";

import {
  getLegacyPostedAgeHours,
  getLegacySalaryValue,
} from "./job-legacy-value.utils";

export const sortJobs = <
  TJob extends JobFilterRecord,
>(
  jobs: readonly TJob[],
  sortBy: JobSortOption,
): TJob[] => {
  const sortedJobs = [...jobs];

  switch (sortBy) {
    case "latest":
      return sortedJobs.sort(
        (a, b) =>
          getLegacyPostedAgeHours(
            a.postedAt,
          ) -
          getLegacyPostedAgeHours(
            b.postedAt,
          ),
      );

    case "salary":
      return sortedJobs.sort(
        (a, b) =>
          getLegacySalaryValue(
            b.salary,
          ) -
          getLegacySalaryValue(
            a.salary,
          ),
      );

    case "match":
    default:
      return sortedJobs.sort(
        (a, b) =>
          b.matchScore -
          a.matchScore,
      );
  }
};
