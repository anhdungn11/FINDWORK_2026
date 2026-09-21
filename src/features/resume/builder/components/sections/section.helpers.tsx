import type { ReactNode } from "react";
import styles from "../ResumeEditor.module.css";

export const splitLines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
export const splitComma = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
export const joinLines = (values: string[]) => values.join("\n");
export const joinComma = (values: string[]) => values.join(", ");

export const SectionHeader = ({ eyebrow, title, description, optional = false }: { eyebrow: string; title: string; description: string; optional?: boolean }) => (
  <header className={styles.sectionHeader}>
    <div className={styles.sectionHeaderTop}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      {optional && <span className={styles.optionalBadge}>Tùy chọn</span>}
    </div>
    <h2>{title}</h2>
    <p>{description}</p>
  </header>
);

export const Field = ({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) => (
  <label className={styles.field}>
    <span className={styles.fieldLabel}>{label}{required && <b>*</b>}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

export const EmptyState = ({ title = "Chưa có dữ liệu", children }: { title?: string; children: ReactNode }) => (
  <div className={styles.emptyState}><strong>{title}</strong><p>{children}</p></div>
);

export const ItemHeader = ({ eyebrow, title, subtitle, onRemove }: { eyebrow: string; title: string; subtitle?: string; onRemove: () => void }) => (
  <div className={styles.itemHeader}>
    <div className={styles.itemHeaderText}><span>{eyebrow}</span><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</div>
    <button type="button" onClick={onRemove}>Xóa</button>
  </div>
);
