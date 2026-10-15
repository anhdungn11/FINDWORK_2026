/**
 * FINDWORK CP8C — INTEGRATION ACTIVATION SAFETY GATE
 * 
 * PHẠM VI & MỤC ĐÍCH:
 * Tiến trình kiểm thử tích hợp PostgreSQL của nhánh CP8A đang chạy độc lập.
 * Để đảm bảo an toàn tuyệt đối, KHÔNG thực hiện ghi dữ liệu trực tiếp vào
 * database thực tế ở chế độ mặc định:
 * - Giao diện ĐỌC (Bootstrap, Load Profile, Child Resources, Draft) được kết nối.
 * - Giao diện GHI (Create, Update, Delete, Import) được bảo vệ bởi cổng an toàn
 *   (Activation Safety Gate), mặc định là false.
 * - KHÔNG tạo trạng thái thành công giả (fake save success).
 * - KHÔNG sinh ID giả mạo.
 * - Khi CP8A và CP8C nghiệm thu liên thông, việc kích hoạt chỉ cần thay đổi cấu hình
 *   ENABLE_LIVE_WRITES: true mà không phải viết lại UI.
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
  // TẮT MẶC ĐỊNH cho đến khi CP8A hoàn tất kiểm thử liên thông cơ sở dữ liệu
  ENABLE_LIVE_WRITES: false,
};

/** Kiểm tra xem tính năng ghi thực tế có đang được bật hay không */
export function isLiveWritesEnabled(): boolean {
  if (testOverrideLiveWrites !== null) {
    return testOverrideLiveWrites;
  }
  return CANDIDATE_PROFILE_INTEGRATION_FLAGS.ENABLE_LIVE_WRITES;
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
