import type { ResumeBuilderLanguageItem } from "@/features/resume/types/resume.types";
import {
  LANGUAGE_LEVEL_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/features/resume/builder/data/resumeBuilderOptions";
import SearchableSelectField from "@/features/resume/builder/components/fields/SearchableSelectField";
import { EmptyState, Field, ItemHeader, SectionHeader } from "./section.helpers";
import styles from "../ResumeEditor.module.css";

interface Props {
  items: ResumeBuilderLanguageItem[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<ResumeBuilderLanguageItem>) => void;
  onRemove: (id: string) => void;
}

const LanguagesSection = ({ items, onAdd, onUpdate, onRemove }: Props) => (
  <>
    <SectionHeader
      eyebrow="Ngoại ngữ"
      title="Ngoại ngữ"
      description="Chọn ngôn ngữ và mức độ sử dụng từ danh sách chuẩn. Chứng chỉ hoặc điểm số chỉ cần nhập khi bạn thực sự có."
      optional
    />
    <div className={styles.sectionBody}>
      {items.length === 0 && (
        <EmptyState title="Chưa có ngoại ngữ">
          Thêm khi ngoại ngữ có liên quan đến vị trí hoặc môi trường làm việc.
        </EmptyState>
      )}

      {items.map((item, index) => (
        <article className={styles.itemCard} key={item.id}>
          <ItemHeader
            eyebrow={`Ngoại ngữ ${index + 1}`}
            title={item.name || "Ngôn ngữ"}
            onRemove={() => onRemove(item.id)}
          />
          <div className={styles.twoColumns}>
            <SearchableSelectField
              label="Ngôn ngữ"
              value={item.name}
              options={LANGUAGE_OPTIONS}
              placeholder="Tìm ngôn ngữ"
              customLabel="ngôn ngữ khác"
              onChange={(value) => onUpdate(item.id, { name: value })}
            />
            <Field label="Trình độ">
              <select
                value={item.level}
                onChange={(event) => onUpdate(item.id, { level: event.target.value })}
              >
                <option value="">Chọn trình độ</option>
                {LANGUAGE_LEVEL_OPTIONS.map((option) => (
                  <option value={option} key={option}>{option}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Chứng chỉ / điểm số">
            <input
              value={item.certificate}
              onChange={(event) => onUpdate(item.id, { certificate: event.target.value })}
              placeholder="Ví dụ: IELTS 6.5, TOEIC 800, JLPT N2"
            />
          </Field>
        </article>
      ))}

      <button type="button" className={styles.addButton} onClick={onAdd}>
        ＋ Thêm ngoại ngữ
      </button>
    </div>
  </>
);

export default LanguagesSection;
