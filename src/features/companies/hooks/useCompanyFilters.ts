import {
  useMemo,
  useState,
} from "react";

import type {
  CompanyFilterRecord,
} from "../types/company-filter.types";

import {
  filterCompanies,
  getCompanyIndustries,
  getCompanyLocations,
  getTotalCompanyJobs,
  hasCompanyFilters,
} from "../utils/company-filter.utils";

export const useCompanyFilters = <
  TCompany extends CompanyFilterRecord,
>(
  companies: readonly TCompany[],
) => {
  const [
    keyword,
    setKeyword,
  ] = useState("");

  const [
    industry,
    setIndustry,
  ] = useState("");

  const [
    location,
    setLocation,
  ] = useState("");

  const industryOptions =
    useMemo(
      () =>
        getCompanyIndustries(
          companies,
        ),
      [companies],
    );

  const locationOptions =
    useMemo(
      () =>
        getCompanyLocations(
          companies,
        ),
      [companies],
    );

  const filteredCompanies =
    useMemo(
      () =>
        filterCompanies(
          companies,
          {
            keyword,
            industry,
            location,
          },
        ),
      [
        companies,
        keyword,
        industry,
        location,
      ],
    );

  const totalJobs = useMemo(
    () =>
      getTotalCompanyJobs(
        companies,
      ),
    [companies],
  );

  const hasFilters =
    hasCompanyFilters({
      keyword,
      industry,
      location,
    });

  const clearFilters = () => {
    setKeyword("");
    setIndustry("");
    setLocation("");
  };

  return {
    keyword,
    industry,
    location,

    industryOptions,
    locationOptions,

    filteredCompanies,
    totalJobs,
    hasFilters,

    setKeyword,
    setIndustry,
    setLocation,

    clearFilters,
  };
};
