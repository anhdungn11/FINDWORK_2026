import type { ResumeBuilderContent, ResumeBuilderLinkItem } from "@/features/resume/types/resume.types";
import {
  JOB_TITLE_OPTIONS,
  LINK_TYPE_OPTIONS,
  VIETNAM_LOCATION_OPTIONS,
} from "@/features/resume/builder/data/resumeBuilderOptions";
import SearchableSelectField from "@/features/resume/builder/components/fields/SearchableSelectField";
import { Field, SectionHeader } from "./section.helpers";
import styles from "../ResumeEditor.module.css";

interface Props {
  content: ResumeBuilderContent;
  onChange: <K extends keyof ResumeBuilderContent>(key: K, value: ResumeBuilderContent[K]) => void;
  onPhotoFileChange: (file: File | null) => void;
  onAddLink: () => void;
  onUpdateLink: (id: string, patch: Partial<ResumeBuilderLinkItem>) => void;
  onRemoveLink: (id: string) => void;
}

const BasicsSection = ({ content, onChange, onPhotoFileChange, onAddLink, onUpdateLink, onRemoveLink }: Props) => (
  <>
    <SectionHeader
      eyebrow="Hồ sơ cơ bản"
      title="Thông tin cá nhân"
      description="Ưu tiên chọn dữ liệu chuẩn từ danh sách để hồ sơ thống nhất và dễ dùng cho tìm kiếm, matching và CV về sau. Chỉ nhập thủ công khi danh sách chưa có lựa chọn phù hợp."
    />

    <div className={styles.sectionBody}>
      <div className={styles.formSectionCard}>
        <div className={styles.formSectionHeading}>
          <div>
            <strong>Thông tin chính</strong>
            <p>Nhà tuyển dụng thường quét phần này trong vài giây đầu.</p>
          </div>
          <span className={styles.requiredBadge}>Cốt lõi</span>
        </div>

        <div className={styles.twoColumns}>
          <Field label="Họ và tên" required>
            <input
              value={content.fullName}
              onChange={(event) => onChange("fullName", event.target.value)}
              placeholder="Nguyễn Văn A"
            />
          </Field>

          <SearchableSelectField
            label="Chức danh / vị trí mục tiêu"
            value={content.professionalTitle}
            options={JOB_TITLE_OPTIONS}
            placeholder="Tìm vị trí, ví dụ: Kế toán viên"
            customLabel="vị trí khác"
            required
            onChange={(value) => onChange("professionalTitle", value)}
            hint="Chọn từ danh sách trước. Nếu chưa có vị trí phù hợp, dùng mục ‘Nhập vị trí khác’."
          />

          <Field label="Email">
            <input
              type="email"
              value={content.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="email@example.com"
            />
          </Field>

          <Field label="Số điện thoại">
            <input
              value={content.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              placeholder="09xx xxx xxx"
            />
          </Field>
        </div>

        <SearchableSelectField
          label="Khu vực hiện tại"
          value={content.location}
          options={VIETNAM_LOCATION_OPTIONS}
          placeholder="Tìm tỉnh / thành phố"
          customLabel="khu vực khác"
          onChange={(value) => onChange("location", value)}
        />
      </div>

      <div className={styles.formSectionCard}>
        <div className={styles.formSectionHeading}>
          <div>
            <strong>Ảnh đại diện</strong>
            <p>Tùy chọn. Chỉ dùng khi phù hợp với thị trường hoặc vị trí ứng tuyển.</p>
          </div>
        </div>
        <div className={styles.photoRow}>
          <div className={styles.photoPreview}>
            {content.photoDataUrl ? (
              <img src={content.photoDataUrl} alt="Ảnh đại diện CV" />
            ) : (
              <span>{content.fullName.trim().slice(0, 1).toUpperCase() || "CV"}</span>
            )}
          </div>
          <div className={styles.photoMeta}>
            <strong>JPG, PNG hoặc WebP</strong>
            <p>Tối đa 2 MB. Bạn có thể tắt ảnh trong phần Mẫu & thiết kế.</p>
            <div className={styles.inlineActions}>
              <label className={styles.fileButton}>
                Chọn ảnh
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => onPhotoFileChange(event.target.files?.[0] ?? null)}
                />
              </label>
              {content.photoDataUrl && (
                <button type="button" className={styles.textButton} onClick={() => onPhotoFileChange(null)}>
                  Xóa ảnh
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.formSectionCard}>
        <div className={styles.formSectionHeading}>
          <div>
            <strong>Liên kết nghề nghiệp</strong>
            <p>Chọn loại liên kết phổ biến trước; chỉ nhập tên khác khi thật sự cần.</p>
          </div>
          <button type="button" className={styles.compactAddButton} onClick={onAddLink}>
            ＋ Thêm liên kết
          </button>
        </div>

        {content.links.length === 0 ? (
          <div className={styles.inlineEmpty}>
            Chưa có liên kết. Có thể thêm LinkedIn, Portfolio, Website cá nhân, Behance, GitHub hoặc nền tảng phù hợp với nghề của bạn.
          </div>
        ) : (
          content.links.map((link, index) => (
            <div className={styles.linkRow} key={link.id}>
              <span className={styles.rowIndex}>{index + 1}</span>
              <SearchableSelectField
                label="Loại liên kết"
                value={link.label}
                options={LINK_TYPE_OPTIONS}
                placeholder="Chọn loại liên kết"
                customLabel="loại liên kết khác"
                onChange={(value) => onUpdateLink(link.id, { label: value })}
              />
              <Field label="Đường dẫn">
                <input
                  value={link.url}
                  onChange={(event) => onUpdateLink(link.id, { url: event.target.value })}
                  placeholder="https://..."
                />
              </Field>
              <button
                type="button"
                className={styles.iconRemoveButton}
                onClick={() => onRemoveLink(link.id)}
                aria-label="Xóa liên kết"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  </>
);

export default BasicsSection;
