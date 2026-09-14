import {
  countActiveAdvancedFilters,
} from "../../utils/job-filter.utils";

import type {
  AdvancedFilters,
} from "../../types/job-filter.types";

import AdvancedFilterFields from "./components/AdvancedFilterFields";
import AdvancedFilterFooter from "./components/AdvancedFilterFooter";
import AdvancedFilterHeader from "./components/AdvancedFilterHeader";

import {
  useAdvancedFilterDraft,
} from "./hooks/useAdvancedFilterDraft";

import styles from "./styles/AdvancedFilterPanel.module.css";

interface JobAdvancedFiltersProps {
  isOpen: boolean;
  filters: AdvancedFilters;

  categories: string[];
  jobTypes: string[];
  workplaces: string[];
  experiences: string[];

  getResultCount: (
    filters: AdvancedFilters,
  ) => number;

  onClose: () => void;

  onApply: (
    filters: AdvancedFilters,
  ) => void;
}

const JobAdvancedFilters = ({
  isOpen,
  filters,
  categories,
  jobTypes,
  workplaces,
  experiences,
  getResultCount,
  onClose,
  onApply,
}: JobAdvancedFiltersProps) => {
  const {
    draftFilters,
    isDirty,
    updateDraftFilter,
    resetDraftFilters,
  } = useAdvancedFilterDraft({
    isOpen,
    filters,
  });

  if (!isOpen) {
    return null;
  }

  const resultCount =
    getResultCount(
      draftFilters,
    );

  const hasDraftFilters =
    countActiveAdvancedFilters(
      draftFilters,
    ) > 0;

  const handleApply = () => {
    onApply(draftFilters);
    onClose();
  };

  return (
    <div className={styles.filterPanel}>
      <AdvancedFilterHeader
        onClose={onClose}
      />

      <AdvancedFilterFields
        filters={draftFilters}
        categories={categories}
        jobTypes={jobTypes}
        workplaces={workplaces}
        experiences={experiences}
        onUpdate={updateDraftFilter}
      />

      <AdvancedFilterFooter
        resultCount={resultCount}
        hasDraftFilters={
          hasDraftFilters
        }
        isDirty={isDirty}
        onReset={
          resetDraftFilters
        }
        onApply={handleApply}
      />
    </div>
  );
};

export default JobAdvancedFilters;
