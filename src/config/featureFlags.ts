/**
 * Cờ tính năng an toàn phía giao diện — FAIL-CLOSED SAFETY GATES
 *
 * WORKSPACE WRITES GATE (Company & Admin):
 * Mặc định TẮT (false). Chỉ kích hoạt khi:
 * 1. Cấu hình VITE_ENABLE_WORKSPACE_WRITES=true hoặc VITE_ENABLE_LIVE_WRITES=true được chỉ định tường minh.
 * 2. Trong môi trường trình duyệt:
 *    - Cổng frontend bắt buộc phải là "5173" (test instance cô lập) hoặc "5176" (dev demo session).
 *    - Tuyệt đối cấm kết nối tới backend dev (port 3000 / findwork_dev) khi chạy trên cổng test 5173.
 *    - Chỉ cho phép khi backend target là 127.0.0.1:3001 (findwork_test) trên cổng test 5173.
 * Khi tắt, mọi thao tác ghi (POST/PATCH/DELETE) bị chặn ngay tại client service,
 * không có bất kỳ request ghi nào được gửi tới máy chủ.
 */
let testOverride: boolean | null = null;

export const isWorkspaceWritesEnabled = (): boolean => {
  if (testOverride !== null) return testOverride;

  // 1. Phải được kích hoạt tường minh qua biến môi trường (chấp nhận cả VITE_ENABLE_WORKSPACE_WRITES hoặc VITE_ENABLE_LIVE_WRITES)
  const envWorkspace = import.meta.env?.VITE_ENABLE_WORKSPACE_WRITES;
  const envLive = import.meta.env?.VITE_ENABLE_LIVE_WRITES;

  const isExplicitlyEnabled =
    envWorkspace === "true" ||
    envWorkspace === true ||
    envWorkspace === "1" ||
    envLive === "true" ||
    envLive === true ||
    envLive === "1";

  if (!isExplicitlyEnabled) {
    return false;
  }

  // 2. Kiểm tra an toàn tại browser runtime
  if (typeof window !== "undefined") {
    const port = window.location.port;
    const isTestPort = port === "5173";
    const isDevDemoPort = port === "5176";
    const isIntegrationPort = port === "5177";

    // Chỉ cho phép chạy trên port 5173 (test), 5176 (dev demo) hoặc 5177 (isolated integration)
    if (!isTestPort && !isDevDemoPort && !isIntegrationPort) {
      return false;
    }

    const backendTarget = String(import.meta.env?.VITE_BACKEND_TARGET || "");
    const backendPort = String(import.meta.env?.VITE_BACKEND_PORT || "");
    const apiBaseUrl = String(import.meta.env?.VITE_API_BASE_URL || "");

    // Khóa cứng đối với port 5173: cấm tuyệt đối mọi thao tác ghi hướng tới backend port 3000 (findwork_dev)
    if (
      isTestPort &&
      (backendTarget.includes(":3000") ||
      backendPort === "3000" ||
      apiBaseUrl.includes(":3000"))
    ) {
      return false;
    }

    // Khóa cứng đối với port 5177 (isolated integration): cấm tuyệt đối thao tác ghi nếu hướng tới dev (3000) hoặc test (3001)
    if (isIntegrationPort) {
      const isTargetingUnintended =
        backendTarget.includes(":3000") ||
        backendPort === "3000" ||
        apiBaseUrl.includes(":3000") ||
        backendTarget.includes(":3001") ||
        backendPort === "3001" ||
        apiBaseUrl.includes(":3001");

      if (isTargetingUnintended) {
        return false;
      }

      const isTargeting3002 =
        backendTarget.includes(":3002") ||
        backendPort === "3002" ||
        apiBaseUrl.includes(":3002") ||
        (!backendTarget && !backendPort && !apiBaseUrl); // Vite proxy trên port 5177 mặc định định tuyến tới 3002

      if (!isTargeting3002) {
        return false;
      }
      return true;
    }

    // Đối với port 5176 (dev demo): cho phép khi env opt-in được bật tường minh
    if (isDevDemoPort) {
      return true;
    }

    // Backend target phải là test instance (port 3001) đối với port 5173
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
