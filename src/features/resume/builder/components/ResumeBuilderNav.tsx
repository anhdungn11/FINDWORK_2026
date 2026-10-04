import { RESUME_EDITOR_SECTIONS } from "@/features/resume/builder/data/resumeTemplates";
import type { ResumeBuilderEditorSection } from "@/features/resume/types/resume.types";

import styles from "./ResumeEditor.module.css";

interface Props {
  value: ResumeBuilderEditorSection;
  completion: Record<ResumeBuilderEditorSection, boolean>;
  completionPercent: number;
  onChange: (value: ResumeBuilderEditorSection) => void;
}

const groupLabels = {
  core: "Nội dung chính",
  additional: "Bổ sung",
  design: "Thiết kế",
} as const;

const ResumeBuilderNav = ({
  value,
  completion,
  completionPercent,
  onChange,
}: Props) => {
  let sectionNumber = 0;

  return (
    <aside className={styles.navPanel} aria-label="Các phần của CV">
      <div className={styles.navOverview}>
        <div className={styles.navOverviewTop}>
          <div>
            <span className={styles.eyebrow}>HỒ SƠ CV</span>
            <h2>Nội dung CV</h2>
          </div>
          <strong>{completionPercent}%</strong>
        </div>

        <div className={styles.progressTrack}>
          <span style={{ width: `${completionPercent}%` }} />
        </div>

        <p>
          Hoàn thiện phần chính trước. Các mục bổ sung chỉ nên dùng khi thật sự
          làm CV rõ hơn.
        </p>
      </div>

      {(["core", "additional", "design"] as const).map((group) => (
        <div className={styles.navGroup} key={group}>
          <span className={styles.navGroupLabel}>{groupLabels[group]}</span>

          <nav className={styles.navList}>
            {RESUME_EDITOR_SECTIONS.filter(
              (section) => section.group === group,
            ).map((section) => {
              const active = value === section.id;
              const done = completion[section.id];

              sectionNumber += 1;
              const currentNumber = sectionNumber;

              return (
                <button
                  key={section.id}
                  type="button"
                  className={`${styles.navItem} ${
                    active ? styles.navItemActive : ""
                  }`}
                  onClick={() => onChange(section.id)}
                >
                  <span
                    className={`${styles.navDot} ${
                      done ? styles.navDotDone : ""
                    }`}
                  >
                    {done ? "✓" : String(currentNumber).padStart(2, "0")}
                  </span>

                  <span className={styles.navText}>
                    <strong>{section.label}</strong>
                    {active && <small>{section.description}</small>}
                  </span>

                  <span className={styles.navChevron}>›</span>
                </button>
              );
            })}
          </nav>
        </div>
      ))}

      <div className={styles.navHelp}>
        <span>i</span>
        <p>
          <strong>Mẹo trình bày</strong>
          Ưu tiên nội dung liên quan tới vị trí ứng tuyển. Không cần bật mọi
          section chỉ vì hệ thống có hỗ trợ.
        </p>
      </div>
    </aside>
  );
};

export default ResumeBuilderNav;
