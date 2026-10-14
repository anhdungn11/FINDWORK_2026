/**
 * FINDWORK CP8B — EDUCATION SECTION
 * 
 * Hiển thị và quản lý quá trình học vấn: Bằng cấp, trường học,
 * chuyên ngành, điểm GPA và thành tích đào tạo.
 */

import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, GraduationCap, Pencil, Plus, Trash2, X } from "lucide-react";
import type { CandidateEducationRecord } from "../types/candidateProfile.types";
import type { EducationSectionProps } from "../types/uiProfileProps.types";
import { formatMonthYear } from "../utils/profileFormatters";
import { useModalAccessibility } from "../utils/useModalAccessibility";
import formStyles from "../styles/ProfileForms.module.css";
import sectionStyles from "../styles/ProfileSections.module.css";

export const EducationSection = ({
  educationList = [],
  onAddEducation,
  onUpdateEducation,
  onDeleteEducation,
  isSaving = false,
}: EducationSectionProps) => {
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<CandidateEducationRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const [school, setSchool] = useState("");
  const [degree, setDegree] = useState("");
  const [major, setMajor] = useState("");
  const [startMonth, setStartMonth] = useState("9");
  const [startYear, setStartYear] = useState("2020");
  const [endMonth, setEndMonth] = useState("6");
  const [endYear, setEndYear] = useState("2024");
  const [isStudying, setIsStudying] = useState(false);
  const [gpa, setGpa] = useState("");
  const [gpaScale, setGpaScale] = useState<"" | "4" | "10" | "100">("4");
  const [achievements, setAchievements] = useState("");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formDialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const deleteCancelBtnRef = useRef<HTMLButtonElement>(null);

  // Focus trap, Escape, initial focus, focus restoration, and scroll lock for add/edit form modal
  useModalAccessibility({
    isOpen: modalMode !== null,
    onClose: () => setModalMode(null),
    containerRef: formDialogRef,
    initialFocusRef: firstInputRef,
  });

  // Focus trap, Escape, initial focus, focus restoration, and scroll lock for delete confirm modal
  useModalAccessibility({
    isOpen: deleteTargetId !== null,
    onClose: () => setDeleteTargetId(null),
    containerRef: deleteDialogRef,
    initialFocusRef: deleteCancelBtnRef,
  });

  const openAddModal = () => {
    setModalMode("add");
    setEditingItem(null);
    setSchool("");
    setDegree("");
    setMajor("");
    setStartMonth("9");
    setStartYear("2020");
    setEndMonth("6");
    setEndYear("2024");
    setIsStudying(false);
    setGpa("");
    setGpaScale("4");
    setAchievements("");
    setDescription("");
    setErrorMsg(null);
  };

  const openEditModal = (item: CandidateEducationRecord) => {
    setModalMode("edit");
    setEditingItem(item);
    setSchool(item.school);
    setDegree(item.degree);
    setMajor(item.major);
    setStartMonth(String(item.startMonth));
    setStartYear(String(item.startYear));
    setEndMonth(item.endMonth ? String(item.endMonth) : "");
    setEndYear(item.endYear ? String(item.endYear) : "");
    setIsStudying(item.isStudying);
    setGpa(item.gpa ? String(item.gpa) : "");
    setGpaScale((item.gpaScale as "" | "4" | "10" | "100") || "4");
    setAchievements(item.achievements || "");
    setDescription(item.description || "");
    setErrorMsg(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!school.trim() || !degree.trim() || !major.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ Trường, Bằng cấp và Chuyên ngành.");
      return;
    }

    const payload = {
      school: school.trim(),
      degree: degree.trim(),
      major: major.trim(),
      startMonth: parseInt(startMonth, 10) || 1,
      startYear: parseInt(startYear, 10) || 2020,
      endMonth: isStudying ? null : parseInt(endMonth, 10) || null,
      endYear: isStudying ? null : parseInt(endYear, 10) || null,
      isStudying,
      gpa: gpa.trim() || null,
      gpaScale: gpaScale || null,
      achievements: achievements.trim() || null,
      description: description.trim() || null,
    };

    if (modalMode === "add" && onAddEducation) {
      await onAddEducation(payload);
    } else if (modalMode === "edit" && editingItem && onUpdateEducation) {
      await onUpdateEducation(editingItem.id, payload);
    }
    setModalMode(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetId && onDeleteEducation) {
      await onDeleteEducation(deleteTargetId);
    }
    setDeleteTargetId(null);
  };

  return (
    <>
      <section
        id="section-education"
        className={sectionStyles.card}
        aria-labelledby="education-section-title"
      >
        <div className={sectionStyles.cardHeader}>
          <div className={sectionStyles.cardTitleGroup}>
            <div className={sectionStyles.cardIcon}>
              <GraduationCap size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 id="education-section-title" className={sectionStyles.cardTitle}>
                Học vấn & Bằng cấp
              </h3>
              <p className={sectionStyles.cardSubtitle}>
                Quá trình đào tạo chính quy, cao đẳng, đại học và các chứng nhận học thuật
              </p>
            </div>
          </div>

          <button
            type="button"
            className={sectionStyles.addButton}
            onClick={openAddModal}
            aria-label="Thêm bằng cấp hoặc cơ sở đào tạo mới"
          >
            <Plus size={14} aria-hidden="true" />
            <span>Thêm học vấn</span>
          </button>
        </div>

        {educationList.length === 0 ? (
          <div className={sectionStyles.sectionEmptyState}>
            <GraduationCap size={32} style={{ opacity: 0.4 }} aria-hidden="true" />
            <h4 className={sectionStyles.sectionEmptyTitle}>Chưa có thông tin học vấn</h4>
            <p className={sectionStyles.sectionEmptySubtitle}>
              Bổ sung trường đào tạo và bằng cấp giúp nhà tuyển dụng có cái nhìn rõ ràng về nền tảng chuyên môn của bạn.
            </p>
            <button
              type="button"
              className={sectionStyles.addButton}
              onClick={openAddModal}
            >
              <Plus size={14} aria-hidden="true" />
              <span>Thêm học vấn đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className={sectionStyles.timelineList}>
            {educationList.map((item) => (
              <article key={item.id} className={sectionStyles.timelineItem}>
                <div className={sectionStyles.timelineMarker} aria-hidden="true" />
                <div className={sectionStyles.timelineBody}>
                  <div className={sectionStyles.timelineHeader}>
                    <div>
                      <h4 className={sectionStyles.timelinePrimaryTitle}>{item.school}</h4>
                      <p className={sectionStyles.timelineSecondaryTitle}>
                        {item.degree} • Chuyên ngành: {item.major}
                      </p>
                    </div>

                    <span className={sectionStyles.timelineDateBadge}>
                      {formatMonthYear(item.startMonth, item.startYear)} —{" "}
                      {item.isStudying ? "Hiện tại" : formatMonthYear(item.endMonth, item.endYear)}
                    </span>
                  </div>

                  {item.gpa && (
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "var(--color-primary)" }}>
                      GPA: <strong>{item.gpa}</strong>
                      {item.gpaScale ? `/${item.gpaScale}` : ""}
                    </p>
                  )}

                  {item.achievements && (
                    <p className={sectionStyles.timelineDescription}>
                      <strong>Thành tích:</strong> {item.achievements}
                    </p>
                  )}

                  {item.description && (
                    <p className={sectionStyles.timelineDescription}>{item.description}</p>
                  )}

                  <div className={sectionStyles.timelineActions}>
                    <button
                      type="button"
                      className={sectionStyles.iconActionButton}
                      onClick={() => openEditModal(item)}
                      aria-label={`Chỉnh sửa học vấn tại ${item.school}`}
                    >
                      <Pencil size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${sectionStyles.iconActionButton} ${sectionStyles.iconActionButtonDanger}`}
                      onClick={() => setDeleteTargetId(item.id)}
                      aria-label={`Xóa học vấn tại ${item.school}`}
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

      {/* Modal Thêm / Chỉnh Sửa Học Vấn */}
      {modalMode && (
        <div
          className={formStyles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalMode(null);
          }}
          role="presentation"
        >
          <div
            ref={formDialogRef}
            className={formStyles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="education-modal-title"
            tabIndex={-1}
          >
            <header className={formStyles.modalHeader}>
              <h3 id="education-modal-title" className={formStyles.modalTitle}>
                {modalMode === "add" ? "Thêm học vấn mới" : "Chỉnh sửa học vấn"}
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
                  <div id="education-error-summary" className={formStyles.errorSummary} role="alert" tabIndex={-1}>
                    <div className={formStyles.errorSummaryTitle}>
                      <AlertCircle size={14} aria-hidden="true" />
                      <span>Thông tin chưa hợp lệ:</span>
                    </div>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className={formStyles.formGroup}>
                  <label htmlFor="edu-school" className={`${formStyles.formLabel} ${formStyles.formLabelRequired}`}>
                    Trường / Cơ sở đào tạo
                  </label>
                  <input
                    ref={firstInputRef}
                    id="edu-school"
                    type="text"
                    className={`${formStyles.inputField} ${errorMsg && !school.trim() ? formStyles.inputFieldInvalid : ""}`}
                    placeholder="Ví dụ: Đại học Bách Khoa Hà Nội"
                    value={school}
                    onChange={(e) => {
                      setSchool(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    required
                    aria-required="true"
                    aria-invalid={Boolean(errorMsg && !school.trim())}
                    aria-describedby={errorMsg ? "education-error-summary" : undefined}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className={formStyles.formGroup}>
                    <label htmlFor="edu-degree" className={`${formStyles.formLabel} ${formStyles.formLabelRequired}`}>
                      Bằng cấp
                    </label>
                    <input
                      id="edu-degree"
                      type="text"
                      className={`${formStyles.inputField} ${errorMsg && !degree.trim() ? formStyles.inputFieldInvalid : ""}`}
                      placeholder="Cử nhân, Kỹ sư, Thạc sĩ..."
                      value={degree}
                      onChange={(e) => {
                        setDegree(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      required
                      aria-required="true"
                      aria-invalid={Boolean(errorMsg && !degree.trim())}
                      aria-describedby={errorMsg ? "education-error-summary" : undefined}
                    />
                  </div>

                  <div className={formStyles.formGroup}>
                    <label htmlFor="edu-major" className={`${formStyles.formLabel} ${formStyles.formLabelRequired}`}>
                      Chuyên ngành
                    </label>
                    <input
                      id="edu-major"
                      type="text"
                      className={`${formStyles.inputField} ${errorMsg && !major.trim() ? formStyles.inputFieldInvalid : ""}`}
                      placeholder="Công nghệ Thông tin, Kinh tế..."
                      value={major}
                      onChange={(e) => {
                        setMajor(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      required
                      aria-required="true"
                      aria-invalid={Boolean(errorMsg && !major.trim())}
                      aria-describedby={errorMsg ? "education-error-summary" : undefined}
                    />
                  </div>
                </div>

                <div className={formStyles.checkboxRow}>
                  <input
                    id="edu-studying"
                    type="checkbox"
                    className={formStyles.checkboxInput}
                    checked={isStudying}
                    onChange={(e) => setIsStudying(e.target.checked)}
                  />
                  <label htmlFor="edu-studying">Hiện đang học tại đây</label>
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

                  {!isStudying && (
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.formLabel}>Thời gian tốt nghiệp</label>
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

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem" }}>
                  <div className={formStyles.formGroup}>
                    <label htmlFor="edu-gpa" className={formStyles.formLabel}>Điểm GPA (tùy chọn)</label>
                    <input
                      id="edu-gpa"
                      type="text"
                      className={formStyles.inputField}
                      placeholder="Ví dụ: 3.65"
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                    />
                  </div>
                  <div className={formStyles.formGroup}>
                    <label htmlFor="edu-scale" className={formStyles.formLabel}>Thang điểm</label>
                    <select
                      id="edu-scale"
                      className={formStyles.selectField}
                      value={gpaScale}
                      onChange={(e) => setGpaScale(e.target.value as "" | "4" | "10" | "100")}
                    >
                      <option value="4">Thang 4</option>
                      <option value="10">Thang 10</option>
                      <option value="100">Thang 100</option>
                    </select>
                  </div>
                </div>

                <div className={formStyles.formGroup}>
                  <label htmlFor="edu-achievements" className={formStyles.formLabel}>Thành tích / Học bổng</label>
                  <input
                    id="edu-achievements"
                    type="text"
                    className={formStyles.inputField}
                    placeholder="Học bổng, giải thưởng NCKH..."
                    value={achievements}
                    onChange={(e) => setAchievements(e.target.value)}
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
                  {isSaving ? "Đang lưu..." : modalMode === "add" ? "Thêm học vấn" : "Cập nhật"}
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
            ref={deleteDialogRef}
            className={formStyles.modalDialog}
            style={{ maxWidth: 420 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-edu-title"
            tabIndex={-1}
          >
            <header className={formStyles.modalHeader}>
              <h3 id="delete-edu-title" className={formStyles.modalTitle}>
                Xác nhận xóa học vấn
              </h3>
            </header>
            <div className={formStyles.modalBody}>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                Bạn có chắc chắn muốn xóa bản ghi học vấn này khỏi hồ sơ không? Hành động này không thể hoàn tác.
              </p>
            </div>
            <footer className={formStyles.modalFooter}>
              <button
                ref={deleteCancelBtnRef}
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
