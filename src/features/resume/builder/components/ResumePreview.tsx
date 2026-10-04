import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type {
  ResumeBuilderContent,
  ResumeBuilderSettings,
  ResumeTemplateCode,
} from "@/features/resume/types/resume.types";

import ResumeTemplateDocument from "./ResumeTemplateDocument";
import styles from "./ResumePreview.module.css";

interface Props {
  content: ResumeBuilderContent;
  settings: ResumeBuilderSettings;
  templateCode: ResumeTemplateCode;
}

const PAPER_WIDTH = 794;
const PAPER_HEIGHT = 1123;
const MIN_SCALE = 0.45;
const MAX_SCALE = 1;

const clampScale = (value: number) =>
  Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));

const ResumePreview = ({
  content,
  settings,
  templateCode,
}: Props) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);

  const [scale, setScale] = useState(0.72);
  const [fitScale, setFitScale] = useState(0.72);
  const [paperHeight, setPaperHeight] = useState(PAPER_HEIGHT);
  const [isAutoFit, setIsAutoFit] = useState(true);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const paper = paperRef.current;

    if (!stage || !paper) return;

    const update = () => {
      const availableWidth = Math.max(stage.clientWidth - 52, 320);
      const nextFitScale = clampScale(
        Math.min(0.92, availableWidth / PAPER_WIDTH),
      );

      setFitScale(nextFitScale);

      if (isAutoFit) {
        setScale(nextFitScale);
      }

      setPaperHeight(Math.max(PAPER_HEIGHT, paper.scrollHeight));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(stage);
    observer.observe(paper);

    return () => observer.disconnect();
  }, [content, settings, templateCode, isAutoFit]);

  const pages = Math.max(1, Math.ceil(paperHeight / PAPER_HEIGHT));

  const vars = {
    "--preview-scale": scale,
    "--preview-height": `${paperHeight * scale}px`,
  } as CSSProperties;

  const handleZoom = (delta: number) => {
    setIsAutoFit(false);
    setScale((current) => clampScale(current + delta));
  };

  const handleFit = () => {
    setIsAutoFit(true);
    setScale(fitScale);
  };

  return (
    <section className={styles.previewPanel}>
      <div className={styles.previewToolbar}>
        <div className={styles.previewTitle}>
          <span>LIVE PREVIEW</span>
          <strong>
            A4 · {pages} {pages === 1 ? "trang" : "trang"}
          </strong>
        </div>

        <div className={styles.previewControls}>
          <button
            type="button"
            onClick={() => handleZoom(-0.08)}
            aria-label="Thu nhỏ CV"
          >
            −
          </button>

          <b>{Math.round(scale * 100)}%</b>

          <button
            type="button"
            onClick={() => handleZoom(0.08)}
            aria-label="Phóng to CV"
          >
            +
          </button>

          <button
            type="button"
            className={styles.fitButton}
            onClick={handleFit}
          >
            Vừa khung
          </button>
        </div>
      </div>

      <div className={styles.previewStage} ref={stageRef}>
        <div className={styles.paperViewport} style={vars}>
          <div className={styles.resumePaper} ref={paperRef}>
            <ResumeTemplateDocument
              content={content}
              settings={settings}
              templateCode={templateCode}
            />

            {pages > 1 && (
              <div className={styles.pageGuides} aria-hidden="true">
                {Array.from({ length: pages - 1 }, (_, index) => (
                  <span
                    key={index}
                    style={{ top: `${(index + 1) * PAPER_HEIGHT}px` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResumePreview;
