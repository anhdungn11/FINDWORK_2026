import type { ReactNode } from "react";
import styles from "./AuthFooterText.module.css";
interface AuthFooterTextProps { children: ReactNode; }
const AuthFooterText = ({ children }: AuthFooterTextProps) => <p className={styles.footerText}>{children}</p>;
export default AuthFooterText;
