import type { AuthUser } from "@/store/authStore";
import { resolveCandidateIdentity } from "../utils/workspaceIdentity";
import styles from "../styles/CandidateWorkspace.module.css";

interface UserProfileWidgetProps {
  user: AuthUser | null | undefined;
}

export const UserProfileWidget = ({ user }: UserProfileWidgetProps) => {
  const identity = resolveCandidateIdentity(user);

  return (
    <div className={styles.userWidgetCard}>
      <div className={styles.userWidgetAvatar} aria-hidden="true">
        {identity.initials}
      </div>
      <div className={styles.userWidgetMeta}>
        <div className={styles.userWidgetName} title={identity.displayName}>
          {identity.displayName}
        </div>
        <p className={styles.userWidgetEmail} title={identity.email || undefined}>
          {identity.email || identity.roleLabel || "Tài khoản ứng viên"}
        </p>
      </div>
    </div>
  );
};
