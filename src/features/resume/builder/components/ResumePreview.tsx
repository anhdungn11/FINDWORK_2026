import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import type {
  ResumeBuilderContent,
  ResumeBuilderEducationItem,
  ResumeBuilderExperienceItem,
  ResumeTemplateCode,
} from "@/features/resume/types/resume.types";

import styles from "./ResumeBuilder.module.css";

interface ResumePreviewProps {
  content: ResumeBuilderContent;
  templateCode: ResumeTemplateCode;
}

const PAPER_WIDTH = 794;
const PAPER_MIN_HEIGHT = 1123;

const ResumePreview = ({ content, templateCode }: ResumePreviewProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(0.72);
  const [paperHeight, setPaperHeight] = useState(PAPER_MIN_HEIGHT);

  useEffect(() => {
    const stage = stageRef.current;
    const paper = paperRef.current;
    if (!stage || !paper) return;

    const updateLayout = () => {
      const availableWidth = Math.max(stage.clientWidth - 40, 320);
      const nextScale = Math.min(0.82, availableWidth / PAPER_WIDTH);
      setScale(Math.max(0.42, nextScale));
      setPaperHeight(Math.max(PAPER_MIN_HEIGHT, paper.scrollHeight));
    };

    updateLayout();

    const observer = new ResizeObserver(updateLayout);
    observer.observe(stage);
    observer.observe(paper);

    return () => observer.disconnect();
  }, [content, templateCode]);

  const stageStyle = {
    "--resume-scale": scale,
    "--resume-scaled-height": `${paperHeight * scale}px`,
  } as CSSProperties;

  return (
    <aside className={styles.previewPanel}>
      <div className={styles.previewToolbar}>
        <div>
          <span className={styles.panelEyebrow}>Xem trước</span>
          <strong>Khổ A4 chuẩn</strong>
        </div>
        <span className={styles.zoomBadge}>{Math.round(scale * 100)}%</span>
      </div>

      <div ref={stageRef} className={styles.previewStage} style={stageStyle}>
        <div className={styles.paperViewport}>
          <article
            ref={paperRef}
            className={`${styles.resumePaper} ${styles[`paper_${templateCode}`]}`}
          >
            <ResumeTemplate content={content} templateCode={templateCode} />
          </article>
        </div>
      </div>
    </aside>
  );
};

const ResumeTemplate = ({
  content,
  templateCode,
}: ResumePreviewProps) => {
  switch (templateCode) {
    case "minimal":
      return <MinimalTemplate content={content} />;
    case "professional":
      return <ProfessionalTemplate content={content} />;
    case "fresher":
      return <FresherTemplate content={content} />;
    case "modern":
    default:
      return <ModernTemplate content={content} />;
  }
};

const ModernTemplate = ({ content }: { content: ResumeBuilderContent }) => (
  <div className={styles.modernLayout}>
    <aside className={styles.modernSidebar}>
      <div className={styles.monogram}>{getInitials(content.fullName)}</div>
      <ContactBlock content={content} variant="sidebar" />

      <TemplateSection title="Kỹ năng" variant="sidebar">
        <SkillList skills={content.skills} variant="bars" />
      </TemplateSection>

      <TemplateSection title="Ngôn ngữ" variant="sidebar">
        <SimpleList values={content.languages} />
      </TemplateSection>
    </aside>

    <main className={styles.modernMain}>
      <ResumeIdentity content={content} />

      <TemplateSection title="Hồ sơ nghề nghiệp">
        <SummaryText value={content.summary} />
      </TemplateSection>

      <TemplateSection title="Kinh nghiệm làm việc">
        <ExperienceList items={content.experience} />
      </TemplateSection>

      <TemplateSection title="Học vấn">
        <EducationList items={content.education} />
      </TemplateSection>
    </main>
  </div>
);

const MinimalTemplate = ({ content }: { content: ResumeBuilderContent }) => (
  <div className={styles.minimalLayout}>
    <header className={styles.minimalHeader}>
      <h1>{content.fullName || "HỌ VÀ TÊN"}</h1>
      <p>{content.professionalTitle || "Vị trí nghề nghiệp"}</p>
      <ContactRow content={content} />
    </header>

    <div className={styles.minimalBody}>
      <TemplateSection title="Giới thiệu">
        <SummaryText value={content.summary} />
      </TemplateSection>

      <TemplateSection title="Kinh nghiệm">
        <ExperienceList items={content.experience} minimal />
      </TemplateSection>

      <TemplateSection title="Học vấn">
        <EducationList items={content.education} minimal />
      </TemplateSection>

      <div className={styles.minimalBottomGrid}>
        <TemplateSection title="Kỹ năng">
          <SkillList skills={content.skills} variant="plain" />
        </TemplateSection>
        <TemplateSection title="Ngôn ngữ">
          <SimpleList values={content.languages} />
        </TemplateSection>
      </div>
    </div>
  </div>
);

const ProfessionalTemplate = ({ content }: { content: ResumeBuilderContent }) => (
  <div className={styles.professionalLayout}>
    <header className={styles.professionalHeader}>
      <div>
        <h1>{content.fullName || "Họ và tên"}</h1>
        <p>{content.professionalTitle || "Vị trí nghề nghiệp"}</p>
      </div>
      <ContactBlock content={content} variant="header" />
    </header>

    <div className={styles.professionalBody}>
      <main className={styles.professionalMain}>
        <TemplateSection title="Tóm tắt chuyên môn">
          <SummaryText value={content.summary} />
        </TemplateSection>
        <TemplateSection title="Kinh nghiệm chuyên môn">
          <ExperienceList items={content.experience} />
        </TemplateSection>
      </main>

      <aside className={styles.professionalSide}>
        <TemplateSection title="Học vấn" variant="compact">
          <EducationList items={content.education} compact />
        </TemplateSection>
        <TemplateSection title="Năng lực" variant="compact">
          <SkillList skills={content.skills} variant="chips" />
        </TemplateSection>
        <TemplateSection title="Ngôn ngữ" variant="compact">
          <SimpleList values={content.languages} />
        </TemplateSection>
      </aside>
    </div>
  </div>
);

const FresherTemplate = ({ content }: { content: ResumeBuilderContent }) => (
  <div className={styles.fresherLayout}>
    <header className={styles.fresherHeader}>
      <div className={styles.fresherIdentity}>
        <span className={styles.fresherMonogram}>{getInitials(content.fullName)}</span>
        <div>
          <h1>{content.fullName || "Họ và tên"}</h1>
          <p>{content.professionalTitle || "Vị trí mong muốn"}</p>
        </div>
      </div>
      <ContactRow content={content} />
    </header>

    <div className={styles.fresherIntro}>
      <span>Mục tiêu nghề nghiệp</span>
      <SummaryText value={content.summary} />
    </div>

    <div className={styles.fresherGrid}>
      <main>
        <TemplateSection title="Học vấn">
          <EducationList items={content.education} timeline />
        </TemplateSection>
        <TemplateSection title="Kinh nghiệm / Thực tập">
          <ExperienceList items={content.experience} timeline />
        </TemplateSection>
      </main>

      <aside>
        <TemplateSection title="Kỹ năng nổi bật" variant="compact">
          <SkillList skills={content.skills} variant="chips" />
        </TemplateSection>
        <TemplateSection title="Ngôn ngữ" variant="compact">
          <SimpleList values={content.languages} />
        </TemplateSection>
      </aside>
    </div>
  </div>
);

const ResumeIdentity = ({ content }: { content: ResumeBuilderContent }) => (
  <header className={styles.resumeIdentity}>
    <span className={styles.identityKicker}>Curriculum Vitae</span>
    <h1>{content.fullName || "Họ và tên"}</h1>
    <p>{content.professionalTitle || "Vị trí nghề nghiệp"}</p>
  </header>
);

const TemplateSection = ({
  title,
  children,
  variant = "default",
}: {
  title: string;
  children: ReactNode;
  variant?: "default" | "sidebar" | "compact";
}) => (
  <section className={`${styles.cvSection} ${styles[`section_${variant}`]}`}>
    <h2>{title}</h2>
    {children}
  </section>
);

const ContactBlock = ({
  content,
  variant,
}: {
  content: ResumeBuilderContent;
  variant: "sidebar" | "header";
}) => {
  const values = [
    ["Email", content.email],
    ["Điện thoại", content.phone],
    ["Khu vực", content.location],
  ].filter(([, value]) => Boolean(value));

  if (values.length === 0) {
    return <p className={styles.placeholderText}>Thêm thông tin liên hệ</p>;
  }

  return (
    <div className={`${styles.contactBlock} ${styles[`contact_${variant}`]}`}>
      {values.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
};

const ContactRow = ({ content }: { content: ResumeBuilderContent }) => {
  const values = [content.email, content.phone, content.location].filter(Boolean);

  return (
    <div className={styles.contactRow}>
      {values.length > 0 ? (
        values.map((value) => <span key={value}>{value}</span>)
      ) : (
        <span>email@example.com · 09xx xxx xxx · Thành phố</span>
      )}
    </div>
  );
};

const SummaryText = ({ value }: { value: string }) => (
  <p className={value ? styles.cvParagraph : styles.placeholderText}>
    {value ||
      "Viết một đoạn ngắn giới thiệu kinh nghiệm, thế mạnh và mục tiêu nghề nghiệp của bạn."}
  </p>
);

const ExperienceList = ({
  items,
  minimal = false,
  timeline = false,
}: {
  items: ResumeBuilderExperienceItem[];
  minimal?: boolean;
  timeline?: boolean;
}) => {
  if (items.length === 0) {
    return <p className={styles.placeholderText}>Chưa có kinh nghiệm được thêm.</p>;
  }

  return (
    <div className={`${styles.entryList} ${timeline ? styles.timelineList : ""}`}>
      {items.map((item) => (
        <article className={styles.cvEntry} key={item.id}>
          <div className={styles.entryHeader}>
            <div>
              <h3>{item.position || "Vị trí"}</h3>
              <strong>{item.company || "Tên công ty"}</strong>
            </div>
            <time>{formatPeriod(item.startDate, item.isCurrent ? "Hiện tại" : item.endDate)}</time>
          </div>
          {item.description && <p>{item.description}</p>}
          {!item.description && !minimal && (
            <p className={styles.placeholderText}>Mô tả trách nhiệm và thành tựu nổi bật.</p>
          )}
        </article>
      ))}
    </div>
  );
};

const EducationList = ({
  items,
  minimal = false,
  compact = false,
  timeline = false,
}: {
  items: ResumeBuilderEducationItem[];
  minimal?: boolean;
  compact?: boolean;
  timeline?: boolean;
}) => {
  if (items.length === 0) {
    return <p className={styles.placeholderText}>Chưa có học vấn được thêm.</p>;
  }

  return (
    <div className={`${styles.entryList} ${timeline ? styles.timelineList : ""}`}>
      {items.map((item) => (
        <article className={`${styles.cvEntry} ${compact ? styles.compactEntry : ""}`} key={item.id}>
          <div className={styles.entryHeader}>
            <div>
              <h3>{item.school || "Tên trường"}</h3>
              <strong>
                {[item.degree, item.major].filter(Boolean).join(" · ") ||
                  "Bằng cấp · Chuyên ngành"}
              </strong>
            </div>
            <time>{formatPeriod(item.startYear, item.endYear)}</time>
          </div>
          {item.description && <p>{item.description}</p>}
          {!item.description && !minimal && !compact && (
            <p className={styles.placeholderText}>Thêm thành tích hoặc thông tin nổi bật.</p>
          )}
        </article>
      ))}
    </div>
  );
};

const SkillList = ({
  skills,
  variant,
}: {
  skills: string[];
  variant: "bars" | "chips" | "plain";
}) => {
  if (skills.length === 0) {
    return <p className={styles.placeholderText}>Chưa thêm kỹ năng.</p>;
  }

  if (variant === "bars") {
    return (
      <div className={styles.skillBars}>
        {skills.map((skill) => (
          <div key={skill}>
            <span>{skill}</span>
            <i><b /></i>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "chips") {
    return (
      <div className={styles.skillChips}>
        {skills.map((skill) => <span key={skill}>{skill}</span>)}
      </div>
    );
  }

  return <p className={styles.inlineValues}>{skills.join(" · ")}</p>;
};

const SimpleList = ({ values }: { values: string[] }) => (
  values.length > 0 ? (
    <ul className={styles.simpleList}>
      {values.map((value) => <li key={value}>{value}</li>)}
    </ul>
  ) : (
    <p className={styles.placeholderText}>Chưa thêm thông tin.</p>
  )
);

const formatPeriod = (start: string, end: string) => {
  if (!start && !end) return "";
  if (start && end) return `${start} – ${end}`;
  return start || end;
};

const getInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "CV";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

export default ResumePreview;
