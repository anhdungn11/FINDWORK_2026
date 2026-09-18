import styles from "./AuthDivider.module.css";
interface AuthDividerProps { children: string; }
const AuthDivider = ({ children }: AuthDividerProps) => (
  <div className={styles.divider}><span>{children}</span></div>
);
export default AuthDivider;
