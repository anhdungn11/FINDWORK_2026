/**
 * FINDWORK CP8B — CAREER PREFERENCES SECTION
 * 
 * Hiển thị và quản lý nguyện vọng nghề nghiệp: Vị trí mong muốn,
 * ngành nghề, địa điểm làm việc, kỳ vọng lương và cấp bậc.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Compass, DollarSign, MapPin, Pencil, X } from "lucide-react";
import type {
  CareerLevel,
  LocationPreferenceMode,
  SalaryExpectationType,
} from "../types/candidateProfile.types";
import type { CareerPreferencesSectionProps } from "../types/uiProfileProps.types";
import { formatCurrencyVND } from "../utils/profileFormatters";
import formStyles from "../styles/ProfileForms.module.css";
import sectionStyles from "../styles/ProfileSections.module.css";

const CAREER_LEVEL_LABELS: Record<CareerLevel, string> = {
  INTERN: "Thực tập sinh",
  FRESHER: "Mới tốt nghiệp / Fresher",
  JUNIOR: "Nhân viên / Junior",
  MID: "Chuyên viên / Mid-level",
  SENIOR: "Trưởng nhóm / Senior",
  LEAD: "Quản lý cấp cơ sở / Lead",
  MANAGER: "Quản lý cấp trung / Trưởng phòng",
};

export const CareerPreferencesSection = ({
  careerPreference,
  onSaveCareerPreference,
  isSaving = false,
}: CareerPreferencesSectionProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form State
  const [desiredPositions, setDesiredPositions] = useState("");
  const [locationMode, setLocationMode] = useState<LocationPreferenceMode>("SELECTED");
  const [salaryType, setSalaryType] = useState<SalaryExpectationType>("RANGE");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [desiredLevel, setDesiredLevel] = useState<CareerLevel | "">("");
  const [willingToRelocate, setWillingToRelocate] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditOpen && careerPreference) {
      setDesiredPositions(careerPreference.desiredPositions?.join(", ") || "");
      setLocationMode(careerPreference.locationMode || "SELECTED");
      setSalaryType(careerPreference.salaryType || "RANGE");
      setSalaryMin(careerPreference.salaryMin ? String(careerPreference.salaryMin) : "");
      setSalaryMax(careerPreference.salaryMax ? String(careerPreference.salaryMax) : "");
      setDesiredLevel(careerPreference.desiredCareerLevel || "");
      setWillingToRelocate(careerPreference.willingToRelocate || false);
      firstInputRef.current?.focus();
    }
  }, [isEditOpen, careerPreference]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (onSaveCareerPreference) {
      const positions = desiredPositions
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      await onSaveCareerPreference({
        locationMode,
        salaryType,
        salaryMin: salaryType === "RANGE" && salaryMin ? parseFloat(salaryMin) : null,
        salaryMax: salaryType === "RANGE" && salaryMax ? parseFloat(salaryMax) : null,
        currency: "VND",
        salaryPeriod: "MONTH",
        desiredCareerLevel: desiredLevel === "" ? null : desiredLevel,
        willingToRelocate,
        desiredPositions: positions,
        preferredCategories: careerPreference?.preferredCategories || [],
        preferredLocations: careerPreference?.preferredLocations || [],
        preferredEmploymentTypes: careerPreference?.preferredEmploymentTypes || ["FULL_TIME"],
        preferredWorkplaceTypes: careerPreference?.preferredWorkplaceTypes || ["ONSITE", "HYBRID"],
      });
    }
    setIsEditOpen(false);
  };

  const formatSalaryText = () => {
    if (!careerPreference) return "Chưa cập nhật";
    if (careerPreference.salaryType === "NEGOTIABLE") return "Thỏa thuận";
    if (careerPreference.salaryType === "NOT_IMPORTANT") return "Không yêu cầu mức lương cụ thể";
    if (careerPreference.salaryMin && careerPreference.salaryMax) {
      return `${formatCurrencyVND(careerPreference.salaryMin)} - ${formatCurrencyVND(careerPreference.salaryMax)} VND / tháng`;
    }
    if (careerPreference.salaryMin) {
      return `Từ ${formatCurrencyVND(careerPreference.salaryMin)} VND / tháng`;
    }
    return "Chưa cập nhật";
  };

  return (
    <>
      <section
        id="section-preferences"
        className={sectionStyles.card}
        aria-labelledby="preferences-section-title"
      >
        <div className={sectionStyles.cardHeader}>
          <div className={sectionStyles.cardTitleGroup}>
            <div className={sectionStyles.cardIcon}>
              <Compass size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 id="preferences-section-title" className={sectionStyles.cardTitle}>
                Nguyện vọng nghề nghiệp
              </h3>
              <p className={sectionStyles.cardSubtitle}>
                Kỳ vọng về vị trí, thu nhập và môi trường làm việc lý tưởng
              </p>
            </div>
          </div>

          <button
            type="button"
            className={sectionStyles.editButton}
            onClick={() => setIsEditOpen(true)}
            aria-label="Chỉnh sửa nguyện vọng nghề nghiệp"
          >
            <Pencil size={14} aria-hidden="true" />
            <span>Chỉnh sửa</span>
          </button>
        </div>

        {!careerPreference ? (
          <div className={sectionStyles.sectionEmptyState}>
            <Compass size={32} style={{ opacity: 0.4 }} aria-hidden="true" />
            <h4 className={sectionStyles.sectionEmptyTitle}>Chưa thiết lập nguyện vọng</h4>
            <p className={sectionStyles.sectionEmptySubtitle}>
              Thiết lập vị trí và mức lương kỳ vọng giúp định hình các cơ hội việc làm phù hợp với bạn.
            </p>
            <button
              type="button"
              className={sectionStyles.addButton}
              onClick={() => setIsEditOpen(true)}
            >
              <Pencil size={14} aria-hidden="true" />
              <span>Cài đặt nguyện vọng</span>
            </button>
          </div>
        ) : (
          <div className={sectionStyles.dataGrid}>
            <div className={sectionStyles.dataPair} style={{ gridColumn: "1 / -1" }}>
              <span className={sectionStyles.dataLabel}>Vị trí công việc mong muốn</span>
              {careerPreference.desiredPositions && careerPreference.desiredPositions.length > 0 ? (
                <div className={sectionStyles.chipsWrap} style={{ marginTop: "4px" }}>
                  {careerPreference.desiredPositions.map((pos, idx) => (
                    <span key={idx} className={sectionStyles.skillChip}>
                      {pos}
                    </span>
                  ))}
                </div>
              ) : (
                <span className={sectionStyles.dataValueMuted}>Chưa cập nhật</span>
              )}
            </div>

            <div className={sectionStyles.dataPair}>
              <span className={sectionStyles.dataLabel}>Mức lương kỳ vọng</span>
              <span className={sectionStyles.dataValue} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <DollarSign size={14} color="#15803d" aria-hidden="true" />
                <span>{formatSalaryText()}</span>
              </span>
            </div>

            <div className={sectionStyles.dataPair}>
              <span className={sectionStyles.dataLabel}>Cấp bậc mong muốn</span>
              <span className={sectionStyles.dataValue}>
                {careerPreference.desiredCareerLevel
                  ? CAREER_LEVEL_LABELS[careerPreference.desiredCareerLevel]
                  : "Chưa cập nhật"}
              </span>
            </div>

            <div className={sectionStyles.dataPair}>
              <span className={sectionStyles.dataLabel}>Địa điểm làm việc</span>
              <span className={sectionStyles.dataValue} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <MapPin size={14} aria-hidden="true" />
                <span>
                  {careerPreference.locationMode === "NATIONWIDE"
                    ? "Toàn quốc"
                    : careerPreference.preferredLocations && careerPreference.preferredLocations.length > 0
                    ? careerPreference.preferredLocations.map((l) => l.name).join(", ")
                    : "Đã chọn theo danh sách tỉnh thành"}
                </span>
              </span>
            </div>

            <div className={sectionStyles.dataPair}>
              <span className={sectionStyles.dataLabel}>Sẵn sàng chuyển nơi ở (Relocate)</span>
              <span className={sectionStyles.dataValue}>
                {careerPreference.willingToRelocate ? "Có" : "Không"}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Modal Chỉnh Sửa Nguyện Vọng */}
      {isEditOpen && (
        <div
          className={formStyles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditOpen(false);
          }}
          role="presentation"
        >
          <div
            className={formStyles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pref-modal-title"
            tabIndex={-1}
          >
            <header className={formStyles.modalHeader}>
              <h3 id="pref-modal-title" className={formStyles.modalTitle}>
                Chỉnh sửa nguyện vọng nghề nghiệp
              </h3>
              <button
                type="button"
                className={formStyles.modalCloseBtn}
                onClick={() => setIsEditOpen(false)}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <form onSubmit={handleSubmit} style={{ display: "contents" }}>
              <div className={formStyles.modalBody}>
                <div className={formStyles.formGroup}>
                  <label htmlFor="pref-positions" className={formStyles.formLabel}>
                    Vị trí mong muốn (phân cách bằng dấu phẩy)
                  </label>
                  <input
                    ref={firstInputRef}
                    id="pref-positions"
                    type="text"
                    className={formStyles.inputField}
                    placeholder="Ví dụ: Frontend Engineer, React Developer..."
                    value={desiredPositions}
                    onChange={(e) => setDesiredPositions(e.target.value)}
                  />
                </div>

                <div className={formStyles.formGroup}>
                  <label htmlFor="pref-salary-type" className={formStyles.formLabel}>
                    Loại kỳ vọng lương
                  </label>
                  <select
                    id="pref-salary-type"
                    className={formStyles.selectField}
                    value={salaryType}
                    onChange={(e) => setSalaryType(e.target.value as SalaryExpectationType)}
                  >
                    <option value="RANGE">Khoảng lương cụ thể (Min - Max)</option>
                    <option value="NEGOTIABLE">Thỏa thuận</option>
                    <option value="NOT_IMPORTANT">Không yêu cầu cụ thể</option>
                  </select>
                </div>

                {salaryType === "RANGE" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={formStyles.formGroup}>
                      <label htmlFor="pref-salary-min" className={formStyles.formLabel}>
                        Mức lương tối thiểu (VND/tháng)
                      </label>
                      <input
                        id="pref-salary-min"
                        type="number"
                        step="1000000"
                        className={formStyles.inputField}
                        placeholder="Ví dụ: 15000000"
                        value={salaryMin}
                        onChange={(e) => setSalaryMin(e.target.value)}
                      />
                    </div>
                    <div className={formStyles.formGroup}>
                      <label htmlFor="pref-salary-max" className={formStyles.formLabel}>
                        Mức lương tối đa (VND/tháng)
                      </label>
                      <input
                        id="pref-salary-max"
                        type="number"
                        step="1000000"
                        className={formStyles.inputField}
                        placeholder="Ví dụ: 25000000"
                        value={salaryMax}
                        onChange={(e) => setSalaryMax(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className={formStyles.formGroup}>
                  <label htmlFor="pref-career-level" className={formStyles.formLabel}>
                    Cấp bậc mong muốn
                  </label>
                  <select
                    id="pref-career-level"
                    className={formStyles.selectField}
                    value={desiredLevel}
                    onChange={(e) => setDesiredLevel(e.target.value as CareerLevel | "")}
                  >
                    <option value="">-- Chưa chọn --</option>
                    <option value="INTERN">Thực tập sinh (Intern)</option>
                    <option value="FRESHER">Mới tốt nghiệp (Fresher)</option>
                    <option value="JUNIOR">Nhân viên (Junior)</option>
                    <option value="MID">Chuyên viên (Mid-level)</option>
                    <option value="SENIOR">Trưởng nhóm (Senior)</option>
                    <option value="LEAD">Quản lý cấp cơ sở (Lead)</option>
                    <option value="MANAGER">Quản lý cấp trung (Manager)</option>
                  </select>
                </div>

                <div className={formStyles.formGroup}>
                  <label htmlFor="pref-loc-mode" className={formStyles.formLabel}>
                    Phạm vi tìm việc
                  </label>
                  <select
                    id="pref-loc-mode"
                    className={formStyles.selectField}
                    value={locationMode}
                    onChange={(e) => setLocationMode(e.target.value as LocationPreferenceMode)}
                  >
                    <option value="SELECTED">Theo tỉnh thành đã chọn</option>
                    <option value="NATIONWIDE">Toàn quốc (Toàn bộ Việt Nam)</option>
                  </select>
                </div>

                <div className={formStyles.checkboxRow}>
                  <input
                    id="pref-relocate"
                    type="checkbox"
                    className={formStyles.checkboxInput}
                    checked={willingToRelocate}
                    onChange={(e) => setWillingToRelocate(e.target.checked)}
                  />
                  <label htmlFor="pref-relocate">Sẵn sàng di chuyển nơi làm việc sang tỉnh/thành khác</label>
                </div>
              </div>

              <footer className={formStyles.modalFooter}>
                <button
                  type="button"
                  className={formStyles.btnSecondary}
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSaving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={formStyles.btnPrimary}
                  disabled={isSaving}
                >
                  {isSaving ? "Đang lưu..." : "Lưu nguyện vọng"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
