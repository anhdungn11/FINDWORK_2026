import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ResumeTemplateDocument from "@/features/resume/builder/components/ResumeTemplateDocument";
import { resumeService } from "@/features/resume/services/resumeService";
import type { Resume } from "@/features/resume/types/resume.types";

import styles from "./ResumePreviewPage.module.css";

const ResumePreviewPage = () => {
  const navigate = useNavigate();
  const { resumeId } = useParams();
  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!resumeId) {
      setError("Thiếu mã CV cần xem trước.");
      setIsLoading(false);
      return;
    }

    let active = true;

    void resumeService.getById(resumeId).then((item) => {
      if (!active) return;

      if (!item) setError("Không tìm thấy CV cần xem trước.");
      else setResume(item);

      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [resumeId]);

  return (
    <main className={styles.page}>
      <header className={styles.toolbar}>
        <div>
          <button type="button" onClick={() => navigate("/cv")}>← CV của tôi</button>
          <div>
            <span>Xem trước CV</span>
            <strong>{resume?.name ?? "FINDWORK"}</strong>
          </div>
        </div>

        {resume && (
          <div className={styles.versionBadge}>
            Phiên bản {resume.currentVersion.versionNumber}
          </div>
        )}
      </header>

      {isLoading ? (
        <div className={styles.stateCard}>Đang tải bản xem trước...</div>
      ) : error || !resume ? (
        <div className={styles.stateCard}>
          <strong>{error || "Không thể xem trước CV."}</strong>
          <button type="button" onClick={() => navigate("/cv")}>Quay lại</button>
        </div>
      ) : (
        <PreviewContent resume={resume} />
      )}
    </main>
  );
};

const PreviewContent = ({ resume }: { resume: Resume }) => {
  if (resume.sourceType === "uploaded") {
    const previewUrl = resume.currentVersion.file?.previewUrl;

    if (!previewUrl) {
      return <div className={styles.stateCard}>File PDF hiện không khả dụng.</div>;
    }

    return (
      <section className={styles.pdfStage}>
        <iframe title={`Xem trước ${resume.name}`} src={previewUrl} />
      </section>
    );
  }

  const { builderContent, builderSettings, templateCode } = resume.currentVersion;

  if (!builderContent || !builderSettings || !templateCode) {
    return <div className={styles.stateCard}>Dữ liệu CV Builder không đầy đủ.</div>;
  }

  return (
    <section className={styles.builderStage}>
      <div className={styles.paperViewport}>
        <ResumeTemplateDocument
          content={builderContent}
          settings={builderSettings}
          templateCode={templateCode}
        />
      </div>
    </section>
  );
};

export default ResumePreviewPage;
