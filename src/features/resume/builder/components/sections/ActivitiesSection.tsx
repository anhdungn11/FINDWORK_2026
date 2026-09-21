import type { ResumeBuilderActivityItem } from "@/features/resume/types/resume.types";
import MonthYearField from "@/features/resume/builder/components/fields/MonthYearField";
import { EmptyState, Field, ItemHeader, SectionHeader } from "./section.helpers";
import styles from "../ResumeEditor.module.css";

interface Props {
  items: ResumeBuilderActivityItem[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<ResumeBuilderActivityItem>) => void;
  onRemove: (id: string) => void;
}

const ActivitiesSection = ({ items, onAdd, onUpdate, onRemove }: Props) => (
  <>
    <SectionHeader
      eyebrow="Hoạt động"
      title="Hoạt động & tổ chức"
      description="Phù hợp với sinh viên, ứng viên chuyển ngành hoặc hồ sơ cần thể hiện khả năng tổ chức, lãnh đạo và tham gia cộng đồng."
      optional
    />
    <div className={styles.sectionBody}>
      {items.length === 0 && (
        <EmptyState title="Chưa có hoạt động">
          Có thể thêm câu lạc bộ, hội nhóm, ban tổ chức, hoạt động ngoại khóa hoặc tổ chức nghề nghiệp.
        </EmptyState>
      )}
      {items.map((item, index) => (
        <article className={styles.itemCard} key={item.id}>
          <ItemHeader
            eyebrow={`Hoạt động ${index + 1}`}
            title={item.name || "Tên hoạt động"}
            subtitle={item.organization}
            onRemove={() => onRemove(item.id)}
          />
          <div className={styles.twoColumns}>
            <Field label="Tên hoạt động">
              <input value={item.name} onChange={(event) => onUpdate(item.id, { name: event.target.value })} placeholder="Tên chương trình / câu lạc bộ" />
            </Field>
            <Field label="Vai trò">
              <input value={item.role} onChange={(event) => onUpdate(item.id, { role: event.target.value })} placeholder="Thành viên / Trưởng ban..." />
            </Field>
            <Field label="Tổ chức">
              <input value={item.organization} onChange={(event) => onUpdate(item.id, { organization: event.target.value })} placeholder="Tên tổ chức" />
            </Field>
          </div>
          <div className={styles.twoColumns}>
            <MonthYearField label="Bắt đầu" value={item.startDate} onChange={(value) => onUpdate(item.id, { startDate: value })} />
            <MonthYearField label="Kết thúc" value={item.endDate} onChange={(value) => onUpdate(item.id, { endDate: value })} />
          </div>
          <Field label="Mô tả">
            <textarea rows={4} value={item.description} onChange={(event) => onUpdate(item.id, { description: event.target.value })} placeholder="Vai trò, trách nhiệm hoặc kết quả nổi bật." />
          </Field>
        </article>
      ))}
      <button type="button" className={styles.addButton} onClick={onAdd}>＋ Thêm hoạt động</button>
    </div>
  </>
);

export default ActivitiesSection;
