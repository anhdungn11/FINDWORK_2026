import styles from "./AuthErrorMessage.module.css";
interface AuthErrorMessageProps { message: string; }
const AuthErrorMessage = ({ message }: AuthErrorMessageProps) => {
  if (!message) return null;
  return <div className={styles.error} role="alert">{message}</div>;
};
export default AuthErrorMessage;
