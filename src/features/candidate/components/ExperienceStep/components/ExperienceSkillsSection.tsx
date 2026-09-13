import type { Dispatch, SetStateAction } from "react";

import type { ExperienceItem } from "@/features/candidate/types/onboarding.types";
import styles from "../styles/ExperienceSkills.module.css";

interface ExperienceSkillsSectionProps {
  experience: ExperienceItem;
  skillInput: string;
  setSkillInput: Dispatch<SetStateAction<string>>;
  onAddSkill: (experience: ExperienceItem) => void;
  onRemoveSkill: (experience: ExperienceItem, skill: string) => void;
}

const ExperienceSkillsSection = ({
  experience,
  skillInput,
  setSkillInput,
  onAddSkill,
  onRemoveSkill,
}: ExperienceSkillsSectionProps) => (
  <section className={styles.sectionBlock}>
    <div className={styles.sectionTitle}>
      <span>KỸ NĂNG ĐÃ SỬ DỤNG</span>
      <h5>Kỹ năng trong công việc này</h5>
    </div>

    <div className={styles.skillComposer}>
      <input
        type="text"
        value={skillInput}
        placeholder="Ví dụ: React, Excel, Sales..."
        onChange={(event) => setSkillInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onAddSkill(experience);
          }
        }}
      />

      <button type="button" onClick={() => onAddSkill(experience)}>
        Thêm
      </button>
    </div>

    {experience.skillsUsed.length > 0 ? (
      <div className={styles.skillList}>
        {experience.skillsUsed.map((skill) => (
          <span key={skill}>
            {skill}
            <button
              type="button"
              aria-label={`Xóa kỹ năng ${skill}`}
              onClick={() => onRemoveSkill(experience, skill)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    ) : (
      <p className={styles.noSkills}>Chưa thêm kỹ năng cho kinh nghiệm này.</p>
    )}
  </section>
);

export default ExperienceSkillsSection;
