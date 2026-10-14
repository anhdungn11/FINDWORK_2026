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
}: OnboardingImportBannerProps) => {
  return (
    <section className={styles.importBanner} aria-labelledby="import-banner-title">
      <div className={styles.importBannerLeft}>
        <div className={styles.importBannerIcon} aria-hidden="true">
          <Layers size={20} />
        </div>
        <div>
          <h3 id="import-banner-title" className={styles.importBannerTitle}>
            Tìm thấy bản nháp thông tin từ Onboarding
          </h3>
          <p className={styles.importBannerText}>
            Bạn có dữ liệu nháp (phiên bản {draftSummary.version}) gồm thông tin liên hệ,{" "}
            {draftSummary.educationCount} học vấn, {draftSummary.experienceCount} kinh nghiệm.
            Bạn có thể khởi tạo hồ sơ chính thức ngay bây giờ.
          </p>
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
        <button
          type="button"
          className={formStyles.btnPrimary}
          onClick={onOpenImportPreview}
          aria-label="Xem lại và tạo hồ sơ chính thức từ bản nháp Onboarding"
        >
          <Sparkles size={14} aria-hidden="true" />
          <span>Xem lại & Tạo hồ sơ</span>
        </button>
      </div>
    </section>
  );
};
