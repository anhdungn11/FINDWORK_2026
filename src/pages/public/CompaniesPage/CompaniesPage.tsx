import {
  companies,
} from "@/data/mock/companies.mock";

import CompanyCard from "@/features/companies/components/CompanyCard/CompanyCard";

import {
  useCompanyFilters,
} from "@/features/companies/hooks/useCompanyFilters";

import CompaniesHero from "./components/CompaniesHero";
import CompaniesResults from "./components/CompaniesResults";

import styles from "./styles/CompaniesPageLayout.module.css";

const CompaniesPage = () => {
  const {
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
  } = useCompanyFilters(
    companies,
  );

  return (
    <main className={styles.page}>
      <CompaniesHero
        keyword={keyword}
        industry={industry}
        location={location}
        industryOptions={
          industryOptions
        }
        locationOptions={
          locationOptions
        }
        companyCount={
          companies.length
        }
        totalJobs={totalJobs}
        onKeywordChange={
          setKeyword
        }
        onIndustryChange={
          setIndustry
        }
        onLocationChange={
          setLocation
        }
      />

      <CompaniesResults
        companies={
          filteredCompanies
        }
        filteredCount={
          filteredCompanies.length
        }
        totalCount={
          companies.length
        }
        hasFilters={hasFilters}
        onClearFilters={
          clearFilters
        }
        renderCompany={(company) => (
          <CompanyCard
            key={company.id}
            company={company}
          />
        )}
      />
    </main>
  );
};

export default CompaniesPage;
