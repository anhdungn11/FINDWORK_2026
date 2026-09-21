import type { ResumeBuilderVolunteerItem } from "@/features/resume/types/resume.types";
import { VIETNAM_LOCATION_OPTIONS } from "@/features/resume/builder/data/resumeBuilderOptions";
import MonthYearField from "@/features/resume/builder/components/fields/MonthYearField";
import SearchableSelectField from "@/features/resume/builder/components/fields/SearchableSelectField";
import { EmptyState, Field, ItemHeader, SectionHeader } from "./section.helpers";
import styles from "../ResumeEditor.module.css";

interface Props {
  items: ResumeBuilderVolunteerItem[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<ResumeBuilderVolunteerItem>) => void;
  onRemove: (id: string) => void;
}

const VolunteeringSection = ({ items, onAdd, onUpdate, onRemove }: Props) => (
  <>
    <SectionHeader
      eyebrow="Cộng đồng"
      title="Hoạt động tình nguyện"
      description="Thêm khi hoạt động tình nguyện thể hiện kỹ năng, trách nhiệm xã hội hoặc kinh nghiệm liên quan."
      optional
    />
    <div className={styles.sectionBody}>
      {items.length === 0 && (
        <EmptyState title="Chưa có hoạt động tình nguyện">
          Mục này hoàn toàn tùy chọn và có thể ẩn khỏi CV.
        </EmptyState>
      )}
      {items.map((item, index) => (
        <article className={styles.itemCard} key={item.id}>
          <ItemHeader
            eyebrow={`Tình nguyện ${index + 1}`}
            title={item.role || "Vai trò"}
            subtitle={item.organization}
            onRemove={() => onRemove(item.id)}
          />
          <div className={styles.twoColumns}>
            <Field label="Vai trò">
              <input value={item.role} onChange={(event) => onUpdate(item.id, { role: event.target.value })} placeholder="Vai trò của bạn" />
            </Field>
            <Field label="Tổ chức">
              <input value={item.organization} onChange={(event) => onUpdate(item.id, { organization: event.target.value })} placeholder="Tên tổ chức / chương trình" />
            </Field>
            <SearchableSelectField
              label="Khu vực"
              value={item.location}
              options={VIETNAM_LOCATION_OPTIONS}
              placeholder="Tìm tỉnh / thành phố"
              customLabel="khu vực khác"
              onChange={(value) => onUpdate(item.id, { location: value })}
            />
          </div>
          <div className={styles.twoColumns}>
            <MonthYearField label="Bắt đầu" value={item.startDate} onChange={(value) => onUpdate(item.id, { startDate: value })} />
            <MonthYearField label="Kết thúc" value={item.endDate} onChange={(value) => onUpdate(item.id, { endDate: value })} />
          </div>
          <Field label="Mô tả">
            <textarea rows={4} value={item.description} onChange={(event) => onUpdate(item.id, { description: event.target.value })} placeholder="Mô tả ngắn trách nhiệm và đóng góp." />
          </Field>
        </article>
      ))}
      <button type="button" className={styles.addButton} onClick={onAdd}>＋ Thêm hoạt động tình nguyện</button>
    </div>
  </>
);

export default VolunteeringSection;
