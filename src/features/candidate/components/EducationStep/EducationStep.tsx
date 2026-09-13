import type { EducationItem } from "@/features/candidate/types/onboarding.types";

import styles from "./EducationStep.module.css";
import EducationEmptyState from "./components/EducationEmptyState";
import EducationHeader from "./components/EducationHeader";
import EducationList from "./components/EducationList";
import EducationNotice from "./components/EducationNotice";
import useEducationEditor from "./hooks/useEducationEditor";

interface EducationStepProps {
  value: EducationItem[];
  onChange: (value: EducationItem[]) => void;
}

const EducationStep = ({ value, onChange }: EducationStepProps) => {
  const editor = useEducationEditor(value, onChange);

  return (
    <div className={styles.wrapper}>
      <EducationHeader
        hasEducation={value.length > 0}
        onAdd={editor.addEducation}
      />

      {value.length === 0 ? (
        <EducationEmptyState onAdd={editor.addEducation} />
      ) : (
        <EducationList
          value={value}
          editor={editor}
        />
      )}

      <EducationNotice />
    </div>
  );
};

export default EducationStep;
