import { Link } from "react-router-dom";
import type { ApiFailure } from "@/services/api/apiFailure";
import { ErrorState } from "./index";

const TITLES: Record<string, string> = {
  unauthenticated: "Phiên đăng nhập đã hết hạn",
  forbidden: "Không đủ quyền truy cập",
  not_found: "Không tìm thấy dữ liệu",
  conflict: "Xung đột dữ liệu",
  validation: "Dữ liệu chưa hợp lệ",
  unavailable: "Dịch vụ tạm thời không khả dụng",
  network: "Mất kết nối tới máy chủ",
};

/** Hiển thị lỗi API theo đúng phân loại: 401 khác 403 khác 404 khác 503 khác mất mạng. */
const ApiErrorState = ({ error, onRetry }: { error: ApiFailure; onRetry?: () => void }) => {
  if (error.kind === "unauthenticated") {
    return (
      <div>
        <ErrorState title={TITLES.unauthenticated} message={error.message} />
        <p style={{ textAlign: "center", marginTop: 12 }}>
          <Link to="/login" style={{ fontWeight: 600 }}>Đăng nhập lại</Link>
        </p>
      </div>
    );
  }
  const retryable = error.kind === "network" || error.kind === "unavailable" || error.kind === "unknown";
  return <ErrorState title={TITLES[error.kind] ?? "Không thể tải dữ liệu"} message={error.message} onRetry={retryable ? onRetry : undefined} />;
};

export default ApiErrorState;
