/**
 * Cờ tính năng an toàn phía giao diện — FAIL-CLOSED SAFETY GATES
 *
 * WORKSPACE WRITES GATE (Company & Admin):
 * Mặc định TẮT (false). Chỉ kích hoạt khi:
 * 1. Cấu hình VITE_ENABLE_WORKSPACE_WRITES=true được chỉ định tường minh.
 * 2. Trong môi trường trình duyệt:
 *    - Cổng frontend bắt buộc phải là "5173" (test instance cô lập).
 *    - Tuyệt đối cấm kết nối tới backend dev (port 3000 / findwork_dev).
 *    - Chỉ cho phép khi backend target là 127.0.0.1:3001 (findwork_test).
 * Khi tắt, mọi thao tác ghi (POST/PATCH/DELETE) bị chặn ngay tại client service,
 * không có bất kỳ request ghi nào được gửi tới máy chủ.
 */
let testOverride: boolean | null = null;

export const isWorkspaceWritesEnabled = (): boolean => {
  if (testOverride !== null) return testOverride;

  // 1. Phải được kích hoạt tường minh qua biến môi trường
  if (import.meta.env?.VITE_ENABLE_WORKSPACE_WRITES !== "true") {
    return false;
  }

  // 2. Kiểm tra an toàn tại browser runtime
  if (typeof window !== "undefined") {
    // Cổng frontend bắt buộc là 5173 (cô lập cho test)
    if (window.location.port !== "5173") {
      return false;
    }

    const backendTarget = String(import.meta.env?.VITE_BACKEND_TARGET || "");
    const backendPort = String(import.meta.env?.VITE_BACKEND_PORT || "");
    const apiBaseUrl = String(import.meta.env?.VITE_API_BASE_URL || "");

    // Khóa cứng: cấm tuyệt đối mọi thao tác ghi hướng tới backend port 3000 (findwork_dev)
    if (
      backendTarget.includes(":3000") ||
      backendPort === "3000" ||
      apiBaseUrl.includes(":3000")
    ) {
      return false;
    }

    // Backend target phải là test instance (port 3001)
    const isTargetingTestBackend =
      backendTarget.includes(":3001") ||
      backendPort === "3001" ||
      apiBaseUrl.includes(":3001") ||
      (!backendTarget && !backendPort); // Vite proxy trên port 5173 mặc định định tuyến tới 3001

    if (!isTargetingTestBackend) {
      return false;
    }
  }

  return true;
};

export const setWorkspaceWritesForTesting = (value: boolean | null): void => {
  testOverride = value;
};

/** Dữ liệu mẫu (fixture) chỉ được phép trong môi trường phát triển và khi bật ?demo=1. */
export const isDemoFixturesAllowed = (search: string): boolean =>
  Boolean(import.meta.env?.DEV) && new URLSearchParams(search).get("demo") === "1";
