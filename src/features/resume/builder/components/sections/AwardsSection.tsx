import type { ResumeBuilderAwardItem } from "@/features/resume/types/resume.types";
import MonthYearField from "@/features/resume/builder/components/fields/MonthYearField";
import { EmptyState, Field, ItemHeader, SectionHeader } from "./section.helpers";
import styles from "../ResumeEditor.module.css";

interface Props {
  items: ResumeBuilderAwardItem[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<ResumeBuilderAwardItem>) => void;
  onRemove: (id: string) => void;
}

const AwardsSection = ({ items, onAdd, onUpdate, onRemove }: Props) => (
  <>
    <SectionHeader
      eyebrow="Ghi nhận"
      title="Thành tích & giải thưởng"
      description="Thêm thành tích học tập, nghề nghiệp, doanh số, danh hiệu, giải thưởng hoặc sự ghi nhận có giá trị."
      optional
    />
    <div className={styles.sectionBody}>
      {items.length === 0 && (
        <EmptyState title="Chưa có thành tích / giải thưởng">
          Chỉ thêm những nội dung giúp tăng độ tin cậy hoặc cho thấy kết quả nổi bật.
        </EmptyState>
      )}
      {items.map((item, index) => (
        <article className={styles.itemCard} key={item.id}>
          <ItemHeader
            eyebrow={`Thành tích ${index + 1}`}
            title={item.title || "Tên thành tích"}
            subtitle={item.issuer}
            onRemove={() => onRemove(item.id)}
          />
          <div className={styles.twoColumns}>
            <Field label="Tên thành tích / giải thưởng">
              <input
                value={item.title}
                onChange={(event) => onUpdate(item.id, { title: event.target.value })}
                placeholder="Nhân viên xuất sắc / Giải thưởng..."
              />
            </Field>
            <Field label="Đơn vị ghi nhận">
              <input
                value={item.issuer}
                onChange={(event) => onUpdate(item.id, { issuer: event.target.value })}
                placeholder="Công ty / tổ chức"
              />
            </Field>
          </div>
          <MonthYearField
            label="Thời điểm"
            value={item.date}
            onChange={(value) => onUpdate(item.id, { date: value })}
          />
          <Field label="Mô tả">
            <textarea
              rows={4}
              value={item.description}
              onChange={(event) => onUpdate(item.id, { description: event.target.value })}
              placeholder="Nêu tiêu chí, quy mô hoặc kết quả khiến thành tích này có ý nghĩa."
            />
          </Field>
        </article>
      ))}
      <button type="button" className={styles.addButton} onClick={onAdd}>＋ Thêm thành tích</button>
    </div>
  </>
);

export default AwardsSection;
