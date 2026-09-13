import type { Dispatch, SetStateAction } from "react";

import type { ExperienceItem } from "@/features/candidate/types/onboarding.types";
import styles from "../styles/ExperienceEditor.module.css";
import { canCompleteExperience } from "../utils/experience.utils";
import ExperienceAchievementsSection from "./ExperienceAchievementsSection";
import ExperienceDescriptionSection from "./ExperienceDescriptionSection";
import ExperiencePeriodSection from "./ExperiencePeriodSection";
import ExperienceSkillsSection from "./ExperienceSkillsSection";
import JobInformationSection from "./JobInformationSection";

interface ExperienceEditorProps {
  experience: ExperienceItem;
  skillInput: string;
  setSkillInput: Dispatch<SetStateAction<string>>;
  onUpdate: <Key extends keyof ExperienceItem>(
    id: string,
    key: Key,
    value: ExperienceItem[Key],
  ) => void;
  onCurrentChange: (experience: ExperienceItem, checked: boolean) => void;
  onAddSkill: (experience: ExperienceItem) => void;
  onRemoveSkill: (experience: ExperienceItem, skill: string) => void;
  onComplete: (experience: ExperienceItem) => void;
}

const ExperienceEditor = ({
  experience,
  skillInput,
  setSkillInput,
  onUpdate,
  onCurrentChange,
  onAddSkill,
  onRemoveSkill,
  onComplete,
}: ExperienceEditorProps) => {
  const canComplete = canCompleteExperience(experience);

  return (
    <div className={styles.formArea}>
      <JobInformationSection experience={experience} onUpdate={onUpdate} />

      <div className={styles.sectionDivider} />

      <ExperiencePeriodSection
        experience={experience}
        onUpdate={onUpdate}
        onCurrentChange={onCurrentChange}
      />

      <div className={styles.sectionDivider} />

      <ExperienceDescriptionSection
        experience={experience}
        onUpdate={onUpdate}
      />

      <div className={styles.sectionDivider} />

      <ExperienceAchievementsSection
        experience={experience}
        onUpdate={onUpdate}
      />

      <div className={styles.sectionDivider} />

      <ExperienceSkillsSection
        experience={experience}
        skillInput={skillInput}
        setSkillInput={setSkillInput}
        onAddSkill={onAddSkill}
        onRemoveSkill={onRemoveSkill}
      />

      {!canComplete && (
        <div className={styles.validationNotice}>
          Vui lòng nhập Chức danh, Công ty, Loại hình công việc và Năm bắt đầu
          trước khi hoàn tất.
        </div>
      )}

      <div className={styles.editActions}>
        <button
          type="button"
          className={styles.doneButton}
          disabled={!canComplete}
          onClick={() => onComplete(experience)}
        >
          Hoàn tất mục kinh nghiệm
        </button>
      </div>
    </div>
  );
};

export default ExperienceEditor;
