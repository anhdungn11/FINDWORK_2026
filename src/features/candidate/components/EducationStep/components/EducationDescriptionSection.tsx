import type { EducationItem } from "@/features/candidate/types/onboarding.types";
import type { EducationEditorController } from "../hooks/useEducationEditor";
import styles from "../styles/EducationEditor.module.css";

interface EducationDescriptionSectionProps {
  education: EducationItem;
  onUpdate: EducationEditorController["updateEducation"];
}

const EducationDescriptionSection = ({
  education,
  onUpdate,
}: EducationDescriptionSectionProps) => (
  <section className={styles.sectionBlock}>
    <div className={styles.sectionTitle}>
      <span>THÔNG TIN BỔ SUNG</span>
      <h5>Nội dung học tập liên quan</h5>
    </div>

    <div className={styles.field}>
      <label htmlFor={`description-${education.id}`}>Mô tả</label>
      <textarea
        id={`description-${education.id}`}
        rows={5}
        value={education.description}
        placeholder="Môn học nổi bật, đồ án, hoạt động hoặc kiến thức liên quan đến vị trí bạn muốn ứng tuyển..."
        onChange={(event) =>
          onUpdate(education.id, "description", event.target.value)
        }
      />
      <small>
        Không bắt buộc. Chỉ nên thêm nội dung có giá trị cho hồ sơ nghề nghiệp.
      </small>
    </div>
  </section>
);

export default EducationDescriptionSection;
