import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ResumeTemplateDocument from "@/features/resume/builder/components/ResumeTemplateDocument";
import { resumeService } from "@/features/resume/services/resumeService";
import type { Resume } from "@/features/resume/types/resume.types";

import styles from "./ResumePreviewPage.module.css";

const PAPER_WIDTH = 794;

const ResumePreviewPage = () => {
  const navigate = useNavigate();
  const { resumeId } = useParams();

  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [scale, setScale] = useState(0.9);

  useEffect(() => {
    if (!resumeId) {
      setError("Thiếu mã CV cần xem trước.");
      setIsLoading(false);
      return;
    }

    let active = true;

    void resumeService.getById(resumeId).then((item) => {
      if (!active) return;

      if (!item) {
        setError(
          "Không tìm thấy CV trong phiên hiện tại. Nếu bạn vừa tải lại trang, hãy quay về CV Center và mở lại CV.",
        );
      } else {
        setResume(item);
      }

      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [resumeId]);

  const canEdit = resume?.sourceType === "builder";

  return (
    <main className={styles.page}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarIdentity}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate("/cv")}
          >
            ← CV của tôi
          </button>

          <div>
            <span>XEM TRƯỚC CV</span>
            <strong>{resume?.name ?? "FINDWORK"}</strong>
          </div>
        </div>

        {resume && (
          <div className={styles.toolbarActions}>
            {resume.sourceType === "builder" && (
              <div className={styles.zoomGroup}>
                <button
                  type="button"
                  onClick={() =>
                    setScale((current) => Math.max(0.55, current - 0.1))
                  }
                >
                  −
                </button>
                <b>{Math.round(scale * 100)}%</b>
                <button
                  type="button"
                  onClick={() =>
                    setScale((current) => Math.min(1.1, current + 0.1))
                  }
                >
                  +
                </button>
                <button type="button" onClick={() => setScale(0.9)}>
                  Vừa trang
                </button>
              </div>
            )}

            <span className={styles.versionBadge}>
              Phiên bản {resume.currentVersion.versionNumber}
            </span>

            {canEdit && (
              <button
                type="button"
                className={styles.editButton}
                onClick={() => navigate(`/cv/${resume.id}/edit`)}
              >
                Chỉnh sửa
              </button>
            )}

            <button
              type="button"
              className={styles.printButton}
              onClick={() => window.print()}
            >
              In / Lưu PDF
            </button>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className={styles.stateCard}>Đang tải bản xem trước...</div>
      ) : error || !resume ? (
        <div className={styles.stateCard}>
          <strong>{error || "Không thể xem trước CV."}</strong>
          <button type="button" onClick={() => navigate("/cv")}>
            Quay lại CV Center
          </button>
        </div>
      ) : (
        <PreviewContent resume={resume} scale={scale} />
      )}
    </main>
  );
};

const PreviewContent = ({
  resume,
  scale,
}: {
  resume: Resume;
  scale: number;
}) => {
  if (resume.sourceType === "uploaded") {
    const previewUrl = resume.currentVersion.file?.previewUrl;

    if (!previewUrl) {
      return (
        <div className={styles.stateCard}>File PDF hiện không khả dụng.</div>
      );
    }

    return (
      <section className={styles.pdfStage}>
        <iframe title={`Xem trước ${resume.name}`} src={previewUrl} />
      </section>
    );
  }

  const { builderContent, builderSettings, templateCode } =
    resume.currentVersion;

  if (!builderContent || !builderSettings || !templateCode) {
    return (
      <div className={styles.stateCard}>
        Dữ liệu CV Builder không đầy đủ.
      </div>
    );
  }

  const style = {
    "--preview-page-scale": scale,
    "--preview-page-width": `${PAPER_WIDTH * scale}px`,
  } as CSSProperties;

  return (
    <section className={styles.builderStage}>
      <div className={styles.paperScaler} style={style}>
        <div className={styles.paperViewport}>
          <ResumeTemplateDocument
            content={builderContent}
            settings={builderSettings}
            templateCode={templateCode}
          />
        </div>
      </div>
    </section>
  );
};

export default ResumePreviewPage;
