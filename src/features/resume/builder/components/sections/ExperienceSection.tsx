import type { ResumeBuilderExperienceItem } from "@/features/resume/types/resume.types";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  JOB_TITLE_OPTIONS,
  VIETNAM_LOCATION_OPTIONS,
} from "@/features/resume/builder/data/resumeBuilderOptions";
import MonthYearField from "@/features/resume/builder/components/fields/MonthYearField";
import SearchableSelectField from "@/features/resume/builder/components/fields/SearchableSelectField";
import { EmptyState, Field, ItemHeader, joinLines, SectionHeader, splitLines } from "./section.helpers";
import styles from "../ResumeEditor.module.css";

interface Props {
  items: ResumeBuilderExperienceItem[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<ResumeBuilderExperienceItem>) => void;
  onRemove: (id: string) => void;
}

const ExperienceSection = ({ items, onAdd, onUpdate, onRemove }: Props) => (
  <>
    <SectionHeader
      eyebrow="Kinh nghiệm"
      title="Kinh nghiệm làm việc"
      description="Chọn các giá trị chuẩn khi có thể; công ty và thành tựu vẫn là nội dung riêng của bạn. Thời gian được tách rõ tháng và năm để tránh nhập sai định dạng."
    />

    <div className={styles.sectionBody}>
      {items.length === 0 && (
        <EmptyState title="Chưa có kinh nghiệm">
          Bạn có thể bỏ qua mục này hoặc thêm thực tập, công việc bán thời gian, freelance hay kinh nghiệm liên quan.
        </EmptyState>
      )}

      {items.map((item, index) => (
        <article className={styles.itemCard} key={item.id}>
          <ItemHeader
            eyebrow={`Kinh nghiệm ${index + 1}`}
            title={item.position || "Vị trí chưa đặt tên"}
            subtitle={item.company || "Chưa có đơn vị"}
            onRemove={() => onRemove(item.id)}
          />

          <div className={styles.twoColumns}>
            <SearchableSelectField
              label="Vị trí / vai trò"
              value={item.position}
              options={JOB_TITLE_OPTIONS}
              placeholder="Tìm vị trí công việc"
              customLabel="vị trí khác"
              onChange={(value) => onUpdate(item.id, { position: value })}
            />

            <Field label="Công ty / tổ chức">
              <input
                value={item.company}
                onChange={(event) => onUpdate(item.id, { company: event.target.value })}
                placeholder="Tên doanh nghiệp / tổ chức"
              />
            </Field>

            <SearchableSelectField
              label="Khu vực"
              value={item.location}
              options={VIETNAM_LOCATION_OPTIONS}
              placeholder="Tìm tỉnh / thành phố"
              customLabel="khu vực khác"
              onChange={(value) => onUpdate(item.id, { location: value })}
            />

            <Field label="Loại hình công việc">
              <select
                value={item.employmentType}
                onChange={(event) => onUpdate(item.id, { employmentType: event.target.value })}
              >
                <option value="">Chọn loại hình</option>
                {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                  <option value={option} key={option}>{option}</option>
                ))}
              </select>
            </Field>

            <MonthYearField
              label="Bắt đầu"
              value={item.startDate}
              onChange={(value) => onUpdate(item.id, { startDate: value })}
            />

            <MonthYearField
              label="Kết thúc"
              value={item.endDate}
              disabled={item.isCurrent}
              onChange={(value) => onUpdate(item.id, { endDate: value })}
            />
          </div>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={item.isCurrent}
              onChange={(event) => onUpdate(item.id, {
                isCurrent: event.target.checked,
                endDate: event.target.checked ? "" : item.endDate,
              })}
            />
            <span>Tôi đang làm việc tại đây</span>
          </label>

          <Field
            label="Trách nhiệm & thành tựu"
            hint="Mỗi dòng sẽ hiển thị thành một bullet trên CV. Ưu tiên kết quả cụ thể thay vì chỉ liệt kê nhiệm vụ."
          >
            <textarea
              rows={7}
              value={joinLines(item.highlights)}
              onChange={(event) => onUpdate(item.id, { highlights: splitLines(event.target.value) })}
              placeholder={"Ví dụ:\nTăng doanh số nhóm 18% trong 6 tháng\nRút ngắn thời gian xử lý đơn hàng từ 2 ngày xuống 1 ngày"}
            />
          </Field>
        </article>
      ))}

      <button type="button" className={styles.addButton} onClick={onAdd}>
        ＋ Thêm kinh nghiệm
      </button>
    </div>
  </>
);

export default ExperienceSection;
