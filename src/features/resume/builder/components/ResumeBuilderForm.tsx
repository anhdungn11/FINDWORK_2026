import type { ReactNode } from "react";

import type {
  ResumeBuilderContent,
  ResumeBuilderEducationItem,
  ResumeBuilderExperienceItem,
} from "@/features/resume/types/resume.types";

import styles from "./ResumeBuilder.module.css";

interface ResumeBuilderFormProps {
  content: ResumeBuilderContent;
  onContentChange: <K extends keyof ResumeBuilderContent>(
    key: K,
    value: ResumeBuilderContent[K],
  ) => void;
  onAddExperience: () => void;
  onUpdateExperience: (id: string, patch: Partial<ResumeBuilderExperienceItem>) => void;
  onRemoveExperience: (id: string) => void;
  onAddEducation: () => void;
  onUpdateEducation: (id: string, patch: Partial<ResumeBuilderEducationItem>) => void;
  onRemoveEducation: (id: string) => void;
}

const ResumeBuilderForm = ({
  content,
  onContentChange,
  onAddExperience,
  onUpdateExperience,
  onRemoveExperience,
  onAddEducation,
  onUpdateEducation,
  onRemoveEducation,
}: ResumeBuilderFormProps) => (
  <div className={styles.editorPanel}>
    <div className={styles.editorIntro}>
      <span className={styles.panelEyebrow}>Nội dung CV</span>
      <h2>Điền thông tin</h2>
      <p>Thay đổi sẽ hiển thị ngay trên bản CV bên phải.</p>
    </div>

    <EditorSection number="01" title="Thông tin cá nhân" description="Phần nhận diện xuất hiện ở đầu CV.">
      <div className={styles.twoColumns}>
        <Field label="Họ và tên">
          <input
            value={content.fullName}
            onChange={(event) => onContentChange("fullName", event.target.value)}
            placeholder="Nguyễn Anh Dũng"
          />
        </Field>
        <Field label="Vị trí nghề nghiệp">
          <input
            value={content.professionalTitle}
            onChange={(event) => onContentChange("professionalTitle", event.target.value)}
            placeholder="Backend Developer"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={content.email}
            onChange={(event) => onContentChange("email", event.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Số điện thoại">
          <input
            value={content.phone}
            onChange={(event) => onContentChange("phone", event.target.value)}
            placeholder="09xx xxx xxx"
          />
        </Field>
      </div>

      <Field label="Khu vực">
        <input
          value={content.location}
          onChange={(event) => onContentChange("location", event.target.value)}
          placeholder="TP. Hồ Chí Minh"
        />
      </Field>
    </EditorSection>

    <EditorSection number="02" title="Giới thiệu nghề nghiệp" description="Tóm tắt ngắn gọn giá trị và định hướng của bạn.">
      <Field label="Tóm tắt">
        <textarea
          rows={5}
          value={content.summary}
          onChange={(event) => onContentChange("summary", event.target.value)}
          placeholder="3–5 dòng về kinh nghiệm, thế mạnh, thành tựu và mục tiêu nghề nghiệp."
        />
      </Field>
      <p className={styles.fieldHint}>Nên viết ngắn, cụ thể và tránh các câu chung chung.</p>
    </EditorSection>

    <EditorSection number="03" title="Kinh nghiệm" description="Ưu tiên công việc, thực tập hoặc dự án có kết quả rõ ràng.">
      {content.experience.length === 0 && (
        <EmptyEditorMessage>Chưa có kinh nghiệm. Bấm “Thêm kinh nghiệm” để bắt đầu.</EmptyEditorMessage>
      )}

      {content.experience.map((item, index) => (
        <div className={styles.repeatCard} key={item.id}>
          <div className={styles.repeatHeader}>
            <div>
              <span>Kinh nghiệm {String(index + 1).padStart(2, "0")}</span>
              <strong>{item.position || "Vị trí chưa đặt tên"}</strong>
            </div>
            <button type="button" onClick={() => onRemoveExperience(item.id)}>Xóa</button>
          </div>

          <div className={styles.twoColumns}>
            <Field label="Vị trí">
              <input value={item.position} onChange={(event) => onUpdateExperience(item.id, { position: event.target.value })} />
            </Field>
            <Field label="Công ty">
              <input value={item.company} onChange={(event) => onUpdateExperience(item.id, { company: event.target.value })} />
            </Field>
            <Field label="Bắt đầu">
              <input type="month" value={item.startDate} onChange={(event) => onUpdateExperience(item.id, { startDate: event.target.value })} />
            </Field>
            <Field label="Kết thúc">
              <input type="month" value={item.endDate} disabled={item.isCurrent} onChange={(event) => onUpdateExperience(item.id, { endDate: event.target.value })} />
            </Field>
          </div>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={item.isCurrent}
              onChange={(event) => onUpdateExperience(item.id, {
                isCurrent: event.target.checked,
                endDate: event.target.checked ? "" : item.endDate,
              })}
            />
            <span>Tôi đang làm việc tại đây</span>
          </label>

          <Field label="Mô tả">
            <textarea
              rows={4}
              value={item.description}
              onChange={(event) => onUpdateExperience(item.id, { description: event.target.value })}
              placeholder="Ví dụ: Xây dựng API..., tối ưu..., giảm thời gian xử lý..."
            />
          </Field>
        </div>
      ))}

      <button type="button" className={styles.addSectionButton} onClick={onAddExperience}>
        <span>＋</span> Thêm kinh nghiệm
      </button>
    </EditorSection>

    <EditorSection number="04" title="Học vấn" description="Trường học, bằng cấp và chuyên ngành.">
      {content.education.length === 0 && (
        <EmptyEditorMessage>Chưa có học vấn. Bấm “Thêm học vấn” để bổ sung.</EmptyEditorMessage>
      )}

      {content.education.map((item, index) => (
        <div className={styles.repeatCard} key={item.id}>
          <div className={styles.repeatHeader}>
            <div>
              <span>Học vấn {String(index + 1).padStart(2, "0")}</span>
              <strong>{item.school || "Trường chưa đặt tên"}</strong>
            </div>
            <button type="button" onClick={() => onRemoveEducation(item.id)}>Xóa</button>
          </div>

          <div className={styles.twoColumns}>
            <Field label="Trường">
              <input value={item.school} onChange={(event) => onUpdateEducation(item.id, { school: event.target.value })} />
            </Field>
            <Field label="Bằng cấp">
              <input value={item.degree} onChange={(event) => onUpdateEducation(item.id, { degree: event.target.value })} placeholder="Đại học" />
            </Field>
            <Field label="Chuyên ngành">
              <input value={item.major} onChange={(event) => onUpdateEducation(item.id, { major: event.target.value })} placeholder="Công nghệ thông tin" />
            </Field>
            <Field label="Thời gian">
              <div className={styles.inlineInputs}>
                <input placeholder="2023" value={item.startYear} onChange={(event) => onUpdateEducation(item.id, { startYear: event.target.value })} />
                <input placeholder="2027" value={item.endYear} onChange={(event) => onUpdateEducation(item.id, { endYear: event.target.value })} />
              </div>
            </Field>
          </div>

          <Field label="Mô tả / thành tích">
            <textarea rows={3} value={item.description} onChange={(event) => onUpdateEducation(item.id, { description: event.target.value })} />
          </Field>
        </div>
      ))}

      <button type="button" className={styles.addSectionButton} onClick={onAddEducation}>
        <span>＋</span> Thêm học vấn
      </button>
    </EditorSection>

    <EditorSection number="05" title="Kỹ năng & ngôn ngữ" description="Nhập từng mục và phân cách bằng dấu phẩy.">
      <Field label="Kỹ năng">
        <input
          value={content.skills.join(", ")}
          onChange={(event) => onContentChange("skills", splitCommaValues(event.target.value))}
          placeholder="C#, ASP.NET Core, PostgreSQL, Git"
        />
      </Field>
      <Field label="Ngôn ngữ">
        <input
          value={content.languages.join(", ")}
          onChange={(event) => onContentChange("languages", splitCommaValues(event.target.value))}
          placeholder="Tiếng Việt, Tiếng Anh"
        />
      </Field>
    </EditorSection>
  </div>
);

const splitCommaValues = (value: string) =>
  value.split(",").map((item) => item.trim()).filter(Boolean);

const EditorSection = ({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <section className={styles.editorSection}>
    <div className={styles.editorHeading}>
      <span>{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
    <div className={styles.editorBody}>{children}</div>
  </section>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className={styles.field}>
    <span>{label}</span>
    {children}
  </label>
);

const EmptyEditorMessage = ({ children }: { children: ReactNode }) => (
  <div className={styles.emptyEditorMessage}>{children}</div>
);

export default ResumeBuilderForm;
