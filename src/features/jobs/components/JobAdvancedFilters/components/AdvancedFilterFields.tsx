import type {
  AdvancedFilters,
  UpdateAdvancedFilter,
} from "../../../types/job-filter.types";

import JobFilterSelect from "./JobFilterSelect";
import SalaryFilterField from "./SalaryFilterField";

import styles from "../styles/AdvancedFilterFields.module.css";

interface AdvancedFilterFieldsProps {
  filters: AdvancedFilters;

  categories: string[];
  jobTypes: string[];
  workplaces: string[];
  experiences: string[];

  onUpdate: UpdateAdvancedFilter;
}

const AdvancedFilterFields = ({
  filters,
  categories,
  jobTypes,
  workplaces,
  experiences,
  onUpdate,
}: AdvancedFilterFieldsProps) => {
  return (
    <div className={styles.filterGrid}>
      <JobFilterSelect
        label="Ngành nghề"
        value={filters.category}
        placeholder="Tất cả ngành nghề"
        options={categories}
        onChange={(value) =>
          onUpdate(
            "category",
            value,
          )
        }
      />

      <JobFilterSelect
        label="Loại công việc"
        value={filters.type}
        placeholder="Tất cả loại việc"
        options={jobTypes}
        onChange={(value) =>
          onUpdate(
            "type",
            value,
          )
        }
      />

      <JobFilterSelect
        label="Hình thức làm việc"
        value={filters.workplace}
        placeholder="Tất cả hình thức"
        options={workplaces}
        onChange={(value) =>
          onUpdate(
            "workplace",
            value,
          )
        }
      />

      <JobFilterSelect
        label="Kinh nghiệm"
        value={filters.experience}
        placeholder="Tất cả kinh nghiệm"
        options={experiences}
        onChange={(value) =>
          onUpdate(
            "experience",
            value,
          )
        }
      />

      <SalaryFilterField
        value={filters.salaryMin}
        onChange={(value) =>
          onUpdate(
            "salaryMin",
            value,
          )
        }
      />
    </div>
  );
};

export default AdvancedFilterFields;
