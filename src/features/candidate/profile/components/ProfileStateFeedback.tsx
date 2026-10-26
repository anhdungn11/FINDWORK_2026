/**
 * FINDWORK CP8B — PROFILE STATE FEEDBACK
 *
 * Hiển thị các trạng thái đặc biệt:
 * - not_created_no_draft
 * - eligibility_unknown (Không giả định hồ sơ chưa tồn tại)
 * - forbidden
 * - network_error
 * - import_conflict / profile_already_exists
 */

import { AlertTriangle, ArrowRight, HelpCircle, Layers, LogIn, RefreshCw, ServerCrash, ShieldAlert, WifiOff } from "lucide-react";
import type { ProfileStateFeedbackProps } from "../types/uiProfileProps.types";
import formStyles from "../styles/ProfileForms.module.css";
import styles from "../styles/ProfileGuidance.module.css";

export const ProfileStateFeedback = ({
  state,
  errorMessage,
  errorStatus,
  errorCode,
  onRetry,
  onGoToOnboarding,
}: ProfileStateFeedbackProps) => {
  // Case 1: Chưa tạo hồ sơ và không có bản nháp Onboarding (Intentional Empty State)
  if (state === "not_created_no_draft") {
    return (
      <div className={styles.stateCard} role="status">
        <div className={`${styles.stateIconWrap} ${styles.stateIconInfo}`}>
          <Layers size={28} aria-hidden="true" />
        </div>
        <h3 className={styles.stateTitle}>Chưa có hồ sơ ứng viên chính thức</h3>
        <p className={styles.stateDescription}>
          Tài khoản của bạn hiện chưa khởi tạo hồ sơ ứng viên chính thức và chưa có bản nháp Onboarding. Hãy bắt đầu quy trình Onboarding 7 bước để thiết lập thông tin học vấn, kỹ năng và nguyện vọng nghề nghiệp.
        </p>
        <div className={styles.stateActions}>
          {onGoToOnboarding && (
            <button
              type="button"
              className={formStyles.btnPrimary}
              onClick={onGoToOnboarding}
            >
              <span>Bắt đầu Onboarding 7 bước</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Case 2: Hết phiên đăng nhập (HTTP 401 Unauthorized) hoặc chưa thể xác định quyền hạn (Eligibility Unknown)
  if (state === "eligibility_unknown") {
    const isUnauthorized =
      errorStatus === 401 ||
      errorCode === "UNAUTHORIZED" ||
      errorCode === "AUTH_ACCESS_TOKEN_REQUIRED" ||
      errorCode === "AUTH_ACCESS_TOKEN_INVALID" ||
      errorCode === "AUTH_SESSION_INVALID" ||
      Boolean(errorMessage && /hết hạn|đăng nhập/i.test(errorMessage));

    if (isUnauthorized) {
      return (
        <div className={styles.stateCard} role="alert">
          <div className={`${styles.stateIconWrap} ${styles.stateIconWarning}`}>
            <LogIn size={28} aria-hidden="true" />
          </div>
          <h3 className={styles.stateTitle}>Phiên đăng nhập đã hết hạn (HTTP 401)</h3>
          <p className={styles.stateDescription}>
            {errorMessage ||
              "Phiên làm việc của bạn có thể đã hết hạn hoặc chưa được xác thực. Vui lòng đăng nhập lại để tiếp tục truy cập hồ sơ ứng viên."}
          </p>
          <div className={styles.stateActions}>
            {onRetry && (
              <button
                type="button"
                className={formStyles.btnSecondary}
                onClick={onRetry}
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Kiểm tra lại phiên</span>
              </button>
            )}
            <a
              href="/login?returnTo=%2Fcandidate%2Fprofile"
              className={formStyles.btnPrimary}
              style={{ textDecoration: "none" }}
            >
              <LogIn size={14} aria-hidden="true" />
              <span>Đăng nhập lại</span>
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.stateCard} role="status">
        <div className={`${styles.stateIconWrap} ${styles.stateIconWarning}`}>
          <HelpCircle size={28} aria-hidden="true" />
        </div>
        <h3 className={styles.stateTitle}>Đang xác thực quyền truy cập hồ sơ</h3>
        <p className={styles.stateDescription}>
          Hệ thống chưa thể xác định an toàn quyền xem hồ sơ ứng viên cho tài khoản này. Nếu bạn vừa đăng ký hoặc vừa cập nhật vai trò, vui lòng thử kiểm tra lại hoặc tiếp tục tại quy trình Onboarding.
        </p>
        <div className={styles.stateActions}>
          {onRetry && (
            <button
              type="button"
              className={formStyles.btnSecondary}
              onClick={onRetry}
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Kiểm tra lại quyền</span>
            </button>
          )}
          {onGoToOnboarding && (
            <button
              type="button"
              className={formStyles.btnPrimary}
              onClick={onGoToOnboarding}
            >
              <span>Đến trang Onboarding</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Case 3: Xác định rõ ràng thiếu quyền (403 Forbidden)
  if (state === "forbidden") {
    return (
      <div className={styles.stateCard} role="alert">
        <div className={`${styles.stateIconWrap} ${styles.stateIconDanger}`}>
          <ShieldAlert size={28} aria-hidden="true" />
        </div>
        <h3 className={styles.stateTitle}>Không đủ quyền truy cập (HTTP 403)</h3>
        <p className={styles.stateDescription}>
          {errorMessage ||
            "Tài khoản hiện tại chưa được cấp quyền truy cập hồ sơ ứng viên (thiếu quyền profile.view). Điều này không có nghĩa là hồ sơ chưa tồn tại. Vui lòng kiểm tra vai trò tài khoản hoặc liên hệ quản trị viên."}
        </p>
        <div className={styles.stateActions}>
          {onRetry && (
            <button
              type="button"
              className={formStyles.btnSecondary}
              onClick={onRetry}
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Thử lại</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Case 4: Xung đột phiên bản khi import (409 Conflict)
  if (state === "import_conflict") {
    return (
      <div className={styles.stateCard} role="alert">
        <div className={`${styles.stateIconWrap} ${styles.stateIconWarning}`}>
          <AlertTriangle size={28} aria-hidden="true" />
        </div>
        <h3 className={styles.stateTitle}>Xung đột phiên bản bản nháp (HTTP 409)</h3>
        <p className={styles.stateDescription}>
          Bản nháp Onboarding đã được cập nhật từ một phiên làm việc khác. Vui lòng mở lại Onboarding để kiểm tra phiên bản mới nhất trước khi khởi tạo hồ sơ.
        </p>
        <div className={styles.stateActions}>
          {onGoToOnboarding && (
            <button
              type="button"
              className={formStyles.btnPrimary}
              onClick={onGoToOnboarding}
            >
              <span>Xem lại bản nháp Onboarding</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Case 5: Hồ sơ đã tồn tại từ trước (409 Profile Already Exists)
  if (state === "profile_already_exists") {
    return (
      <div className={styles.stateCard} role="status">
        <div className={`${styles.stateIconWrap} ${styles.stateIconInfo}`}>
          <Layers size={28} aria-hidden="true" />
        </div>
        <h3 className={styles.stateTitle}>Hồ sơ đã được khởi tạo</h3>
        <p className={styles.stateDescription}>
          Hồ sơ ứng viên của bạn đã được tạo thành công từ một phiên làm việc khác. Nhấn nút bên dưới để tải lại dữ liệu hồ sơ.
        </p>
        <div className={styles.stateActions}>
          {onRetry && (
            <button
              type="button"
              className={formStyles.btnPrimary}
              onClick={onRetry}
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Tải dữ liệu hồ sơ</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Case 6a: Dịch vụ hoặc danh mục tham chiếu tạm thời chưa sẵn sàng (HTTP 503)
  if (
    errorStatus === 503 ||
    errorCode === "CANDIDATE_REFERENCE_CATALOG_UNAVAILABLE" ||
    Boolean(errorMessage && /503|chưa sẵn sàng/i.test(errorMessage))
  ) {
    return (
      <div className={styles.stateCard} role="alert">
        <div className={`${styles.stateIconWrap} ${styles.stateIconWarning}`}>
          <ServerCrash size={28} aria-hidden="true" />
        </div>
        <h3 className={styles.stateTitle}>Dịch vụ tạm thời chưa sẵn sàng (HTTP 503)</h3>
        <p className={styles.stateDescription}>
          {errorMessage ||
            "Dịch vụ hồ sơ hoặc danh mục dữ liệu tham chiếu trên máy chủ hiện đang bảo trì hoặc chưa sẵn sàng. Vui lòng thử lại sau ít phút."}
        </p>
        <div className={styles.stateActions}>
          {onRetry && (
            <button
              type="button"
              className={formStyles.btnPrimary}
              onClick={onRetry}
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Thử lại</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Case 6b: Lỗi kết nối mạng thực sự hoặc lỗi máy chủ (Network / 500)
  return (
    <div className={styles.stateCard} role="alert">
      <div className={`${styles.stateIconWrap} ${styles.stateIconDanger}`}>
        <WifiOff size={28} aria-hidden="true" />
      </div>
      <h3 className={styles.stateTitle}>Không thể kết nối tới dịch vụ hồ sơ</h3>
      <p className={styles.stateDescription}>
        {errorMessage || "Đã xảy ra lỗi kết nối khi tải thông tin hồ sơ ứng viên. Vui lòng kiểm tra kết nối mạng và thử lại."}
      </p>
      <div className={styles.stateActions}>
        {onRetry && (
          <button
            type="button"
            className={formStyles.btnPrimary}
            onClick={onRetry}
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Thử lại</span>
          </button>
        )}
      </div>
    </div>
  );
};
