import type { EducationItem } from "@/features/candidate/types/onboarding.types";
import type { EducationEditorController } from "../hooks/useEducationEditor";
import styles from "../styles/EducationEditor.module.css";
import EducationBasicInfoSection from "./EducationBasicInfoSection";
import EducationDescriptionSection from "./EducationDescriptionSection";
import EducationPeriodSection from "./EducationPeriodSection";
import EducationResultsSection from "./EducationResultsSection";

interface EducationEditorProps {
  education: EducationItem;
  editor: EducationEditorController;
}

const EducationEditor = ({ education, editor }: EducationEditorProps) => (
  <div className={styles.formArea}>
    <EducationBasicInfoSection
      education={education}
      onUpdate={editor.updateEducation}
    />

    <div className={styles.sectionDivider} />

    <EducationPeriodSection
      education={education}
      onUpdate={editor.updateEducation}
      onStudyingChange={editor.handleStudyingChange}
    />

    <div className={styles.sectionDivider} />

    <EducationResultsSection
      education={education}
      onUpdate={editor.updateEducation}
    />

    <div className={styles.sectionDivider} />

    <EducationDescriptionSection
      education={education}
      onUpdate={editor.updateEducation}
    />

    <div className={styles.editActions}>
      <button
        type="button"
        className={styles.doneButton}
        onClick={editor.completeEducation}
      >
        Hoàn tất mục học vấn
      </button>
    </div>
  </div>
);

export default EducationEditor;
