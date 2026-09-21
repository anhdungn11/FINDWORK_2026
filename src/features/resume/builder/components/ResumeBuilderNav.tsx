import { RESUME_EDITOR_SECTIONS } from "@/features/resume/builder/data/resumeTemplates";
import type { ResumeBuilderEditorSection } from "@/features/resume/types/resume.types";
import styles from "./ResumeEditor.module.css";
interface Props { value: ResumeBuilderEditorSection; completion: Record<ResumeBuilderEditorSection, boolean>; completionPercent: number; onChange: (value: ResumeBuilderEditorSection) => void; }
const labels = { core: "Thông tin chính", additional: "Thông tin bổ sung", design: "Trình bày" } as const;
const ResumeBuilderNav = ({ value, completion, completionPercent, onChange }: Props) => (
  <aside className={styles.navPanel} aria-label="Các phần của CV">
    <div className={styles.navOverview}>
      <div className={styles.navOverviewTop}><div><span className={styles.eyebrow}>Hồ sơ CV</span><h2>Hoàn thiện nội dung</h2></div><strong>{completionPercent}%</strong></div>
      <div className={styles.progressTrack}><span style={{ width: `${completionPercent}%` }} /></div>
      <p>Hoàn thiện các mục chính trước, sau đó bổ sung nội dung phù hợp với ngành nghề của bạn.</p>
    </div>
    {(["core", "additional", "design"] as const).map((group) => (
      <div className={styles.navGroup} key={group}>
        <span className={styles.navGroupLabel}>{labels[group]}</span>
        <nav className={styles.navList}>
          {RESUME_EDITOR_SECTIONS.filter((section) => section.group === group).map((section) => {
            const active = value === section.id;
            const done = completion[section.id];
            return <button key={section.id} type="button" className={`${styles.navItem} ${active ? styles.navItemActive : ""}`} onClick={() => onChange(section.id)}><span className={`${styles.navDot} ${done ? styles.navDotDone : ""}`}>{done ? "✓" : ""}</span><span className={styles.navText}><strong>{section.label}</strong><small>{section.description}</small></span><span className={styles.navChevron}>›</span></button>;
          })}
        </nav>
      </div>
    ))}
    <div className={styles.navHelp}><span>i</span><p><strong>CV đa ngành</strong>Không có mục nào bị ép theo IT. Bạn có thể ẩn, đổi thứ tự hoặc tạo mục tùy chỉnh.</p></div>
  </aside>
);
export default ResumeBuilderNav;
