import type { ExperienceItem } from "@/features/candidate/types/onboarding.types";
import type { ExperienceEditorController } from "../hooks/useExperienceEditor";
import styles from "../styles/ExperienceOverview.module.css";
import {
  getEmploymentTypeLabel,
  getPeriodLabel,
  getWorkplaceLabel,
} from "../utils/experience.utils";
import ExperienceEditor from "./ExperienceEditor";

interface ExperienceCardProps {
  experience: ExperienceItem;
  index: number;
  editor: ExperienceEditorController;
}

const ExperienceCard = ({
  experience,
  index,
  editor,
}: ExperienceCardProps) => {
  const isEditing = editor.editingId === experience.id;
  const workplaceLabel = getWorkplaceLabel(experience.workplaceType);

  return (
    <article className={styles.experienceCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardIdentity}>
          <span className={styles.itemNumber}>KINH NGHIỆM {index + 1}</span>
          <h4>{experience.position || "Thông tin công việc"}</h4>
          <strong className={styles.companyName}>
            {experience.company || "Chưa cập nhật công ty"}
          </strong>

          {!isEditing && (
            <div className={styles.summary}>
              <p className={styles.summaryPrimary}>
                {getEmploymentTypeLabel(experience.employmentType)}
                {workplaceLabel && ` · ${workplaceLabel}`}
              </p>
              <p>
                {getPeriodLabel(experience)}
                {experience.location && ` · ${experience.location}`}
              </p>

              {experience.skillsUsed.length > 0 && (
                <div className={styles.summarySkills}>
                  {experience.skillsUsed.slice(0, 5).map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                  {experience.skillsUsed.length > 5 && (
                    <span>+{experience.skillsUsed.length - 5}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.cardActions}>
          {!isEditing && (
            <button
              type="button"
              className={styles.editButton}
              onClick={() => editor.editExperience(experience.id)}
            >
              Sửa
            </button>
          )}
          <button
            type="button"
            className={styles.removeButton}
            onClick={() => editor.removeExperience(experience.id)}
          >
            Xóa
          </button>
        </div>
      </div>

      {isEditing && (
        <ExperienceEditor
          experience={experience}
          skillInput={editor.skillInput}
          setSkillInput={editor.setSkillInput}
          onUpdate={editor.updateExperience}
          onCurrentChange={editor.handleCurrentChange}
          onAddSkill={editor.addSkill}
          onRemoveSkill={editor.removeSkill}
          onComplete={editor.completeExperience}
        />
      )}
    </article>
  );
};

export default ExperienceCard;
