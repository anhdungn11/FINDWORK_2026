import type { ResumeBuilderEducationItem } from "@/features/resume/types/resume.types";
import {
  EDUCATION_DEGREE_OPTIONS,
  MAJOR_OPTIONS,
  VIETNAM_LOCATION_OPTIONS,
} from "@/features/resume/builder/data/resumeBuilderOptions";
import SearchableSelectField from "@/features/resume/builder/components/fields/SearchableSelectField";
import YearSelectField from "@/features/resume/builder/components/fields/YearSelectField";
import { EmptyState, Field, ItemHeader, joinLines, SectionHeader, splitLines } from "./section.helpers";
import styles from "../ResumeEditor.module.css";

interface Props {
  items: ResumeBuilderEducationItem[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<ResumeBuilderEducationItem>) => void;
  onRemove: (id: string) => void;
}

const EducationSection = ({ items, onAdd, onUpdate, onRemove }: Props) => (
  <>
    <SectionHeader
      eyebrow="Học vấn"
      title="Học vấn & đào tạo"
      description="Các trường thông dụng được chọn từ danh sách. Nếu bằng cấp hoặc chuyên ngành của bạn không có, hãy chọn nhập giá trị khác thay vì phải gõ mọi thứ từ đầu."
    />

    <div className={styles.sectionBody}>
      {items.length === 0 && (
        <EmptyState title="Chưa có học vấn">
          Thêm trường học, chương trình đào tạo hoặc khóa học dài hạn phù hợp với hồ sơ của bạn.
        </EmptyState>
      )}

      {items.map((item, index) => (
        <article className={styles.itemCard} key={item.id}>
          <ItemHeader
            eyebrow={`Học vấn ${index + 1}`}
            title={item.school || "Cơ sở đào tạo"}
            subtitle={[item.degree, item.major].filter(Boolean).join(" · ")}
            onRemove={() => onRemove(item.id)}
          />

          <div className={styles.twoColumns}>
            <Field label="Trường / cơ sở đào tạo">
              <input
                value={item.school}
                onChange={(event) => onUpdate(item.id, { school: event.target.value })}
                placeholder="Tên trường / học viện / trung tâm"
              />
            </Field>

            <SearchableSelectField
              label="Bằng cấp / trình độ"
              value={item.degree}
              options={EDUCATION_DEGREE_OPTIONS}
              placeholder="Tìm trình độ"
              customLabel="trình độ khác"
              onChange={(value) => onUpdate(item.id, { degree: value })}
            />

            <SearchableSelectField
              label="Chuyên ngành"
              value={item.major}
              options={MAJOR_OPTIONS}
              placeholder="Tìm chuyên ngành"
              customLabel="chuyên ngành khác"
              onChange={(value) => onUpdate(item.id, { major: value })}
            />

            <SearchableSelectField
              label="Khu vực"
              value={item.location}
              options={VIETNAM_LOCATION_OPTIONS}
              placeholder="Tìm tỉnh / thành phố"
              customLabel="khu vực khác"
              onChange={(value) => onUpdate(item.id, { location: value })}
            />

            <YearSelectField
              label="Năm bắt đầu"
              value={item.startYear}
              onChange={(value) => onUpdate(item.id, { startYear: value })}
            />

            <YearSelectField
              label="Năm kết thúc"
              value={item.endYear}
              disabled={item.isStudying}
              onChange={(value) => onUpdate(item.id, { endYear: value })}
            />
          </div>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={item.isStudying}
              onChange={(event) => onUpdate(item.id, {
                isStudying: event.target.checked,
                endYear: event.target.checked ? "" : item.endYear,
              })}
            />
            <span>Tôi đang học tại đây</span>
          </label>

          <Field label="GPA / xếp loại" hint="Tùy chọn. Có thể nhập GPA theo thang điểm hoặc xếp loại nếu có lợi cho hồ sơ.">
            <input
              value={item.gpa}
              onChange={(event) => onUpdate(item.id, { gpa: event.target.value })}
              placeholder="Ví dụ: 3.4/4.0, 8.2/10 hoặc Giỏi"
            />
          </Field>

          <Field label="Thành tích / môn học nổi bật" hint="Mỗi dòng là một ý.">
            <textarea
              rows={5}
              value={joinLines(item.highlights)}
              onChange={(event) => onUpdate(item.id, { highlights: splitLines(event.target.value) })}
              placeholder={"Học bổng...\nĐồ án / chuyên đề...\nThành tích học tập..."}
            />
          </Field>
        </article>
      ))}

      <button type="button" className={styles.addButton} onClick={onAdd}>
        ＋ Thêm học vấn
      </button>
    </div>
  </>
);

export default EducationSection;
