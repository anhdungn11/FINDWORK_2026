import type { ResumeBuilderProjectItem } from "@/features/resume/types/resume.types";
import MonthYearField from "@/features/resume/builder/components/fields/MonthYearField";
import {
  EmptyState,
  Field,
  ItemHeader,
  joinComma,
  joinLines,
  SectionHeader,
  splitComma,
  splitLines,
} from "./section.helpers";
import styles from "../ResumeEditor.module.css";

interface Props {
  items: ResumeBuilderProjectItem[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<ResumeBuilderProjectItem>) => void;
  onRemove: (id: string) => void;
}

const ProjectsSection = ({ items, onAdd, onUpdate, onRemove }: Props) => (
  <>
    <SectionHeader
      eyebrow="Nổi bật"
      title="Dự án / công việc nổi bật"
      description="Có thể dùng cho dự án học tập, case study, chiến dịch, hồ sơ công trình, sản phẩm, nghiên cứu hoặc nhiệm vụ nổi bật — không giới hạn ngành nghề."
      optional
    />
    <div className={styles.sectionBody}>
      {items.length === 0 && (
        <EmptyState title="Chưa có dự án / công việc nổi bật">
          Bỏ qua nếu không phù hợp, hoặc thêm những công việc giúp chứng minh năng lực cụ thể.
        </EmptyState>
      )}

      {items.map((item, index) => (
        <article className={styles.itemCard} key={item.id}>
          <ItemHeader
            eyebrow={`Mục ${index + 1}`}
            title={item.name || "Tên dự án / công việc"}
            subtitle={item.organization}
            onRemove={() => onRemove(item.id)}
          />
          <div className={styles.twoColumns}>
            <Field label="Tên dự án / công việc">
              <input
                value={item.name}
                onChange={(event) => onUpdate(item.id, { name: event.target.value })}
                placeholder="Tên dự án, chiến dịch, công trình..."
              />
            </Field>
            <Field label="Vai trò">
              <input
                value={item.role}
                onChange={(event) => onUpdate(item.id, { role: event.target.value })}
                placeholder="Vai trò của bạn"
              />
            </Field>
            <Field label="Đơn vị / khách hàng">
              <input
                value={item.organization}
                onChange={(event) => onUpdate(item.id, { organization: event.target.value })}
                placeholder="Tổ chức / khách hàng / nhóm"
              />
            </Field>
            <Field label="Liên kết">
              <input
                value={item.link}
                onChange={(event) => onUpdate(item.id, { link: event.target.value })}
                placeholder="Portfolio / tài liệu / website"
              />
            </Field>
            <MonthYearField
              label="Bắt đầu"
              value={item.startDate}
              onChange={(value) => onUpdate(item.id, { startDate: value })}
            />
            <MonthYearField
              label="Kết thúc"
              value={item.endDate}
              onChange={(value) => onUpdate(item.id, { endDate: value })}
            />
          </div>
          <Field label="Từ khóa / công cụ / phạm vi" hint="Nhập cách nhau bằng dấu phẩy.">
            <input
              value={joinComma(item.tags)}
              onChange={(event) => onUpdate(item.id, { tags: splitComma(event.target.value) })}
              placeholder="Ví dụ: Nghiên cứu thị trường, Excel, Quản lý tiến độ..."
            />
          </Field>
          <Field label="Kết quả / đóng góp" hint="Mỗi dòng là một bullet.">
            <textarea
              rows={6}
              value={joinLines(item.highlights)}
              onChange={(event) => onUpdate(item.id, { highlights: splitLines(event.target.value) })}
              placeholder={"Thực hiện ...\nĐạt ...\nCải thiện ..."}
            />
          </Field>
        </article>
      ))}
      <button type="button" className={styles.addButton} onClick={onAdd}>＋ Thêm dự án / công việc</button>
    </div>
  </>
);

export default ProjectsSection;
