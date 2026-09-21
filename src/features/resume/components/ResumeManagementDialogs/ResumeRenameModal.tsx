import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

import type { Resume } from "@/features/resume/types/resume.types";

import styles from "./ResumeManagementDialogs.module.css";

interface ResumeRenameModalProps {
  resume: Resume | null;
  onClose: () => void;
  onSubmit: (resumeId: string, name: string) => Promise<boolean>;
}

const ResumeRenameModal = ({
  resume,
  onClose,
  onSubmit,
}: ResumeRenameModalProps) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(resume?.name ?? "");
    setError("");
    setIsSubmitting(false);
  }, [resume]);

  if (!resume) return null;

  const handleSubmit = async () => {
    const nextName = name.trim();

    if (!nextName) {
      setError("Tên CV không được để trống.");
      return;
    }

    if (nextName === resume.name) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmit(resume.id, nextName);
    setIsSubmitting(false);

    if (success) onClose();
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-rename-title"
        onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Quản lý CV</span>
            <h2 id="resume-rename-title">Đổi tên CV</h2>
            <p>Đổi tên quản lý không làm thay đổi nội dung hay file CV.</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Đóng">×</button>
        </div>

        <div className={styles.body}>
          <label className={styles.field}>
            <span>Tên CV</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoFocus />
            <small>Ví dụ: CV Kế toán tổng hợp · CV Marketing · CV Thực tập.</small>
          </label>
          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>Hủy</button>
          <button type="button" className={styles.primaryButton} disabled={isSubmitting} onClick={() => void handleSubmit()}>
            {isSubmitting ? "Đang lưu..." : "Lưu tên CV"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ResumeRenameModal;
