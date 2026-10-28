import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import styles from "./EmployerAiFloatingLauncher.module.css";

interface EmployerAiFloatingLauncherProps {
  companyName?: string;
}

export const EmployerAiFloatingLauncher: React.FC<EmployerAiFloatingLauncherProps> = ({ companyName }) => {
  const location = useLocation();

  // Hide the floating shortcut when already on the Business AI workspace page
  if (location.pathname === "/employer/ai") {
    return null;
  }

  const title = companyName
    ? `Trợ lý AI Doanh nghiệp — ${companyName}`
    : "Trợ lý AI Doanh nghiệp FINDWORK";

  return (
    <Link
      to="/employer/ai"
      className={styles.floatingButton}
      title={title}
      aria-label={title}
      data-testid="employer-ai-floating-trigger"
    >
      <Sparkles size={24} aria-hidden="true" />
      <span className={styles.badge} aria-hidden="true">
        AI
      </span>
    </Link>
  );
};

export default EmployerAiFloatingLauncher;
