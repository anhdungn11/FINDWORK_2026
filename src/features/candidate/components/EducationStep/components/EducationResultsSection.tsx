import type { EducationItem } from "@/features/candidate/types/onboarding.types";
import type { EducationEditorController } from "../hooks/useEducationEditor";
import styles from "../styles/EducationEditor.module.css";

interface EducationResultsSectionProps {
  education: EducationItem;
  onUpdate: EducationEditorController["updateEducation"];
}

const EducationResultsSection = ({
  education,
  onUpdate,
}: EducationResultsSectionProps) => (
  <section className={styles.sectionBlock}>
    <div className={styles.sectionTitle}>
      <span>KẾT QUẢ HỌC TẬP</span>
      <h5>Điểm số & thành tích</h5>
    </div>

    <div className={styles.grid}>
      <div className={styles.field}>
        <label htmlFor={`gpa-${education.id}`}>GPA / Điểm trung bình</label>
        <input
          id={`gpa-${education.id}`}
          type="text"
          value={education.gpa}
          placeholder="Ví dụ: 8.2"
          onChange={(event) =>
            onUpdate(education.id, "gpa", event.target.value)
          }
        />
      </div>

      <div className={styles.field}>
        <label>Thang điểm</label>
        <select
          value={education.gpaScale}
          onChange={(event) =>
            onUpdate(
              education.id,
              "gpaScale",
              event.target.value as EducationItem["gpaScale"],
            )
          }
        >
          <option value="">Chọn thang điểm</option>
          <option value="4">Thang 4</option>
          <option value="10">Thang 10</option>
          <option value="100">Thang 100</option>
        </select>
      </div>

      <div className={`${styles.field} ${styles.fullWidth}`}>
        <label htmlFor={`achievements-${education.id}`}>Thành tích nổi bật</label>
        <textarea
          id={`achievements-${education.id}`}
          rows={4}
          value={education.achievements}
          placeholder="Ví dụ: Học bổng, giải thưởng, thành tích học tập..."
          onChange={(event) =>
            onUpdate(education.id, "achievements", event.target.value)
          }
        />
      </div>
    </div>
  </section>
);

export default EducationResultsSection;
