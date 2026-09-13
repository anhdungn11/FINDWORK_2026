import type { ExperienceItem } from "@/features/candidate/types/onboarding.types";
import styles from "../styles/ExperienceEditor.module.css";

interface ExperienceAchievementsSectionProps {
  experience: ExperienceItem;
  onUpdate: <Key extends keyof ExperienceItem>(
    id: string,
    key: Key,
    value: ExperienceItem[Key],
  ) => void;
}

const ExperienceAchievementsSection = ({
  experience,
  onUpdate,
}: ExperienceAchievementsSectionProps) => (
  <section className={styles.sectionBlock}>
    <div className={styles.sectionTitle}>
      <span>KẾT QUẢ</span>
      <h5>Thành tựu nổi bật</h5>
    </div>

    <div className={styles.field}>
      <label htmlFor={`achievements-${experience.id}`}>
        Thành tựu / Kết quả
      </label>
      <textarea
        id={`achievements-${experience.id}`}
        rows={4}
        maxLength={1000}
        value={experience.achievements}
        placeholder="Ví dụ: Cải thiện tốc độ tải trang 35%, hoàn thành dự án trước deadline, hỗ trợ 20+ khách hàng..."
        onChange={(event) =>
          onUpdate(experience.id, "achievements", event.target.value)
        }
      />

      <div className={styles.fieldFooter}>
        <small>Nếu có thể, sử dụng số liệu cụ thể để tăng độ tin cậy.</small>
        <span>{experience.achievements.length}/1000</span>
      </div>
    </div>
  </section>
);

export default ExperienceAchievementsSection;
