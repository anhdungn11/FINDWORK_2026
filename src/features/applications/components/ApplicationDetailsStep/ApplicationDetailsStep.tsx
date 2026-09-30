import type {
  ApplicationContactInfo,
  ApplicationDetailsErrors,
  ApplicationDetailsForm,
} from "@/features/applications/types/application.types";

import type {
  Resume,
} from "@/features/resume/types/resume.types";

import ApplicationDetailsActions from "./components/ApplicationDetailsActions";
import ApplicationDetailsNotice from "./components/ApplicationDetailsNotice";
import AvailabilitySection from "./components/AvailabilitySection";
import ContactInformationSection from "./components/ContactInformationSection";
import CoverLetterSection from "./components/CoverLetterSection";
import PreferredContactSection from "./components/PreferredContactSection";
import SelectedResumeSummary from "./components/SelectedResumeSummary";

import styles from "./ApplicationDetailsStep.module.css";

interface ApplicationDetailsStepProps {
  details: ApplicationDetailsForm;
  errors: ApplicationDetailsErrors;
  selectedResume: Resume | null;
  canContinue: boolean;

  onContactChange: <
    Key extends keyof ApplicationContactInfo,
  >(
    field: Key,
    value: ApplicationContactInfo[Key],
  ) => void;

  onDetailsChange: <
    Key extends keyof ApplicationDetailsForm,
  >(
    field: Key,
    value: ApplicationDetailsForm[Key],
  ) => void;

  onBack: () => void;
  onContinue: () => void;
}

const ApplicationDetailsStep = ({
  details,
  errors,
  selectedResume,
  canContinue,
  onContactChange,
  onDetailsChange,
  onBack,
  onContinue,
}: ApplicationDetailsStepProps) => {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <span>Bước 2</span>

        <h2>Thông tin ứng tuyển</h2>

        <p>
          Kiểm tra và hoàn thiện thông tin sẽ được
          gửi đến nhà tuyển dụng.
        </p>
      </header>

      <ContactInformationSection
        contact={details.contact}
        currentLocation={details.currentLocation}
        errors={{
          fullName: errors.fullName,
          email: errors.email,
          phone: errors.phone,
        }}
        onContactChange={onContactChange}
        onLocationChange={(value) =>
          onDetailsChange(
            "currentLocation",
            value,
          )
        }
      />

      <AvailabilitySection
        availability={details.availability}
        error={errors.availability}
        onChange={(value) =>
          onDetailsChange(
            "availability",
            value,
          )
        }
      />

      <PreferredContactSection
        value={details.preferredContactMethod}
        onChange={(value) =>
          onDetailsChange(
            "preferredContactMethod",
            value,
          )
        }
      />

      <CoverLetterSection
        value={details.coverLetter}
        onChange={(value) =>
          onDetailsChange(
            "coverLetter",
            value,
          )
        }
      />

      <SelectedResumeSummary
        resume={selectedResume}
        onChangeResume={onBack}
      />

      <ApplicationDetailsNotice />

      <ApplicationDetailsActions
        canContinue={canContinue}
        onBack={onBack}
        onContinue={onContinue}
      />
    </section>
  );
};

export default ApplicationDetailsStep;