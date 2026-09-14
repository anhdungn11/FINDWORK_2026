import type {
  CompanyFilterOptions,
  CompanyFilterRecord,
} from "../types/company-filter.types";

export const normalizeCompanySearchText = (
  value: string,
) => {
  return value
    .trim()
    .toLowerCase();
};

export const filterCompanies = <
  TCompany extends CompanyFilterRecord,
>(
  companies: readonly TCompany[],
  filters: CompanyFilterOptions,
): TCompany[] => {
  const normalizedKeyword =
    normalizeCompanySearchText(
      filters.keyword,
    );

  return companies.filter(
    (company) => {
      const matchesKeyword =
        !normalizedKeyword ||
        normalizeCompanySearchText(
          company.name,
        ).includes(
          normalizedKeyword,
        ) ||
        normalizeCompanySearchText(
          company.industry,
        ).includes(
          normalizedKeyword,
        );

      const matchesIndustry =
        !filters.industry ||
        company.industry ===
          filters.industry;

      const matchesLocation =
        !filters.location ||
        company.location ===
          filters.location;

      return (
        matchesKeyword &&
        matchesIndustry &&
        matchesLocation
      );
    },
  );
};

const getUniqueSortedValues = (
  values: readonly string[],
) => {
  return Array.from(
    new Set(values),
  ).sort((left, right) =>
    left.localeCompare(
      right,
      "vi",
    ),
  );
};

export const getCompanyIndustries = <
  TCompany extends CompanyFilterRecord,
>(
  companies: readonly TCompany[],
) => {
  return getUniqueSortedValues(
    companies.map(
      (company) =>
        company.industry,
    ),
  );
};

export const getCompanyLocations = <
  TCompany extends CompanyFilterRecord,
>(
  companies: readonly TCompany[],
) => {
  return getUniqueSortedValues(
    companies.map(
      (company) =>
        company.location,
    ),
  );
};

export const getTotalCompanyJobs = <
  TCompany extends CompanyFilterRecord,
>(
  companies: readonly TCompany[],
) => {
  return companies.reduce(
    (total, company) =>
      total + company.jobsCount,
    0,
  );
};

export const hasCompanyFilters = (
  filters: CompanyFilterOptions,
) => {
  return Boolean(
    filters.keyword.trim() ||
      filters.industry ||
      filters.location,
  );
};
