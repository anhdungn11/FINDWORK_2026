import type {
  CareerPreferences,
} from "@/features/candidate/types/onboarding.types";

import CareerAvailabilityField from "./components/CareerAvailabilityField";
import DesiredPositionsField from "./components/DesiredPositionsField";
import EmploymentPreferencesField from "./components/EmploymentPreferencesField";
import JobCategoriesField from "./components/JobCategoriesField";
import PreferredLocationsField from "./components/PreferredLocationsField";
import SalaryExpectationField from "./components/SalaryExpectationField";
import { useCareerPreferencesForm } from "./hooks/useCareerPreferencesForm";

import styles from "./styles/CareerPreferencesStep.module.css";

interface CareerPreferencesStepProps {
  value: CareerPreferences;
  onChange: (
    value: CareerPreferences,
  ) => void;
}

const CareerPreferencesStep = ({
  value,
  onChange,
}: CareerPreferencesStepProps) => {
  const form =
    useCareerPreferencesForm({
      value,
      onChange,
    });

  return (
    <div className={styles.wrapper}>
      <div className={styles.intro}>
        <div className={styles.introIcon}>
          ◎
        </div>

        <div>
          <strong>
            Định hướng này giúp FINDWORK hiểu công việc bạn muốn tìm.
          </strong>
          <p>
            Các lựa chọn là tín hiệu ưu tiên cho recommendation, không phải bộ lọc cứng khiến bạn bỏ lỡ những cơ hội phù hợp khác.
          </p>
        </div>
      </div>

      <DesiredPositionsField
        positions={value.desiredPositions}
        inputValue={form.positionInput}
        error={form.positionError}
        onInputChange={form.setPositionInput}
        onAdd={form.addDesiredPosition}
        onRemove={form.removeDesiredPosition}
      />

      <JobCategoriesField
        selectedCodes={
          value.preferredCategoryCodes
        }
        onAdd={form.addCategory}
        onRemove={form.removeCategory}
      />

      <PreferredLocationsField
        mode={value.locationPreference.mode}
        provinceCodes={
          value.locationPreference.provinceCodes
        }
        onNationwideChange={
          form.setNationwide
        }
        onAddProvince={form.addProvince}
        onRemoveProvince={
          form.removeProvince
        }
      />

      <EmploymentPreferencesField
        employmentTypes={value.employmentTypes}
        workplaceTypes={value.workplaceTypes}
        onEmploymentTypeToggle={
          form.toggleEmploymentType
        }
        onWorkplaceTypeToggle={
          form.toggleWorkplaceType
        }
      />

      <SalaryExpectationField
        value={value.salaryExpectation}
        onTypeChange={form.setSalaryType}
        onMinChange={form.setSalaryMin}
        onMaxChange={form.setSalaryMax}
      />

      <CareerAvailabilityField
        desiredCareerLevel={
          value.desiredCareerLevel
        }
        availability={value.availability}
        willingToRelocate={
          value.willingToRelocate
        }
        onCareerLevelChange={
          form.setCareerLevel
        }
        onAvailabilityTypeChange={
          form.setAvailabilityType
        }
        onAvailableFromChange={
          form.setAvailableFrom
        }
        onRelocationChange={
          form.setWillingToRelocate
        }
      />
    </div>
  );
};

export default CareerPreferencesStep;
