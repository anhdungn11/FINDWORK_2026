import type { ReactNode, CSSProperties } from "react";
import { Link } from "react-router-dom";
import styles from "./ui.module.css";

export { styles as ui };

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className={styles.pageHeader}>
    <div>
      <h1 className={styles.pageTitle}>{title}</h1>
      {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
    </div>
    {actions && <div className={styles.pageActions}>{actions}</div>}
  </div>
);

export const Card = ({ title, children, style }: { title?: string; children: ReactNode; style?: CSSProperties }) => (
  <section className={styles.card} style={style}>
    {title && <h2 className={styles.cardTitle}>{title}</h2>}
    {children}
  </section>
);

type Tone = "neutral" | "success" | "warning" | "danger" | "info";
const toneClass: Record<Tone, string> = {
  neutral: "",
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
  info: styles.badgeInfo,
};
export const Badge = ({ tone = "neutral", children, style }: { tone?: Tone; children: ReactNode; style?: CSSProperties }) => (
  <span className={`${styles.badge} ${toneClass[tone]}`} style={style}>{children}</span>
);

export const JOB_STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Bản nháp", tone: "neutral" },
  PUBLISHED: { label: "Đang tuyển", tone: "success" },
  PAUSED: { label: "Tạm dừng", tone: "warning" },
  CLOSED: { label: "Đã đóng", tone: "danger" },
  EXPIRED: { label: "Hết hạn", tone: "danger" },
  ARCHIVED: { label: "Lưu trữ", tone: "neutral" },
};
export const JobStatusBadge = ({ status }: { status?: string | null }) => {
  const s = status || "DRAFT";
  const m = JOB_STATUS_LABEL[s] ?? { label: s, tone: "neutral" as Tone };
  return <Badge tone={m.tone}>{m.label}</Badge>;
};

export const LoadingBlock = ({ rows = 3, label = "Đang tải dữ liệu" }: { rows?: number; label?: string }) => (
  <div role="status" aria-live="polite" aria-busy="true">
    <span className={styles.srOnly}>{label}…</span>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className={styles.skeleton} style={{ height: 64, marginBottom: 12 }} />
    ))}
  </div>
);

export const EmptyState = ({
  title, text, actionLabel, actionTo, onAction,
}: { title: string; text?: string; actionLabel?: string; actionTo?: string; onAction?: () => void }) => (
  <div className={styles.state}>
    <h2 className={styles.stateTitle}>{title}</h2>
    {text && <p className={styles.stateText}>{text}</p>}
    {actionLabel && actionTo && (
      <Link className={`${styles.btn} ${styles.btnPrimary}`} to={actionTo}>{actionLabel}</Link>
    )}
    {actionLabel && onAction && !actionTo && (
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onAction}>{actionLabel}</button>
    )}
  </div>
);

export const ErrorState = ({ title = "Không thể tải dữ liệu", message, onRetry }: { title?: string; message: string; onRetry?: () => void }) => (
  <div className={`${styles.state} ${styles.stateError}`} role="alert">
    <h2 className={styles.stateTitle}>{title}</h2>
    <p className={styles.stateText}>{message}</p>
    {onRetry && <button type="button" className={styles.btn} onClick={onRetry}>Thử lại</button>}
  </div>
);

/** Chức năng chưa có endpoint Backend: nói rõ, không giả lập thành công. */
export const UnavailableState = ({ title, text }: { title: string; text: string }) => (
  <div className={`${styles.state} ${styles.stateUnavailable}`} role="note" data-testid="unavailable-state">
    <h2 className={styles.stateTitle}>{title}</h2>
    <p className={styles.stateText}>{text}</p>
    <Badge tone="warning">Chưa khả dụng — Backend chưa cung cấp API</Badge>
  </div>
);

export const Pagination = ({
  page, totalPages, onChange,
}: { page: number; totalPages: number; onChange: (page: number) => void }) =>
  totalPages <= 1 ? null : (
    <nav className={styles.pagination} aria-label="Phân trang">
      <button type="button" className={styles.btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>Trước</button>
      <span aria-live="polite">Trang {page} / {totalPages}</span>
      <button type="button" className={styles.btn} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Sau</button>
    </nav>
  );

export const DemoBadge = ({ children = "DỮ LIỆU MẪU (DEV) — không phải dữ liệu thật" }: { children?: ReactNode }) => (
  <div className={`${styles.notice} ${styles.noticeWarn}`} role="note" data-testid="demo-badge">{children}</div>
);

export { ConfirmationModal, type ConfirmationModalProps } from "./ConfirmationModal";
