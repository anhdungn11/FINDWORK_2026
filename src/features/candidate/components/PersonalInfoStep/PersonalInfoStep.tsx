import AvatarSection from "./components/AvatarSection";
import BasicInfoSection from "./components/BasicInfoSection";
import BioSection from "./components/BioSection";
import LocationSection from "./components/LocationSection";
import PrivacyNotice from "./components/PrivacyNotice";

import {
  usePersonalInfoEditor,
} from "./hooks/usePersonalInfoEditor";

import type {
  PersonalInfoStepProps,
} from "./types/personal-info.types";

import styles from "./PersonalInfoStep.module.css";

const PersonalInfoStep = ({
  value,
  onChange,
}: PersonalInfoStepProps) => {
  const editor = usePersonalInfoEditor({
    value,
    onChange,
  });

  return (
    <div className={styles.wrapper}>
      <AvatarSection
        value={value}
        editor={editor}
      />

      <div className={styles.divider} />

      <BasicInfoSection
        value={value}
        updateField={editor.updateField}
      />

      <div className={styles.divider} />

      <LocationSection
        value={value}
        updateField={editor.updateField}
        updateProvinceCode={
          editor.updateProvinceCode
        }
      />

      <div className={styles.divider} />

      <BioSection
        value={value}
        updateField={editor.updateField}
      />

      <PrivacyNotice />
    </div>
  );
};

export default PersonalInfoStep;
