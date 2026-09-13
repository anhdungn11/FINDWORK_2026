import type { ExperienceItem } from "@/features/candidate/types/onboarding.types";
import type { ExperienceEditorController } from "../hooks/useExperienceEditor";
import styles from "../styles/ExperienceOverview.module.css";
import ExperienceCard from "./ExperienceCard";

interface ExperienceListProps {
  value: ExperienceItem[];
  editor: ExperienceEditorController;
}

const ExperienceList = ({ value, editor }: ExperienceListProps) => (
  <div className={styles.experienceList}>
    {value.map((experience, index) => (
      <ExperienceCard
        key={experience.id}
        experience={experience}
        index={index}
        editor={editor}
      />
    ))}

    <button
      type="button"
      className={styles.addAnotherButton}
      onClick={editor.addExperience}
    >
      <span>+</span>
      Thêm kinh nghiệm khác
    </button>
  </div>
);

export default ExperienceList;
