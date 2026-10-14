/**
 * FINDWORK CP8B — WORK EXPERIENCE SECTION
 * 
 * Hiển thị và quản lý kinh nghiệm làm việc.
 * ĐẢM BẢO RÀNG BUỘC: Tùy chọn (Optional), không bắt buộc mọi ứng viên phải có kinh nghiệm
 * (thân thiện với sinh viên mới ra trường và người chuyển ngành).
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Briefcase, Pencil, Plus, Trash2, X } from "lucide-react";
import type {
  CandidateExperienceRecord,
  EmploymentType,
  WorkplaceType,
} from "../types/candidateProfile.types";
import type { ExperienceSectionProps } from "../types/uiProfileProps.types";
import { formatMonthYear } from "../utils/profileFormatters";
import formStyles from "../styles/ProfileForms.module.css";
import sectionStyles from "../styles/ProfileSections.module.css";

export const ExperienceSection = ({
  experienceList = [],
  onAddExperience,
  onUpdateExperience,
  onDeleteExperience,
  isSaving = false,
}: ExperienceSectionProps) => {
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<CandidateExperienceRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("FULL_TIME");
  const [workplaceType, setWorkplaceType] = useState<WorkplaceType>("ONSITE");
  const [location, setLocation] = useState("");
  const [startMonth, setStartMonth] = useState("1");
  const [startYear, setStartYear] = useState("2023");
  const [endMonth, setEndMonth] = useState("12");
  const [endYear, setEndYear] = useState("2024");
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState("");
  const [achievements, setAchievements] = useState("");
  const [skillTags, setSkillTags] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const firstInputRef = useRef<HTMLInputElement>(null);

  const openAddModal = () => {
    setModalMode("add");
    setEditingItem(null);
    setCompanyName("");
    setPosition("");
    setEmploymentType("FULL_TIME");
    setWorkplaceType("ONSITE");
    setLocation("");
    setStartMonth("1");
    setStartYear("2023");
    setEndMonth("12");
    setEndYear("2024");
    setIsCurrent(false);
    setDescription("");
    setAchievements("");
    setSkillTags("");
    setErrorMsg(null);
  };

  const openEditModal = (item: CandidateExperienceRecord) => {
    setModalMode("edit");
    setEditingItem(item);
    setCompanyName(item.companyName);
    setPosition(item.position);
    setEmploymentType(item.employmentType);
    setWorkplaceType(item.workplaceType);
    setLocation(item.location || "");
    setStartMonth(String(item.startMonth));
    setStartYear(String(item.startYear));
    setEndMonth(item.endMonth ? String(item.endMonth) : "");
    setEndYear(item.endYear ? String(item.endYear) : "");
    setIsCurrent(item.isCurrent);
    setDescription(item.description || "");
    setAchievements(item.achievements || "");
    setSkillTags(item.skills.map((s) => s.skillName).join(", "));
    setErrorMsg(null);
  };

  useEffect(() => {
    if (modalMode) {
      firstInputRef.current?.focus();
    }
  }, [modalMode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !position.trim()) {
      setErrorMsg("Vui lòng nhập tên công ty và vị trí công tác.");
      return;
    }

    const skillsArray = skillTags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((skillName) => ({ skillName }));

    const payload = {
      companyName: companyName.trim(),
      position: position.trim(),
      employmentType,
      workplaceType,
      location: location.trim() || null,
      startMonth: parseInt(startMonth, 10) || 1,
      startYear: parseInt(startYear, 10) || 2023,
      endMonth: isCurrent ? null : parseInt(endMonth, 10) || null,
      endYear: isCurrent ? null : parseInt(endYear, 10) || null,
      isCurrent,
      description: description.trim() || null,
      achievements: achievements.trim() || null,
      skills: skillsArray,
    };

    if (modalMode === "add" && onAddExperience) {
      await onAddExperience(payload);
    } else if (modalMode === "edit" && editingItem && onUpdateExperience) {
      await onUpdateExperience(editingItem.id, payload);
    }
    setModalMode(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId && onDeleteExperience) {
      await onDeleteExperience(deleteTargetId);
    }
    setDeleteTargetId(null);
  };

  return (
    <>
      <section
        id="section-experience"
        className={sectionStyles.card}
        aria-labelledby="experience-section-title"
      >
        <div className={sectionStyles.cardHeader}>
          <div className={sectionStyles.cardTitleGroup}>
            <div className={sectionStyles.cardIcon}>
              <Briefcase size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 id="experience-section-title" className={sectionStyles.cardTitle}>
                Kinh nghiệm làm việc
              </h3>
              <p className={sectionStyles.cardSubtitle}>
                Quá trình công tác, các dự án thực tế hoặc hoạt động thực tập (tùy chọn)
              </p>
            </div>
          </div>

          <button
            type="button"
            className={sectionStyles.addButton}
            onClick={openAddModal}
            aria-label="Thêm kinh nghiệm làm việc mới"
          >
            <Plus size={14} aria-hidden="true" />
            <span>Thêm kinh nghiệm</span>
          </button>
        </div>

        {experienceList.length === 0 ? (
          <div className={sectionStyles.sectionEmptyState}>
            <Briefcase size={32} style={{ opacity: 0.4 }} aria-hidden="true" />
            <h4 className={sectionStyles.sectionEmptyTitle}>Chưa có kinh nghiệm làm việc</h4>
            <p className={sectionStyles.sectionEmptySubtitle}>
              Mục này là tùy chọn. Nếu bạn là sinh viên mới tốt nghiệp hoặc chưa có kinh nghiệm chính thức, bạn có thể bổ sung các dự án học tập, đồ án hoặc bỏ qua mục này.
            </p>
            <button
              type="button"
              className={sectionStyles.addButton}
              onClick={openAddModal}
            >
              <Plus size={14} aria-hidden="true" />
              <span>Thêm kinh nghiệm hoặc dự án</span>
            </button>
          </div>
        ) : (
          <div className={sectionStyles.timelineList}>
            {experienceList.map((item) => (
              <article key={item.id} className={sectionStyles.timelineItem}>
                <div className={sectionStyles.timelineMarker} aria-hidden="true" />
                <div className={sectionStyles.timelineBody}>
                  <div className={sectionStyles.timelineHeader}>
                    <div>
                      <h4 className={sectionStyles.timelinePrimaryTitle}>{item.position}</h4>
                      <p className={sectionStyles.timelineSecondaryTitle}>
                        {item.companyName}
                        {item.location ? ` • ${item.location}` : ""}
                      </p>
                    </div>

                    <span className={sectionStyles.timelineDateBadge}>
                      {formatMonthYear(item.startMonth, item.startYear)} —{" "}
                      {item.isCurrent ? "Hiện tại" : formatMonthYear(item.endMonth, item.endYear)}
                    </span>
                  </div>

                  {item.description && (
                    <p className={sectionStyles.timelineDescription}>{item.description}</p>
                  )}

                  {item.achievements && (
                    <p className={sectionStyles.timelineDescription}>
                      <strong>Thành tích:</strong> {item.achievements}
                    </p>
                  )}

                  {item.skills && item.skills.length > 0 && (
                    <div className={sectionStyles.chipsWrap} style={{ marginTop: "0.5rem" }}>
                      {item.skills.map((s, idx) => (
                        <span key={idx} className={sectionStyles.skillChip}>
                          {s.skillName}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className={sectionStyles.timelineActions}>
                    <button
                      type="button"
                      className={sectionStyles.iconActionButton}
                      onClick={() => openEditModal(item)}
                      aria-label={`Chỉnh sửa kinh nghiệm tại ${item.companyName}`}
                    >
                      <Pencil size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${sectionStyles.iconActionButton} ${sectionStyles.iconActionButtonDanger}`}
                      onClick={() => setDeleteTargetId(item.id)}
                      aria-label={`Xóa kinh nghiệm tại ${item.companyName}`}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Modal Thêm / Chỉnh Sửa Kinh Nghiệm */}
      {modalMode && (
        <div
          className={formStyles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalMode(null);
          }}
          role="presentation"
        >
          <div
            className={formStyles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="experience-modal-title"
            tabIndex={-1}
          >
            <header className={formStyles.modalHeader}>
              <h3 id="experience-modal-title" className={formStyles.modalTitle}>
                {modalMode === "add" ? "Thêm kinh nghiệm làm việc" : "Chỉnh sửa kinh nghiệm"}
              </h3>
              <button
                type="button"
                className={formStyles.modalCloseBtn}
                onClick={() => setModalMode(null)}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <form onSubmit={handleSubmit} style={{ display: "contents" }}>
              <div className={formStyles.modalBody}>
                {errorMsg && (
                  <div className={formStyles.errorSummary} role="alert" tabIndex={-1}>
                    <div className={formStyles.errorSummaryTitle}>
                      <AlertCircle size={14} aria-hidden="true" />
                      <span>Thông tin chưa hợp lệ:</span>
                    </div>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className={formStyles.formGroup}>
                  <label htmlFor="exp-company" className={`${formStyles.formLabel} ${formStyles.formLabelRequired}`}>
                    Công ty / Tổ chức
                  </label>
                  <input
                    ref={firstInputRef}
                    id="exp-company"
                    type="text"
                    className={formStyles.inputField}
                    placeholder="Ví dụ: Công ty Cổ phần TechVina"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>

                <div className={formStyles.formGroup}>
                  <label htmlFor="exp-position" className={`${formStyles.formLabel} ${formStyles.formLabelRequired}`}>
                    Vị trí / Chức danh công việc
                  </label>
                  <input
                    id="exp-position"
                    type="text"
                    className={formStyles.inputField}
                    placeholder="Ví dụ: Frontend Developer"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className={formStyles.formGroup}>
                    <label htmlFor="exp-emp-type" className={formStyles.formLabel}>Hình thức làm việc</label>
                    <select
                      id="exp-emp-type"
                      className={formStyles.selectField}
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    >
                      <option value="FULL_TIME">Toàn thời gian</option>
                      <option value="PART_TIME">Bán thời gian</option>
                      <option value="INTERNSHIP">Thực tập</option>
                      <option value="CONTRACT">Hợp đồng</option>
                      <option value="FREELANCE">Freelance</option>
                    </select>
                  </div>

                  <div className={formStyles.formGroup}>
                    <label htmlFor="exp-workplace-type" className={formStyles.formLabel}>Môi trường làm việc</label>
                    <select
                      id="exp-workplace-type"
                      className={formStyles.selectField}
                      value={workplaceType}
                      onChange={(e) => setWorkplaceType(e.target.value as WorkplaceType)}
                    >
                      <option value="ONSITE">Tại văn phòng (Onsite)</option>
                      <option value="HYBRID">Linh hoạt (Hybrid)</option>
                      <option value="REMOTE">Từ xa (Remote)</option>
                    </select>
                  </div>
                </div>

                <div className={formStyles.checkboxRow}>
                  <input
                    id="exp-is-current"
                    type="checkbox"
                    className={formStyles.checkboxInput}
                    checked={isCurrent}
                    onChange={(e) => setIsCurrent(e.target.checked)}
                  />
                  <label htmlFor="exp-is-current">Hiện tại tôi đang làm việc tại đây</label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.formLabel}>Thời gian bắt đầu</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        className={formStyles.inputField}
                        placeholder="Tháng"
                        value={startMonth}
                        onChange={(e) => setStartMonth(e.target.value)}
                        aria-label="Tháng bắt đầu"
                      />
                      <input
                        type="number"
                        min="1970"
                        max="2099"
                        className={formStyles.inputField}
                        placeholder="Năm"
                        value={startYear}
                        onChange={(e) => setStartYear(e.target.value)}
                        aria-label="Năm bắt đầu"
                      />
                    </div>
                  </div>

                  {!isCurrent && (
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.formLabel}>Thời gian kết thúc</label>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          className={formStyles.inputField}
                          placeholder="Tháng"
                          value={endMonth}
                          onChange={(e) => setEndMonth(e.target.value)}
                          aria-label="Tháng kết thúc"
                        />
                        <input
                          type="number"
                          min="1970"
                          max="2099"
                          className={formStyles.inputField}
                          placeholder="Năm"
                          value={endYear}
                          onChange={(e) => setEndYear(e.target.value)}
                          aria-label="Năm kết thúc"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className={formStyles.formGroup}>
                  <label htmlFor="exp-description" className={formStyles.formLabel}>Mô tả công việc chính</label>
                  <textarea
                    id="exp-description"
                    className={formStyles.textareaField}
                    placeholder="Các nhiệm vụ, công việc cụ thể bạn đã đảm nhận..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className={formStyles.formGroup}>
                  <label htmlFor="exp-achievements" className={formStyles.formLabel}>Thành tựu nổi bật</label>
                  <input
                    id="exp-achievements"
                    type="text"
                    className={formStyles.inputField}
                    placeholder="Ví dụ: Tăng 20% doanh thu, tối ưu 35% hiệu năng..."
                    value={achievements}
                    onChange={(e) => setAchievements(e.target.value)}
                  />
                </div>

                <div className={formStyles.formGroup}>
                  <label htmlFor="exp-skills" className={formStyles.formLabel}>
                    Kỹ năng áp dụng (phân cách bằng dấu phẩy)
                  </label>
                  <input
                    id="exp-skills"
                    type="text"
                    className={formStyles.inputField}
                    placeholder="React, TypeScript, CSS..."
                    value={skillTags}
                    onChange={(e) => setSkillTags(e.target.value)}
                  />
                </div>
              </div>

              <footer className={formStyles.modalFooter}>
                <button
                  type="button"
                  className={formStyles.btnSecondary}
                  onClick={() => setModalMode(null)}
                  disabled={isSaving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={formStyles.btnPrimary}
                  disabled={isSaving}
                >
                  {isSaving ? "Đang lưu..." : modalMode === "add" ? "Thêm kinh nghiệm" : "Cập nhật"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa */}
      {deleteTargetId && (
        <div
          className={formStyles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTargetId(null);
          }}
          role="presentation"
        >
          <div
            className={formStyles.modalDialog}
            style={{ maxWidth: 420 }}
            role="alertdialog"
            aria-labelledby="delete-exp-title"
            tabIndex={-1}
          >
            <header className={formStyles.modalHeader}>
              <h3 id="delete-exp-title" className={formStyles.modalTitle}>
                Xác nhận xóa kinh nghiệm
              </h3>
            </header>
            <div className={formStyles.modalBody}>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                Bạn có chắc chắn muốn xóa bản ghi kinh nghiệm này khỏi hồ sơ không?
              </p>
            </div>
            <footer className={formStyles.modalFooter}>
              <button
                type="button"
                className={formStyles.btnSecondary}
                onClick={() => setDeleteTargetId(null)}
                disabled={isSaving}
              >
                Hủy
              </button>
              <button
                type="button"
                className={formStyles.btnDanger}
                onClick={handleConfirmDelete}
                disabled={isSaving}
              >
                {isSaving ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};
