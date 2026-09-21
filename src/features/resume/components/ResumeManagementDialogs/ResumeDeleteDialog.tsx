import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

import type { Resume } from "@/features/resume/types/resume.types";

import styles from "./ResumeManagementDialogs.module.css";

interface ResumeDeleteDialogProps {
  resume: Resume | null;
  hasOtherResumes: boolean;
  onClose: () => void;
  onConfirm: (resumeId: string) => Promise<boolean>;
}

const ResumeDeleteDialog = ({
  resume,
  hasOtherResumes,
  onClose,
  onConfirm,
}: ResumeDeleteDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => setIsSubmitting(false), [resume]);

  if (!resume) return null;

  const handleDelete = async () => {
    setIsSubmitting(true);
    const success = await onConfirm(resume.id);
    setIsSubmitting(false);

    if (success) onClose();
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="resume-delete-title"
        onMouseDown={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Xác nhận</span>
            <h2 id="resume-delete-title">Xóa CV?</h2>
            <p>{resume.name}</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Đóng">×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.dangerNotice}>
            CV này sẽ bị xóa khỏi CV Center. Các hồ sơ ứng tuyển đã gửi trước đó phải tiếp tục giữ Resume Snapshot độc lập khi backend được tích hợp.
            {resume.isDefault && hasOtherResumes && (
              <><br /><br />Đây là CV mặc định. Sau khi xóa, CV được cập nhật gần nhất còn lại sẽ tự trở thành CV mặc định.</>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>Giữ lại</button>
          <button type="button" className={styles.dangerButton} disabled={isSubmitting} onClick={() => void handleDelete()}>
            {isSubmitting ? "Đang xóa..." : "Xóa CV"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ResumeDeleteDialog;
