import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { UserProfileWidget } from "./UserProfileWidget";
import { CandidateNavList } from "./CandidateNavList";
import styles from "../styles/CandidateWorkspace.module.css";

export const CandidateSidebar = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isPendingLogout = isLoggingOut || status === "loggingOut";

  const handleSidebarLogout = async () => {
    if (isPendingLogout) return;
    setIsLoggingOut(true);
    try {
      const success = await logout();
      if (success) {
        navigate("/login", { replace: true });
      } else {
        setIsLoggingOut(false);
      }
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className={styles.sidebar} aria-label="Thanh điều hướng ứng viên">
      <div>
        <div className={styles.sidebarHeaderArea}>
          <UserProfileWidget user={user} />
        </div>

        <CandidateNavList />
      </div>

      <div className={styles.sidebarFooter}>
        <button
          type="button"
          className={styles.sidebarLogoutButton}
          onClick={() => void handleSidebarLogout()}
          disabled={isPendingLogout}
        >
          <LogOut size={16} aria-hidden="true" />
          <span>{isPendingLogout ? "Đang đăng xuất..." : "Đăng xuất"}</span>
        </button>
      </div>
    </aside>
  );
};
