import type { ReactNode } from "react";
import styles from "./AuthCheckbox.module.css";
interface AuthCheckboxProps { checked: boolean; children: ReactNode; onChange: (checked: boolean) => void; }
const AuthCheckbox = ({ checked, children, onChange }: AuthCheckboxProps) => (
  <label className={styles.checkbox}>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span>{children}</span>
  </label>
);
export default AuthCheckbox;
