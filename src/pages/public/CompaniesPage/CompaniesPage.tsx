import { useState, useEffect, useCallback, useMemo } from "react";

import CompanyCard from "@/features/companies/components/CompanyCard/CompanyCard";
import { publicApi } from "@/services/api/publicApi";
import type { PublicCompanyDto, Paged } from "@/services/api/apiTypes";
import type { ApiFailure } from "@/services/api/apiFailure";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { LoadingBlock } from "@/components/ui";

import CompaniesHero from "./components/CompaniesHero";
import CompaniesResults from "./components/CompaniesResults";

import styles from "./styles/CompaniesPageLayout.module.css";

const PAGE_SIZE = 12;

const CompaniesPage = () => {
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [paged, setPaged] = useState<Paged<PublicCompanyDto> | null>(null);

  // Debounce search keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  const fetchData = useCallback(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    publicApi
      .listCompanies(
        {
          page,
          pageSize: PAGE_SIZE,
          q: debouncedKeyword.trim() || undefined,
          verifiedOnly: verifiedOnly ? true : undefined,
        },
        ctrl.signal,
      )
      .then((res) => {
        setPaged(res);
        setLoading(false);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setError(err);
        setLoading(false);
      });

    return () => ctrl.abort();
  }, [page, debouncedKeyword, verifiedOnly]);

  useEffect(() => {
    return fetchData();
  }, [fetchData]);

  const companiesList = paged?.data ?? [];

  // Client-side additional filters for industry and location if selected from current page dataset
  const displayCompanies = useMemo(() => {
    let list = companiesList;
    if (industry) {
      list = list.filter((c) => c.industry?.name === industry);
    }
    if (location) {
      list = list.filter(
        (c) =>
          c.headquarters?.province?.name === location ||
          c.headquarters?.countryCode === location,
      );
    }
    return list;
  }, [companiesList, industry, location]);

  const industryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of companiesList) {
      if (c.industry?.name) set.add(c.industry.name);
    }
    return Array.from(set);
  }, [companiesList]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of companiesList) {
      const loc = c.headquarters?.province?.name || c.headquarters?.countryCode;
      if (loc) set.add(loc);
    }
    return Array.from(set);
  }, [companiesList]);

  const totalJobs = useMemo(() => {
    return companiesList.reduce((acc, c) => acc + (c.jobsCount || 0), 0);
  }, [companiesList]);

  const hasFilters = Boolean(
    keyword.trim() || verifiedOnly || industry || location,
  );

  const handleClearFilters = () => {
    setKeyword("");
    setDebouncedKeyword("");
    setVerifiedOnly(false);
    setIndustry("");
    setLocation("");
    setPage(1);
  };

  return (
    <main className={styles.page}>
      <CompaniesHero
        keyword={keyword}
        industry={industry}
        location={location}
        industryOptions={industryOptions}
        locationOptions={locationOptions}
        companyCount={paged?.pagination.total ?? 0}
        totalJobs={totalJobs}
        verifiedOnly={verifiedOnly}
        onVerifiedOnlyChange={(val) => {
          setVerifiedOnly(val);
          setPage(1);
        }}
        onKeywordChange={(val) => setKeyword(val)}
        onIndustryChange={(val) => setIndustry(val)}
        onLocationChange={(val) => setLocation(val)}
      />

      {loading ? (
        <div className="container" style={{ padding: "48px 16px" }}>
          <LoadingBlock rows={6} label="Đang tải danh sách doanh nghiệp..." />
        </div>
      ) : error ? (
        <div className="container" style={{ padding: "48px 16px" }}>
          <ApiErrorState error={error} onRetry={fetchData} />
        </div>
      ) : (
        <CompaniesResults
          companies={displayCompanies}
          filteredCount={displayCompanies.length}
          totalCount={paged?.pagination.total ?? 0}
          hasFilters={hasFilters}
          onClearFilters={handleClearFilters}
          renderCompany={(company) => (
            <CompanyCard key={company.id} company={company} />
          )}
          pagination={
            paged
              ? {
                  page: paged.pagination.page,
                  totalPages: paged.pagination.totalPages,
                  onPageChange: (newPage) => setPage(newPage),
                }
              : undefined
          }
        />
      )}
    </main>
  );
};

export default CompaniesPage;
