import type { EducationItem } from "@/features/candidate/types/onboarding.types";
import type { EducationEditorController } from "../hooks/useEducationEditor";
import {
  getDegreeLabel,
  getEducationDateLabel,
} from "../utils/education.utils";
import styles from "../styles/EducationOverview.module.css";
import EducationEditor from "./EducationEditor";

interface EducationCardProps {
  education: EducationItem;
  index: number;
  isEditing: boolean;
  editor: EducationEditorController;
}

const EducationCard = ({
  education,
  index,
  isEditing,
  editor,
}: EducationCardProps) => (
  <article className={styles.educationCard}>
    <div className={styles.cardHeader}>
      <div>
        <span className={styles.itemNumber}>HỌC VẤN {index + 1}</span>
        <h4>{education.school || "Thông tin học vấn"}</h4>

        {!isEditing && (
          <div className={styles.summary}>
            <p className={styles.summaryPrimary}>
              {getDegreeLabel(education.degree)}
              {education.major && ` · ${education.major}`}
            </p>

            <p>
              {getEducationDateLabel(education)}
              {education.location && ` · ${education.location}`}
            </p>

            {education.gpa && (
              <p>
                GPA: {education.gpa}
                {education.gpaScale && ` / ${education.gpaScale}`}
              </p>
            )}
          </div>
        )}
      </div>

      <div className={styles.cardActions}>
        {!isEditing && (
          <button
            type="button"
            className={styles.editButton}
            onClick={() => editor.editEducation(education.id)}
          >
            Sửa
          </button>
        )}

        <button
          type="button"
          className={styles.removeButton}
          onClick={() => editor.removeEducation(education.id)}
        >
          Xóa
        </button>
      </div>
    </div>

    {isEditing && <EducationEditor education={education} editor={editor} />}
  </article>
);

export default EducationCard;
