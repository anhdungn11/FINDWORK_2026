import type { ExperienceItem } from "@/features/candidate/types/onboarding.types";
import ExperienceEmptyState from "./components/ExperienceEmptyState";
import ExperienceHeader from "./components/ExperienceHeader";
import ExperienceList from "./components/ExperienceList";
import ExperienceNotice from "./components/ExperienceNotice";
import useExperienceEditor from "./hooks/useExperienceEditor";
import styles from "./ExperienceStep.module.css";

interface ExperienceStepProps {
  value: ExperienceItem[];
  onChange: (value: ExperienceItem[]) => void;
}

const ExperienceStep = ({ value, onChange }: ExperienceStepProps) => {
  const editor = useExperienceEditor(value, onChange);
  const hasItems = value.length > 0;

  return (
    <div className={styles.wrapper}>
      <ExperienceHeader hasItems={hasItems} onAdd={editor.addExperience} />

      {hasItems ? (
        <ExperienceList value={value} editor={editor} />
      ) : (
        <ExperienceEmptyState onAdd={editor.addExperience} />
      )}

      <ExperienceNotice />
    </div>
  );
};

export default ExperienceStep;
