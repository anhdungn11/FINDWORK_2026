import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ResumeEmptyState from "@/features/resume/components/ResumeEmptyState";
import ResumeList from "@/features/resume/components/ResumeList";
import {
  ResumeDeleteDialog,
  ResumeRenameModal,
  ResumeReplaceModal,
} from "@/features/resume/components/ResumeManagementDialogs";
import ResumeUploadModal from "@/features/resume/components/ResumeUploadModal";
import { useResumeCenter } from "@/features/resume/hooks/useResumeCenter";
import type { Resume } from "@/features/resume/types/resume.types";

import styles from "./CvCenterPage.module.css";

const CvCenterPage = () => {
  const navigate = useNavigate();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Resume | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<Resume | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Resume | null>(null);

  const {
    resumes,
    isLoading,
    error,
    canAddResume,
    maxResumeCount,
    addResume,
    setDefaultResume,
    renameResume,
    replaceResume,
    deleteResume,
    retry,
  } = useResumeCenter();

  const handlePreview = (resume: Resume) => {
    navigate(`/cv/${resume.id}/preview`);
  };

  const handleEdit = (resume: Resume) => {
    if (resume.sourceType !== "builder") return;
    navigate(`/cv/${resume.id}/edit`);
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Candidate · CV Center</span>
            <h1>CV của tôi</h1>
            <p>
              Quản lý CV dùng để ứng tuyển. CV mặc định sẽ được chọn sẵn khi
              bạn bắt đầu một đơn ứng tuyển mới.
            </p>
          </div>

          <div className={styles.heroActions}>
            <span className={styles.counter}>
              {resumes.length}/{maxResumeCount} CV
            </span>
            <button
              type="button"
              className={styles.secondaryAddButton}
              onClick={() => setIsUploadOpen(true)}
              disabled={!canAddResume}
            >
              Tải PDF
            </button>
            <button
              type="button"
              className={styles.addButton}
              onClick={() => navigate("/cv/create")}
              disabled={!canAddResume}
            >
              <span aria-hidden="true">＋</span>
              Tạo CV mới
            </button>
          </div>
        </header>

        <section className={styles.infoStrip}>
          <div className={styles.infoIcon} aria-hidden="true">i</div>
          <div>
            <strong>CV của bạn là dữ liệu riêng tư</strong>
            <p>
              FINDWORK không tự động công khai toàn bộ CV. Quyền hiển thị với
              nhà tuyển dụng được kiểm soát riêng trong phần quyền riêng tư.
            </p>
          </div>
        </section>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void retry()}>
              Thử lại
            </button>
          </div>
        )}

        {!canAddResume && (
          <div className={styles.limitNotice}>
            Bạn đã đạt giới hạn {maxResumeCount} CV. Hãy quản lý CV hiện có
            trước khi thêm CV mới.
          </div>
        )}

        {isLoading ? (
          <section className={styles.loadingCard}>Đang tải danh sách CV...</section>
        ) : resumes.length === 0 ? (
          <ResumeEmptyState onAddResume={() => setIsUploadOpen(true)} />
        ) : (
          <ResumeList
            resumes={resumes}
            onPreview={handlePreview}
            onEdit={handleEdit}
            onReplace={setReplaceTarget}
            onRename={setRenameTarget}
            onDelete={setDeleteTarget}
            onSetDefault={setDefaultResume}
          />
        )}
      </div>

      <ResumeUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmit={addResume}
      />

      <ResumeRenameModal
        resume={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSubmit={renameResume}
      />

      <ResumeReplaceModal
        resume={replaceTarget}
        onClose={() => setReplaceTarget(null)}
        onSubmit={replaceResume}
      />

      <ResumeDeleteDialog
        resume={deleteTarget}
        hasOtherResumes={resumes.length > 1}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteResume}
      />
    </main>
  );
};

export default CvCenterPage;
