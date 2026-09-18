import styles from "./AuthSocialButtons.module.css";

const AuthSocialButtons = () => (
  <div className={styles.socialGrid}>
    <button type="button" className={styles.socialButton}>
      <span className={styles.googleIcon}>G</span>
      <span>Tiếp tục với Google</span>
    </button>
    <button type="button" className={styles.socialButton}>
      <span className={styles.linkedinIcon}>in</span>
      <span>Tiếp tục với LinkedIn</span>
    </button>
  </div>
);

export default AuthSocialButtons;
