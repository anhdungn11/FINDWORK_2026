import type { ExperienceItem } from "@/features/candidate/types/onboarding.types";
import styles from "../styles/ExperienceEditor.module.css";

interface ExperienceDescriptionSectionProps {
  experience: ExperienceItem;
  onUpdate: <Key extends keyof ExperienceItem>(
    id: string,
    key: Key,
    value: ExperienceItem[Key],
  ) => void;
}

const ExperienceDescriptionSection = ({
  experience,
  onUpdate,
}: ExperienceDescriptionSectionProps) => (
  <section className={styles.sectionBlock}>
    <div className={styles.sectionTitle}>
      <span>CÔNG VIỆC</span>
      <h5>Vai trò & trách nhiệm</h5>
    </div>

    <div className={styles.field}>
      <label htmlFor={`description-${experience.id}`}>Mô tả công việc</label>
      <textarea
        id={`description-${experience.id}`}
        rows={5}
        maxLength={1500}
        value={experience.description}
        placeholder="Mô tả những công việc chính, phạm vi trách nhiệm và đóng góp của bạn..."
        onChange={(event) =>
          onUpdate(experience.id, "description", event.target.value)
        }
      />

      <div className={styles.fieldFooter}>
        <small>Ưu tiên mô tả ngắn, rõ và có giá trị nghề nghiệp.</small>
        <span>{experience.description.length}/1500</span>
      </div>
    </div>
  </section>
);

export default ExperienceDescriptionSection;
