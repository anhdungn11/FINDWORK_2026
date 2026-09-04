import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import styles from "./AuthShell.module.css";

interface AuthShellProps {
  title: string;
  description?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const AuthShell = ({
  title,
  description,
  eyebrow,
  children,
  footer,
}: AuthShellProps) => {
  return (
    <main className={styles.page}>
      <div className={styles.backgroundGlow} />

      <div className={styles.container}>
        <header className={styles.topbar}>
          <Link
            to="/"
            className={styles.logo}
          >
            FINDWORK
          </Link>

          <Link
            to="/"
            className={styles.backHome}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M19 12H5M12 19l-7-7 7-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            Về trang chủ
          </Link>
        </header>

        <section className={styles.content}>
          <div className={styles.heading}>
            {eyebrow && (
              <span className={styles.eyebrow}>
                {eyebrow}
              </span>
            )}

            <h1>{title}</h1>

            {description && (
              <p>{description}</p>
            )}
          </div>

          <div className={styles.card}>
            {children}
          </div>

          {footer && (
            <div className={styles.footer}>
              {footer}
            </div>
          )}

          <div className={styles.trust}>
            <span className={styles.trustItem}>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M12 3 5 6v5c0 4.6 2.9 8.3 7 10 4.1-1.7 7-5.4 7-10V6l-7-3Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 12 2 2 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              Bảo mật thông tin
            </span>

            <span className={styles.dot} />

            <span className={styles.trustItem}>
              Quyền riêng tư do bạn kiểm soát
            </span>
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuthShell;