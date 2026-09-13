import type { EducationItem } from "@/features/candidate/types/onboarding.types";
import type { EducationEditorController } from "../hooks/useEducationEditor";
import { DEGREE_OPTIONS } from "../utils/education.utils";
import styles from "../styles/EducationEditor.module.css";

interface EducationBasicInfoSectionProps {
  education: EducationItem;
  onUpdate: EducationEditorController["updateEducation"];
}

const EducationBasicInfoSection = ({
  education,
  onUpdate,
}: EducationBasicInfoSectionProps) => (
  <section className={styles.sectionBlock}>
    <div className={styles.sectionTitle}>
      <span>THÔNG TIN CHƯƠNG TRÌNH</span>
      <h5>Cơ sở đào tạo</h5>
    </div>

    <div className={styles.grid}>
      <div className={`${styles.field} ${styles.fullWidth}`}>
        <label htmlFor={`school-${education.id}`}>
          Trường / Cơ sở đào tạo<span>*</span>
        </label>
        <input
          id={`school-${education.id}`}
          type="text"
          value={education.school}
          placeholder="Ví dụ: Đại học Thủ Dầu Một"
          onChange={(event) =>
            onUpdate(education.id, "school", event.target.value)
          }
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={`degree-${education.id}`}>
          Trình độ<span>*</span>
        </label>
        <select
          id={`degree-${education.id}`}
          value={education.degree}
          onChange={(event) =>
            onUpdate(
              education.id,
              "degree",
              event.target.value as EducationItem["degree"],
            )
          }
        >
          <option value="">Chọn trình độ</option>
          {DEGREE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor={`major-${education.id}`}>
          Chuyên ngành<span>*</span>
        </label>
        <input
          id={`major-${education.id}`}
          type="text"
          value={education.major}
          placeholder="Ví dụ: Công nghệ thông tin"
          onChange={(event) =>
            onUpdate(education.id, "major", event.target.value)
          }
        />
      </div>

      <div className={`${styles.field} ${styles.fullWidth}`}>
        <label htmlFor={`location-${education.id}`}>Địa điểm</label>
        <input
          id={`location-${education.id}`}
          type="text"
          value={education.location}
          placeholder="Ví dụ: Bình Dương, Việt Nam"
          onChange={(event) =>
            onUpdate(education.id, "location", event.target.value)
          }
        />
      </div>
    </div>
  </section>
);

export default EducationBasicInfoSection;
