import type { EducationItem } from "@/features/candidate/types/onboarding.types";
import type { EducationEditorController } from "../hooks/useEducationEditor";
import { MONTHS } from "../utils/education.utils";
import styles from "../styles/EducationEditor.module.css";

interface EducationPeriodSectionProps {
  education: EducationItem;
  onUpdate: EducationEditorController["updateEducation"];
  onStudyingChange: EducationEditorController["handleStudyingChange"];
}

const EducationPeriodSection = ({
  education,
  onUpdate,
  onStudyingChange,
}: EducationPeriodSectionProps) => (
  <section className={styles.sectionBlock}>
    <div className={styles.sectionTitle}>
      <span>THỜI GIAN</span>
      <h5>Thời gian học</h5>
    </div>

    <div className={styles.dateGrid}>
      <div className={styles.field}>
        <label>Tháng bắt đầu</label>
        <select
          value={education.startMonth}
          onChange={(event) =>
            onUpdate(education.id, "startMonth", event.target.value)
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
        <label>Năm bắt đầu</label>
        <input
          type="number"
          min="1950"
          max="2100"
          value={education.startYear}
          placeholder="2024"
          onChange={(event) =>
            onUpdate(education.id, "startYear", event.target.value)
          }
        />
      </div>

      <div className={styles.field}>
        <label>Tháng kết thúc</label>
        <select
          value={education.endMonth}
          disabled={education.isStudying}
          onChange={(event) =>
            onUpdate(education.id, "endMonth", event.target.value)
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
          value={education.endYear}
          placeholder="2028"
          disabled={education.isStudying}
          onChange={(event) =>
            onUpdate(education.id, "endYear", event.target.value)
          }
        />
      </div>
    </div>

    <label className={styles.checkboxRow}>
      <input
        type="checkbox"
        checked={education.isStudying}
        onChange={(event) => onStudyingChange(education, event.target.checked)}
      />
      <span>Tôi hiện đang học tại đây</span>
    </label>
  </section>
);

export default EducationPeriodSection;
