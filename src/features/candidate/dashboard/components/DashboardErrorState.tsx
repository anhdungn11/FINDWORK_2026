import { AlertTriangle, RefreshCw } from "lucide-react";
import styles from "../styles/CandidateDashboard.module.css";

interface DashboardErrorStateProps {
  errorMessage: string | null;
  onRetry: () => void;
}

export const DashboardErrorState = ({
  errorMessage,
  onRetry,
}: DashboardErrorStateProps) => {
  return (
    <div className={styles.dashboard}>
      <div className={styles.errorCard} role="alert">
        <AlertTriangle size={36} color="#b91c1c" aria-hidden="true" />
        <h2 className={styles.errorTitle}>Không thể tải dữ liệu bảng điều khiển</h2>
        <p className={styles.errorMessage}>
          {errorMessage ||
            "Đã xảy ra sự cố khi kết nối tới máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau."}
        </p>
        <button
          type="button"
          className={styles.buttonPrimary}
          onClick={onRetry}
          style={{ marginTop: "0.5rem" }}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Thử lại
        </button>
      </div>
    </div>
  );
};
