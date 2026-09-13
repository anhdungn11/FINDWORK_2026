import type { ExperienceItem } from "@/features/candidate/types/onboarding.types";
import styles from "../styles/ExperienceEditor.module.css";
import { MONTHS } from "../utils/experience.utils";

interface ExperiencePeriodSectionProps {
  experience: ExperienceItem;
  onUpdate: <Key extends keyof ExperienceItem>(
    id: string,
    key: Key,
    value: ExperienceItem[Key],
  ) => void;
  onCurrentChange: (experience: ExperienceItem, checked: boolean) => void;
}

const ExperiencePeriodSection = ({
  experience,
  onUpdate,
  onCurrentChange,
}: ExperiencePeriodSectionProps) => (
  <section className={styles.sectionBlock}>
    <div className={styles.sectionTitle}>
      <span>THỜI GIAN</span>
      <h5>Thời gian làm việc</h5>
    </div>

    <div className={styles.dateGrid}>
      <div className={styles.field}>
        <label>Tháng bắt đầu</label>
        <select
          value={experience.startMonth}
          onChange={(event) =>
            onUpdate(experience.id, "startMonth", event.target.value)
          }
        >
          <option value="">Tháng</option>
          {MONTHS.map((month) => (
            <option key={month} value={month}>
              Tháng {month}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label>
          Năm bắt đầu<span>*</span>
        </label>
        <input
          type="number"
          min="1950"
          max="2100"
          value={experience.startYear}
          placeholder="2025"
          onChange={(event) =>
            onUpdate(experience.id, "startYear", event.target.value)
          }
        />
      </div>

      <div className={styles.field}>
        <label>Tháng kết thúc</label>
        <select
          value={experience.endMonth}
          disabled={experience.isCurrent}
          onChange={(event) =>
            onUpdate(experience.id, "endMonth", event.target.value)
          }
        >
          <option value="">Tháng</option>
          {MONTHS.map((month) => (
            <option key={month} value={month}>
              Tháng {month}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label>Năm kết thúc</label>
        <input
          type="number"
          min="1950"
          max="2100"
          value={experience.endYear}
          placeholder="2026"
          disabled={experience.isCurrent}
          onChange={(event) =>
            onUpdate(experience.id, "endYear", event.target.value)
          }
        />
      </div>
    </div>

    <label className={styles.checkboxRow}>
      <input
        type="checkbox"
        checked={experience.isCurrent}
        onChange={(event) => onCurrentChange(experience, event.target.checked)}
      />
      <span>Tôi hiện đang làm việc tại đây</span>
    </label>
  </section>
);

export default ExperiencePeriodSection;
