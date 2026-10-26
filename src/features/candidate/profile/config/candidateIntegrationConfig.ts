/**
 * FINDWORK CP8C — INTEGRATION ACTIVATION SAFETY GATE
 * 
 * PHẠM VI & MỤC ĐÍCH:
 * Tiến trình kiểm thử tích hợp PostgreSQL của nhánh CP8A đang chạy độc lập.
 * Để đảm bảo an toàn tuyệt đối, KHÔNG thực hiện ghi dữ liệu trực tiếp vào
 * database thực tế ở chế độ mặc định:
 * - Giao diện ĐỌC (Bootstrap, Load Profile, Child Resources, Draft) được kết nối.
 * - Giao diện GHI (Create, Update, Delete, Import, Submit Application) được bảo vệ bởi cổng an toàn
 *   (Activation Safety Gate), mặc định là false.
 * - KHÔNG tạo trạng thái thành công giả (fake save success).
 * - KHÔNG sinh ID giả mạo.
 * - Cổng ghi chỉ mở khi có cấu hình kiểm thử tường minh tới backend test (port 3001 / findwork_test).
 * - Tuyệt đối cấm thao tác ghi tới backend dev (port 3000 / findwork_dev).
 */

export interface CandidateIntegrationFlags {
  /** Cho phép kết nối các endpoint đọc dữ liệu thực tế từ backend */
  readonly ENABLE_REAL_READ: boolean;
  /** Cho phép gửi các mutation ghi thực tế lên cơ sở dữ liệu */
  readonly ENABLE_LIVE_WRITES: boolean;
}

let testOverrideLiveWrites: boolean | null = null;

export const CANDIDATE_PROFILE_INTEGRATION_FLAGS: CandidateIntegrationFlags = {
  ENABLE_REAL_READ: true,
  // TẮT MẶC ĐỊNH cho đến khi được chỉ định cấu hình test cô lập
  ENABLE_LIVE_WRITES: false,
};

/**
 * Kiểm tra xem tính năng ghi thực tế của Candidate (Apply, Save Job, Profile update) có được phép không.
 *
 * THIẾT KẾ AN TOÀN FAIL-CLOSED:
 * 1. Mặc định là FALSE (chặn toàn bộ ghi dữ liệu vào bất kỳ database nào).
 * 2. Trong môi trường Node/Unit Test (typeof window === "undefined"), cho phép test harness override
 *    để kiểm thử các kịch bản có kiểm soát trong test runner.
 * 3. Trong trình duyệt (Browser Runtime):
 *    - Phải có opt-in tường minh qua biến môi trường (VITE_ENABLE_LIVE_WRITES=true hoặc VITE_ENABLE_WORKSPACE_WRITES=true).
 *    - Bắt buộc port trình duyệt phải là "5173" (chỉ chạy trên frontend test cô lập).
 *    - TUYỆT ĐỐI CHẶN mọi thao tác ghi từ port dev 5176 hoặc các port khác để bảo vệ findwork_dev.
 *    - TUYỆT ĐỐI CHẶN nếu backend target là port 3000 (findwork_dev).
 *    - Chỉ cho phép khi backend target là 127.0.0.1:3001 (findwork_test).
 */
export function isLiveWritesEnabled(): boolean {
  // 1. Môi trường Unit test Node.js
  if (typeof window === "undefined") {
    if (testOverrideLiveWrites !== null) {
      return testOverrideLiveWrites;
    }
    const envEnabled =
      import.meta.env?.VITE_ENABLE_LIVE_WRITES === "true" ||
      import.meta.env?.VITE_ENABLE_WORKSPACE_WRITES === "true";
    return envEnabled || CANDIDATE_PROFILE_INTEGRATION_FLAGS.ENABLE_LIVE_WRITES;
  }

  // 2. Môi trường Trình duyệt (Browser Runtime) - FAIL-CLOSED
  if (testOverrideLiveWrites !== null) {
    return testOverrideLiveWrites;
  }

  // Phải được kích hoạt tường minh qua cấu hình hoặc biến môi trường
  const explicitlyEnabled =
    CANDIDATE_PROFILE_INTEGRATION_FLAGS.ENABLE_LIVE_WRITES ||
    import.meta.env?.VITE_ENABLE_LIVE_WRITES === "true" ||
    import.meta.env?.VITE_ENABLE_WORKSPACE_WRITES === "true";

  if (!explicitlyEnabled) {
    return false;
  }

  const port = window.location.port;
  const isTestPort = port === "5173";
  const isDevDemoPort = port === "5176";
  const isIntegrationPort = port === "5177";
  const isAcceptancePort = port === "5178";

  // Khóa cứng: chỉ chấp nhận cổng Frontend Test cô lập (5173), DEV Demo session (5176), Integration (5177) hoặc Acceptance (5178)
  if (!isTestPort && !isDevDemoPort && !isIntegrationPort && !isAcceptancePort) {
    return false;
  }

  const backendTarget = String(import.meta.env?.VITE_BACKEND_TARGET || "");
  const backendPort = String(import.meta.env?.VITE_BACKEND_PORT || "");
  const apiBaseUrl = String(import.meta.env?.VITE_API_BASE_URL || "");

  // Khóa cứng đối với port 5173: cấm tuyệt đối mọi thao tác ghi hướng tới backend dev port 3000 (findwork_dev)
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

  // Khóa cứng đối với port 5178 (isolated acceptance): cấm tuyệt đối thao tác ghi nếu hướng tới dev (3000), test (3001) hoặc 3002
  if (isAcceptancePort) {
    const isTargetingUnintended =
      backendTarget.includes(":3000") ||
      backendPort === "3000" ||
      apiBaseUrl.includes(":3000") ||
      backendTarget.includes(":3001") ||
      backendPort === "3001" ||
      apiBaseUrl.includes(":3001") ||
      backendTarget.includes(":3002") ||
      backendPort === "3002" ||
      apiBaseUrl.includes(":3002");

    if (isTargetingUnintended) {
      return false;
    }

    const isTargeting3003 =
      backendTarget.includes(":3003") ||
      backendPort === "3003" ||
      apiBaseUrl.includes(":3003") ||
      (!backendTarget && !backendPort && !apiBaseUrl); // Vite proxy trên port 5178 mặc định định tuyến tới 3003

    if (!isTargeting3003) {
      return false;
    }
    return true;
  }

  // Đối với port 5176 (dev demo): cho phép khi env opt-in được thiết lập tường minh
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

  return true;
}

/** Dành riêng cho Unit/Integration Test có kiểm soát trong môi trường cô lập */
export function setLiveWritesEnabledForTesting(enabled: boolean | null): void {
  testOverrideLiveWrites = enabled;
}

/** Lỗi chuẩn hóa khi thao tác ghi bị chặn bởi Activation Gate */
export class CandidateWriteGateBlockedError extends Error {
  readonly code = "WRITE_GATE_BLOCKED";
  readonly status = 403;
  readonly operation: string;

  constructor(operation: string) {
    super(
      `Thao tác '${operation}' tạm thời chưa được kích hoạt ghi dữ liệu ` +
      `nhằm bảo đảm an toàn kiểm thử tích hợp song song với CP8A. ` +
      `Dữ liệu chưa được gửi lên máy chủ.`
    );
    this.name = "CandidateWriteGateBlockedError";
    this.operation = operation;
  }
}

/** Kiểm tra an toàn trước khi thực hiện bất kỳ mutation nào */
export function assertLiveWritesAllowed(operation: string): void {
  if (!isLiveWritesEnabled()) {
    throw new CandidateWriteGateBlockedError(operation);
  }
}
