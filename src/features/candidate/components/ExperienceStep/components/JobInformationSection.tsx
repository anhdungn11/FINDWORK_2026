import type { ExperienceItem } from "@/features/candidate/types/onboarding.types";
import styles from "../styles/ExperienceEditor.module.css";

interface JobInformationSectionProps {
  experience: ExperienceItem;
  onUpdate: <Key extends keyof ExperienceItem>(
    id: string,
    key: Key,
    value: ExperienceItem[Key],
  ) => void;
}

const JobInformationSection = ({
  experience,
  onUpdate,
}: JobInformationSectionProps) => (
  <section className={styles.sectionBlock}>
    <div className={styles.sectionTitle}>
      <span>THÔNG TIN CÔNG VIỆC</span>
      <h5>Vai trò & doanh nghiệp</h5>
    </div>

    <div className={styles.grid}>
      <div className={styles.field}>
        <label htmlFor={`position-${experience.id}`}>
          Chức danh<span>*</span>
        </label>
        <input
          id={`position-${experience.id}`}
          type="text"
          value={experience.position}
          placeholder="Ví dụ: Frontend Developer"
          onChange={(event) =>
            onUpdate(experience.id, "position", event.target.value)
          }
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={`company-${experience.id}`}>
          Công ty / Tổ chức<span>*</span>
        </label>
        <input
          id={`company-${experience.id}`}
          type="text"
          value={experience.company}
          placeholder="Ví dụ: FPT Software"
          onChange={(event) =>
            onUpdate(experience.id, "company", event.target.value)
          }
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={`employmentType-${experience.id}`}>
          Loại hình công việc<span>*</span>
        </label>
        <select
          id={`employmentType-${experience.id}`}
          value={experience.employmentType}
          onChange={(event) =>
            onUpdate(
              experience.id,
              "employmentType",
              event.target.value as ExperienceItem["employmentType"],
            )
          }
        >
          <option value="">Chọn loại công việc</option>
          <option value="full-time">Toàn thời gian</option>
          <option value="part-time">Bán thời gian</option>
          <option value="internship">Thực tập</option>
          <option value="contract">Hợp đồng</option>
          <option value="freelance">Freelance</option>
          <option value="temporary">Tạm thời</option>
          <option value="volunteer">Tình nguyện</option>
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor={`workplace-${experience.id}`}>Hình thức làm việc</label>
        <select
          id={`workplace-${experience.id}`}
          value={experience.workplaceType}
          onChange={(event) =>
            onUpdate(
              experience.id,
              "workplaceType",
              event.target.value as ExperienceItem["workplaceType"],
            )
          }
        >
          <option value="">Chọn hình thức</option>
          <option value="onsite">Tại văn phòng</option>
          <option value="hybrid">Hybrid</option>
          <option value="remote">Remote</option>
        </select>
      </div>

      <div className={`${styles.field} ${styles.fullWidth}`}>
        <label htmlFor={`location-${experience.id}`}>Địa điểm</label>
        <input
          id={`location-${experience.id}`}
          type="text"
          value={experience.location}
          placeholder="Ví dụ: TP. Hồ Chí Minh"
          onChange={(event) =>
            onUpdate(experience.id, "location", event.target.value)
          }
        />
      </div>
    </div>
  </section>
);

export default JobInformationSection;
