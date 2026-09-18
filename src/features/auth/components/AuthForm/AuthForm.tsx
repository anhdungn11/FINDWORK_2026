import type { FormEvent, ReactNode } from "react";
import styles from "./AuthForm.module.css";
interface AuthFormProps { children: ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void; }
const AuthForm = ({ children, onSubmit }: AuthFormProps) => (
  <form className={styles.form} onSubmit={onSubmit}>{children}</form>
);
export default AuthForm;
