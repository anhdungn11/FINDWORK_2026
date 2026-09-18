import type { ReactNode } from "react";
import styles from "./AuthSubmitButton.module.css";
interface AuthSubmitButtonProps { children: ReactNode; }
const AuthSubmitButton = ({ children }: AuthSubmitButtonProps) => (
  <button type="submit" className={styles.submitButton}>
    {children}
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </button>
);
export default AuthSubmitButton;
