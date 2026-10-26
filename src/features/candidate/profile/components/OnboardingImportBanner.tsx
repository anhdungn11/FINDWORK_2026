/**
 * FINDWORK CP8B — ONBOARDING IMPORT BANNER
 *
 * Hiển thị thông báo khi hệ thống phát hiện có bản nháp Onboarding hợp lệ
 * sẵn sàng để khởi tạo hồ sơ chính thức.
 */

import { Layers, Sparkles } from "lucide-react";
import type { OnboardingImportBannerProps } from "../types/uiProfileProps.types";
import formStyles from "../styles/ProfileForms.module.css";
import styles from "../styles/ProfileGuidance.module.css";

export const OnboardingImportBanner = ({
  draftSummary,
  onOpenImportPreview,
  onGoToOnboarding,
  onOpenManualCreate,
  isPreview = false,
  isLiveWritesEnabled = false,
}: OnboardingImportBannerProps) => {
  // Thật: chỉ thao tác được khi Backend mở ghi. Demo: luôn mô phỏng trong bộ nhớ.
  const importBlocked = !isPreview && !isLiveWritesEnabled;
  const descId = "import-banner-desc";

  return (
    <section className={styles.importBanner} aria-labelledby="import-banner-title">
      <div className={styles.importBannerLeft}>
        <div className={styles.importBannerIcon} aria-hidden="true">
          <Layers size={20} />
        </div>
        <div>
          <h3 id="import-banner-title" className={styles.importBannerTitle}>
            {isPreview ? "DEMO · Bản nháp Onboarding mẫu (chưa lưu)" : "Tìm thấy bản nháp thông tin từ Onboarding"}
          </h3>
          <p className={styles.importBannerText}>
            Bản nháp (phiên bản {draftSummary.version}) gồm thông tin liên hệ,{" "}
            {draftSummary.educationCount} học vấn, {draftSummary.experienceCount} kinh nghiệm.
            {importBlocked
              ? " Bạn vẫn có thể xem lại và tiếp tục chỉnh sửa bản nháp."
              : isPreview
                ? " Bạn có thể chạy mô phỏng tạo hồ sơ trong bộ nhớ trình duyệt."
                : " Bạn có thể khởi tạo hồ sơ chính thức ngay bây giờ."}
          </p>
          {importBlocked && (
            <p
              id={descId}
              role="note"
              className={styles.importBannerText}
              data-testid="import-disabled-notice"
              style={{ fontWeight: 600 }}
            >
              Tính năng tạo hồ sơ chính thức từ bản nháp chưa được bật. Chưa có hồ sơ nào được tạo và
              dữ liệu của bạn chưa bị thay đổi.
            </p>
          )}
        </div>
      </div>

      <div className={styles.importBannerActions}>
        <button
          type="button"
          className={formStyles.btnSecondary}
          onClick={onGoToOnboarding}
          aria-label="Tiếp tục chỉnh sửa bản nháp trong Onboarding"
        >
          <span>Sửa bản nháp</span>
        </button>
        {onOpenManualCreate && (
          <button
            type="button"
            className={formStyles.btnSecondary}
            onClick={onOpenManualCreate}
            disabled={importBlocked}
            aria-label="Khởi tạo hồ sơ ứng viên thủ công"
          >
            <span>Tạo hồ sơ thủ công</span>
          </button>
        )}
        <button
          type="button"
          className={formStyles.btnPrimary}
          onClick={onOpenImportPreview}
          disabled={importBlocked}
          aria-disabled={importBlocked}
          aria-describedby={importBlocked ? descId : undefined}
          aria-label={
            importBlocked
              ? "Tạo hồ sơ chính thức chưa khả dụng"
              : isPreview
                ? "Xem lại và mô phỏng tạo hồ sơ từ bản nháp mẫu"
                : "Xem lại và tạo hồ sơ chính thức từ bản nháp Onboarding"
          }
        >
          <Sparkles size={14} aria-hidden="true" />
          <span>{importBlocked ? "Tạo hồ sơ (chưa khả dụng)" : isPreview ? "Xem lại & Mô phỏng" : "Xem lại & Tạo hồ sơ"}</span>
        </button>
      </div>
    </section>
  );
};
