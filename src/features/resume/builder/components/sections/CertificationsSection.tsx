import type { ResumeBuilderCertificationItem } from "@/features/resume/types/resume.types";
import MonthYearField from "@/features/resume/builder/components/fields/MonthYearField";
import { EmptyState, Field, ItemHeader, SectionHeader } from "./section.helpers";
import styles from "../ResumeEditor.module.css";

interface Props {
  items: ResumeBuilderCertificationItem[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<ResumeBuilderCertificationItem>) => void;
  onRemove: (id: string) => void;
}

const CertificationsSection = ({ items, onAdd, onUpdate, onRemove }: Props) => (
  <>
    <SectionHeader
      eyebrow="Chứng nhận"
      title="Chứng chỉ & giấy phép"
      description="Dùng cho chứng chỉ nghề nghiệp, giấy phép hành nghề, khóa đào tạo có chứng nhận hoặc tiêu chuẩn chuyên môn."
      optional
    />
    <div className={styles.sectionBody}>
      {items.length === 0 && (
        <EmptyState title="Chưa có chứng chỉ">
          Mục này phù hợp với nhiều ngành như tài chính, kỹ thuật, y tế, giáo dục, ngoại ngữ, quản lý, vận hành...
        </EmptyState>
      )}
      {items.map((item, index) => (
        <article className={styles.itemCard} key={item.id}>
          <ItemHeader
            eyebrow={`Chứng chỉ ${index + 1}`}
            title={item.name || "Tên chứng chỉ"}
            subtitle={item.issuer}
            onRemove={() => onRemove(item.id)}
          />
          <div className={styles.twoColumns}>
            <Field label="Tên chứng chỉ / giấy phép">
              <input
                value={item.name}
                onChange={(event) => onUpdate(item.id, { name: event.target.value })}
                placeholder="Tên chứng chỉ"
              />
            </Field>
            <Field label="Đơn vị cấp">
              <input
                value={item.issuer}
                onChange={(event) => onUpdate(item.id, { issuer: event.target.value })}
                placeholder="Tổ chức cấp"
              />
            </Field>
            <MonthYearField
              label="Ngày cấp"
              value={item.issueDate}
              onChange={(value) => onUpdate(item.id, { issueDate: value })}
            />
            <Field label="Mã chứng nhận">
              <input
                value={item.credentialId}
                onChange={(event) => onUpdate(item.id, { credentialId: event.target.value })}
                placeholder="Credential ID"
              />
            </Field>
          </div>
          <Field label="Liên kết xác minh">
            <input
              value={item.credentialUrl}
              onChange={(event) => onUpdate(item.id, { credentialUrl: event.target.value })}
              placeholder="https://..."
            />
          </Field>
        </article>
      ))}
      <button type="button" className={styles.addButton} onClick={onAdd}>＋ Thêm chứng chỉ</button>
    </div>
  </>
);

export default CertificationsSection;
