import type { Job } from "@/data/mock/jobs.mock";

export type JobSortOption =
  | "match"
  | "latest"
  | "salary";

export interface JobFilterOptions {
  keyword: string;
  location: string;

  category: string;
  type: string;
  workplace: string;
  experience: string;

  salaryMin: number;
}

const normalizeText = (
  value: string,
) => {
  return value
    .trim()
    .toLowerCase();
};

export const getPostedAge = (
  postedAt: string,
) => {
  const value =
    normalizeText(postedAt);

  if (value.includes("giờ")) {
    return Number(
      value.match(/\d+/)?.[0] ?? 0,
    );
  }

  if (value.includes("hôm nay")) {
    return 12;
  }

  if (value.includes("ngày")) {
    const days = Number(
      value.match(/\d+/)?.[0] ?? 0,
    );

    return days * 24;
  }

  return Number.MAX_SAFE_INTEGER;
};

export const getSalaryValue = (
  salary: string,
) => {
  const value =
    salary.match(/\d+/);

  return value
    ? Number(value[0])
    : 0;
};

const matchesKeyword = (
  job: Job,
  keyword: string,
) => {
  const normalizedKeyword =
    normalizeText(keyword);

  if (!normalizedKeyword) {
    return true;
  }

  return (
    normalizeText(job.title).includes(
      normalizedKeyword,
    ) ||
    normalizeText(job.company).includes(
      normalizedKeyword,
    ) ||
    normalizeText(job.category).includes(
      normalizedKeyword,
    ) ||
    job.skills.some((skill) =>
      normalizeText(skill).includes(
        normalizedKeyword,
      ),
    )
  );
};

const matchesLocation = (
  job: Job,
  location: string,
) => {
  if (!location) {
    return true;
  }

  return job.location === location;
};

const matchesCategory = (
  job: Job,
  category: string,
) => {
  if (!category) {
    return true;
  }

  return job.category === category;
};

const matchesType = (
  job: Job,
  type: string,
) => {
  if (!type) {
    return true;
  }

  return job.type === type;
};

const matchesWorkplace = (
  job: Job,
  workplace: string,
) => {
  if (!workplace) {
    return true;
  }

  return job.workplace === workplace;
};

const matchesExperience = (
  job: Job,
  experience: string,
) => {
  if (!experience) {
    return true;
  }

  return job.experience === experience;
};

const matchesSalary = (
  job: Job,
  salaryMin: number,
) => {
  if (salaryMin <= 0) {
    return true;
  }

  return (
    getSalaryValue(job.salary) >=
    salaryMin
  );
};

export const filterJobs = (
  jobs: Job[],
  filters: JobFilterOptions,
) => {
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

export const sortJobs = (
  jobs: Job[],
  sortBy: JobSortOption,
) => {
  const sortedJobs = [...jobs];

  switch (sortBy) {
    case "latest":
      return sortedJobs.sort(
        (a, b) =>
          getPostedAge(
            a.postedAt,
          ) -
          getPostedAge(
            b.postedAt,
          ),
      );

    case "salary":
      return sortedJobs.sort(
        (a, b) =>
          getSalaryValue(
            b.salary,
          ) -
          getSalaryValue(
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

export const getJobLocations = (
  jobs: Job[],
) => {
  return Array.from(
    new Set(
      jobs.map(
        (job) => job.location,
      ),
    ),
  );
};

export const getJobCategories = (
  jobs: Job[],
) => {
  return Array.from(
    new Set(
      jobs.map(
        (job) => job.category,
      ),
    ),
  );
};

export const getJobTypes = (
  jobs: Job[],
) => {
  return Array.from(
    new Set(
      jobs.map(
        (job) => job.type,
      ),
    ),
  );
};

export const getJobWorkplaces = (
  jobs: Job[],
) => {
  return Array.from(
    new Set(
      jobs.map(
        (job) => job.workplace,
      ),
    ),
  );
};

export const getJobExperiences = (
  jobs: Job[],
) => {
  return Array.from(
    new Set(
      jobs.map(
        (job) => job.experience,
      ),
    ),
  );
};