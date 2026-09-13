import type { EducationItem } from "@/features/candidate/types/onboarding.types";
import type { EducationEditorController } from "../hooks/useEducationEditor";
import styles from "../styles/EducationOverview.module.css";
import EducationCard from "./EducationCard";

interface EducationListProps {
  value: EducationItem[];
  editor: EducationEditorController;
}

const EducationList = ({ value, editor }: EducationListProps) => (
  <div className={styles.educationList}>
    {value.map((education, index) => (
      <EducationCard
        key={education.id}
        education={education}
        index={index}
        isEditing={editor.editingId === education.id}
        editor={editor}
      />
    ))}

    <button
      type="button"
      className={styles.addAnotherButton}
      onClick={editor.addEducation}
    >
      <span>+</span>
      Thêm học vấn khác
    </button>
  </div>
);

export default EducationList;
