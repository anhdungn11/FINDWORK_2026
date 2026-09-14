import {
  useState,
} from "react";

import {
  jobs,
} from "@/data/mock/jobs.mock";

import JobActiveFilters from "@/features/jobs/components/JobActiveFilters/JobActiveFilters";
import JobAdvancedFilters from "@/features/jobs/components/JobAdvancedFilters/JobAdvancedFilters";
import JobDiscoveryCard from "@/features/jobs/components/JobDiscoveryCard/JobDiscoveryCard";
import JobQuickFilters from "@/features/jobs/components/JobQuickFilters/JobQuickFilters";
import JobSearchBar from "@/features/jobs/components/JobSearchBar/JobSearchBar";

import {
  useJobFilters,
} from "@/features/jobs/hooks/useJobFilters";

import JobsHero from "./components/JobsHero";
import JobsResults from "./components/JobsResults";
import JobsResultsSection from "./components/JobsResultsSection";
import JobsSidebar from "./components/JobsSidebar";

import styles from "./styles/JobsPageLayout.module.css";

const JobsPage = () => {
  const [
    isFilterPanelOpen,
    setIsFilterPanelOpen,
  ] = useState(false);

  const jobFilters =
    useJobFilters(jobs);

  const {
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
    applyAdvancedFilters,
    getAdvancedFilterResultCount,

    toggleRemote,
    toggleFresher,
    toggleInternship,

    clearAdvancedFilters,
  } = jobFilters;

  return (
    <div className={styles.page}>
      <JobsHero
        searchContent={
          <JobSearchBar
            keyword={keyword}
            location={location}
            locations={locations}
            onKeywordChange={
              setKeyword
            }
            onLocationChange={
              setLocation
            }
          />
        }
        filterContent={
          <>
            <JobQuickFilters
              sortBy={sortBy}
              isRemote={isRemote}
              isFresher={isFresher}
              isInternship={
                isInternship
              }
              isFilterPanelOpen={
                isFilterPanelOpen
              }
              activeFilterCount={
                activeFilterCount
              }
              onSortChange={
                setSortBy
              }
              onToggleRemote={
                toggleRemote
              }
              onToggleFresher={
                toggleFresher
              }
              onToggleInternship={
                toggleInternship
              }
              onToggleFilterPanel={() =>
                setIsFilterPanelOpen(
                  (current) =>
                    !current,
                )
              }
            />

            <JobAdvancedFilters
              isOpen={
                isFilterPanelOpen
              }
              filters={
                advancedFilters
              }
              categories={categories}
              jobTypes={jobTypes}
              workplaces={
                workplaces
              }
              experiences={
                experiences
              }
              getResultCount={
                getAdvancedFilterResultCount
              }
              onClose={() =>
                setIsFilterPanelOpen(
                  false,
                )
              }
              onApply={
                applyAdvancedFilters
              }
            />

            <JobActiveFilters
              keyword={keyword}
              location={location}
              filters={
                advancedFilters
              }
              onKeywordChange={
                setKeyword
              }
              onLocationChange={
                setLocation
              }
              onUpdateFilter={
                updateAdvancedFilter
              }
              onClearAdvancedFilters={
                clearAdvancedFilters
              }
            />
          </>
        }
      />

      <JobsResultsSection
        resultsContent={
          <JobsResults
            jobs={filteredJobs}
            sortBy={sortBy}
            hasActiveFilters={
              hasActiveFilters
            }
            onSortChange={
              setSortBy
            }
            onClearAdvancedFilters={
              clearAdvancedFilters
            }
            renderJob={(job) => (
              <JobDiscoveryCard
                key={job.id}
                job={job}
              />
            )}
          />
        }
        sidebarContent={
          <JobsSidebar />
        }
      />
    </div>
  );
};

export default JobsPage;
