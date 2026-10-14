/**
 * FINDWORK CP8B — SKILLS AND LANGUAGES SECTION
 * 
 * Hiển thị và quản lý kỹ năng chuyên môn và trình độ ngoại ngữ kèm chứng chỉ.
 * ĐẢM BẢO RÀNG BUỘC: Linh hoạt theo ngành nghề, không áp đặt số lượng cố định.
 */

import { useRef, useState, type FormEvent } from "react";
import { Award, Globe, Plus, Sparkles, Trash2, X } from "lucide-react";
import type {
  LanguageProficiency,
  SkillLevel,
} from "../types/candidateProfile.types";
import type { SkillsAndLanguagesSectionProps } from "../types/uiProfileProps.types";
import { useModalAccessibility } from "../utils/useModalAccessibility";
import formStyles from "../styles/ProfileForms.module.css";
import sectionStyles from "../styles/ProfileSections.module.css";

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: "Mới bắt đầu",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
  PROFICIENT: "Thành thạo",
  EXPERT: "Chuyên gia",
};

const LANG_LEVEL_LABELS: Record<LanguageProficiency, string> = {
  BASIC: "Cơ bản",
  CONVERSATIONAL: "Giao tiếp",
  PROFESSIONAL: "Chuyên nghiệp",
  FLUENT: "Thành thạo",
  NATIVE: "Bản ngữ",
};

export const SkillsAndLanguagesSection = ({
  skills = [],
  languages = [],
  onAddSkill,
  onDeleteSkill,
  onAddLanguage,
  onDeleteLanguage,
  isSaving = false,
}: SkillsAndLanguagesSectionProps) => {
  // Skill Dialog State
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel>("INTERMEDIATE");
  const [yearsOfExp, setYearsOfExp] = useState("");
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);

  // Language Dialog State
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [langName, setLangName] = useState("");
  const [overallLevel, setOverallLevel] = useState<LanguageProficiency>("CONVERSATIONAL");
  const [certName, setCertName] = useState("");
  const [certScore, setCertScore] = useState("");
  const [langError, setLangError] = useState<string | null>(null);

  // Confirm delete target
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "skill" | "language";
    id: string;
    name: string;
  } | null>(null);

  const skillDialogRef = useRef<HTMLDivElement>(null);
  const skillInputRef = useRef<HTMLInputElement>(null);
  const langDialogRef = useRef<HTMLDivElement>(null);
  const langInputRef = useRef<HTMLInputElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement>(null);
  const deleteCancelBtnRef = useRef<HTMLButtonElement>(null);

  useModalAccessibility({
    isOpen: isSkillModalOpen,
    onClose: () => setIsSkillModalOpen(false),
    containerRef: skillDialogRef,
    initialFocusRef: skillInputRef,
  });

  useModalAccessibility({
    isOpen: isLangModalOpen,
    onClose: () => setIsLangModalOpen(false),
    containerRef: langDialogRef,
    initialFocusRef: langInputRef,
  });

  useModalAccessibility({
    isOpen: deleteTarget !== null,
    onClose: () => setDeleteTarget(null),
    containerRef: deleteDialogRef,
    initialFocusRef: deleteCancelBtnRef,
  });

  const handleSkillSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) {
      setSkillError("Vui lòng nhập tên kỹ năng.");
      return;
    }
    if (onAddSkill) {
      await onAddSkill({
        skillName: skillName.trim(),
        level: skillLevel,
        yearsOfExperience: yearsOfExp.trim() || null,
        isHighlighted,
      });
    }
    setIsSkillModalOpen(false);
    setSkillName("");
    setYearsOfExp("");
    setIsHighlighted(false);
    setSkillError(null);
  };

  const handleLangSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!langName.trim()) {
      setLangError("Vui lòng nhập tên ngoại ngữ.");
      return;
    }
    const certs = certName.trim()
      ? [
          {
            id: `cert-${Date.now()}`,
            certificateName: certName.trim(),
            overallScore: certScore.trim() || null,
          },
        ]
      : [];

    if (onAddLanguage) {
      await onAddLanguage({
        languageName: langName.trim(),
        overallLevel,
        certificates: certs,
      });
    }
    setIsLangModalOpen(false);
    setLangName("");
    setCertName("");
    setCertScore("");
    setLangError(null);
  };

  return (
    <>
      <section
        id="section-skills"
        className={sectionStyles.card}
        aria-labelledby="skills-section-title"
      >
        <div className={sectionStyles.cardHeader}>
          <div className={sectionStyles.cardTitleGroup}>
            <div className={sectionStyles.cardIcon}>
              <Sparkles size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 id="skills-section-title" className={sectionStyles.cardTitle}>
                Kỹ năng chuyên môn
              </h3>
              <p className={sectionStyles.cardSubtitle}>
                Các kỹ năng phù hợp với chuyên môn công việc của bạn
              </p>
            </div>
          </div>

          <button
            type="button"
            className={sectionStyles.addButton}
            onClick={() => setIsSkillModalOpen(true)}
            aria-label="Thêm kỹ năng chuyên môn"
          >
            <Plus size={14} aria-hidden="true" />
            <span>Thêm kỹ năng</span>
          </button>
        </div>

        {skills.length === 0 ? (
          <div className={sectionStyles.sectionEmptyState}>
            <p className={sectionStyles.sectionEmptySubtitle}>
              Chưa có kỹ năng nào được thêm. Hãy bổ sung kỹ năng chuyên môn phù hợp với ngành của bạn.
            </p>
          </div>
        ) : (
          <div className={sectionStyles.chipsWrap}>
            {skills.map((s) => (
              <span
                key={s.id}
                className={`${sectionStyles.skillChip} ${
                  s.isHighlighted ? sectionStyles.skillChipHighlighted : ""
                }`}
              >
                <strong>{s.skillName}</strong>
                <span style={{ opacity: 0.7, fontSize: "0.6875rem" }}>
                  ({SKILL_LEVEL_LABELS[s.level]}
                  {s.yearsOfExperience ? ` • ${s.yearsOfExperience} năm` : ""})
                </span>
                {onDeleteSkill && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ type: "skill", id: s.id, name: s.skillName })}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0 2px",
                      color: "inherit",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                    aria-label={`Xóa kỹ năng ${s.skillName}`}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Khối Ngoại ngữ trong cùng thẻ card */}
        <div
          id="section-languages"
          style={{
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--color-border-soft)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Globe size={16} color="var(--color-primary)" aria-hidden="true" />
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
                Ngoại ngữ & Chứng chỉ
              </h4>
            </div>

            <button
              type="button"
              className={sectionStyles.addButton}
              onClick={() => setIsLangModalOpen(true)}
              aria-label="Thêm ngoại ngữ mới"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Thêm ngoại ngữ</span>
            </button>
          </div>

          {languages.length === 0 ? (
            <p className={sectionStyles.sectionEmptySubtitle} style={{ margin: 0 }}>
              Chưa có thông tin ngoại ngữ. Bổ sung khả năng ngôn ngữ giúp mở rộng cơ hội việc làm đa quốc gia.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {languages.map((lang) => (
                <div
                  key={lang.id}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "10px",
                    background: "var(--color-surface-soft)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      {lang.languageName}
                    </span>
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.75rem",
                        color: "var(--color-primary)",
                        background: "var(--color-primary-soft)",
                        padding: "2px 8px",
                        borderRadius: "9999px",
                      }}
                    >
                      {LANG_LEVEL_LABELS[lang.overallLevel]}
                    </span>

                    {lang.certificates && lang.certificates.length > 0 && (
                      <div
                        style={{
                          marginTop: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.75rem",
                          color: "#15803d",
                        }}
                      >
                        <Award size={13} aria-hidden="true" />
                        <span>
                          {lang.certificates[0].certificateName}
                          {lang.certificates[0].overallScore
                            ? ` (${lang.certificates[0].overallScore})`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {onDeleteLanguage && (
                    <button
                      type="button"
                      className={`${sectionStyles.iconActionButton} ${sectionStyles.iconActionButtonDanger}`}
                      onClick={() => setDeleteTarget({ type: "language", id: lang.id, name: lang.languageName })}
                      aria-label={`Xóa ngoại ngữ ${lang.languageName}`}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modal Thêm Kỹ Năng */}
      {isSkillModalOpen && (
        <div
          className={formStyles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSkillModalOpen(false);
          }}
          role="presentation"
        >
          <div
            ref={skillDialogRef}
            className={formStyles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="skill-modal-title"
            tabIndex={-1}
          >
            <header className={formStyles.modalHeader}>
              <h3 id="skill-modal-title" className={formStyles.modalTitle}>
                Thêm kỹ năng chuyên môn
              </h3>
              <button
                type="button"
                className={formStyles.modalCloseBtn}
                onClick={() => setIsSkillModalOpen(false)}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <form onSubmit={handleSkillSubmit} style={{ display: "contents" }}>
              <div className={formStyles.modalBody}>
                {skillError && (
                  <div id="skill-error-summary" className={formStyles.errorSummary} role="alert" tabIndex={-1}>
                    <span>{skillError}</span>
                  </div>
                )}

                <div className={formStyles.formGroup}>
                  <label htmlFor="skill-name" className={`${formStyles.formLabel} ${formStyles.formLabelRequired}`}>
                    Tên kỹ năng
                  </label>
                  <input
                    ref={skillInputRef}
                    id="skill-name"
                    type="text"
                    className={`${formStyles.inputField} ${skillError ? formStyles.inputFieldInvalid : ""}`}
                    placeholder="Ví dụ: React, Phân tích tài chính, SEO..."
                    value={skillName}
                    onChange={(e) => {
                      setSkillName(e.target.value);
                      if (skillError) setSkillError(null);
                    }}
                    required
                    aria-required="true"
                    aria-invalid={Boolean(skillError)}
                    aria-describedby={skillError ? "skill-error-summary" : undefined}
                  />
                </div>

                <div className={formStyles.formGroup}>
                  <label htmlFor="skill-level" className={formStyles.formLabel}>
                    Mức độ thành thạo
                  </label>
                  <select
                    id="skill-level"
                    className={formStyles.selectField}
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
                  >
                    <option value="BEGINNER">Mới bắt đầu</option>
                    <option value="INTERMEDIATE">Trung cấp</option>
                    <option value="ADVANCED">Nâng cao</option>
                    <option value="PROFICIENT">Thành thạo</option>
                    <option value="EXPERT">Chuyên gia</option>
                  </select>
                </div>

                <div className={formStyles.formGroup}>
                  <label htmlFor="skill-years" className={formStyles.formLabel}>
                    Số năm kinh nghiệm
                  </label>
                  <input
                    id="skill-years"
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    className={formStyles.inputField}
                    placeholder="Ví dụ: 3"
                    value={yearsOfExp}
                    onChange={(e) => setYearsOfExp(e.target.value)}
                  />
                </div>

                <div className={formStyles.checkboxRow}>
                  <input
                    id="skill-highlight"
                    type="checkbox"
                    className={formStyles.checkboxInput}
                    checked={isHighlighted}
                    onChange={(e) => setIsHighlighted(e.target.checked)}
                  />
                  <label htmlFor="skill-highlight">Đánh dấu là kỹ năng nổi bật</label>
                </div>
              </div>

              <footer className={formStyles.modalFooter}>
                <button
                  type="button"
                  className={formStyles.btnSecondary}
                  onClick={() => setIsSkillModalOpen(false)}
                  disabled={isSaving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={formStyles.btnPrimary}
                  disabled={isSaving}
                >
                  {isSaving ? "Đang lưu..." : "Thêm kỹ năng"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Ngoại Ngữ */}
      {isLangModalOpen && (
        <div
          className={formStyles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLangModalOpen(false);
          }}
          role="presentation"
        >
          <div
            ref={langDialogRef}
            className={formStyles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lang-modal-title"
            tabIndex={-1}
          >
            <header className={formStyles.modalHeader}>
              <h3 id="lang-modal-title" className={formStyles.modalTitle}>
                Thêm ngoại ngữ & Chứng chỉ
              </h3>
              <button
                type="button"
                className={formStyles.modalCloseBtn}
                onClick={() => setIsLangModalOpen(false)}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <form onSubmit={handleLangSubmit} style={{ display: "contents" }}>
              <div className={formStyles.modalBody}>
                {langError && (
                  <div id="lang-error-summary" className={formStyles.errorSummary} role="alert" tabIndex={-1}>
                    <span>{langError}</span>
                  </div>
                )}

                <div className={formStyles.formGroup}>
                  <label htmlFor="lang-name" className={`${formStyles.formLabel} ${formStyles.formLabelRequired}`}>
                    Ngôn ngữ
                  </label>
                  <input
                    ref={langInputRef}
                    id="lang-name"
                    type="text"
                    className={`${formStyles.inputField} ${langError ? formStyles.inputFieldInvalid : ""}`}
                    placeholder="Ví dụ: Tiếng Anh, Tiếng Nhật, Tiếng Trung..."
                    value={langName}
                    onChange={(e) => {
                      setLangName(e.target.value);
                      if (langError) setLangError(null);
                    }}
                    required
                    aria-required="true"
                    aria-invalid={Boolean(langError)}
                    aria-describedby={langError ? "lang-error-summary" : undefined}
                  />
                </div>

                <div className={formStyles.formGroup}>
                  <label htmlFor="lang-level" className={formStyles.formLabel}>
                    Trình độ tổng thể
                  </label>
                  <select
                    id="lang-level"
                    className={formStyles.selectField}
                    value={overallLevel}
                    onChange={(e) => setOverallLevel(e.target.value as LanguageProficiency)}
                  >
                    <option value="BASIC">Cơ bản</option>
                    <option value="CONVERSATIONAL">Giao tiếp tốt</option>
                    <option value="PROFESSIONAL">Làm việc chuyên nghiệp</option>
                    <option value="FLUENT">Thành thạo</option>
                    <option value="NATIVE">Bản ngữ</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem" }}>
                  <div className={formStyles.formGroup}>
                    <label htmlFor="lang-cert-name" className={formStyles.formLabel}>Chứng chỉ (nếu có)</label>
                    <input
                      id="lang-cert-name"
                      type="text"
                      className={formStyles.inputField}
                      placeholder="IELTS, TOEIC, JLPT..."
                      value={certName}
                      onChange={(e) => setCertName(e.target.value)}
                    />
                  </div>

                  <div className={formStyles.formGroup}>
                    <label htmlFor="lang-cert-score" className={formStyles.formLabel}>Điểm số</label>
                    <input
                      id="lang-cert-score"
                      type="text"
                      className={formStyles.inputField}
                      placeholder="7.5, N2, 850..."
                      value={certScore}
                      onChange={(e) => setCertScore(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <footer className={formStyles.modalFooter}>
                <button
                  type="button"
                  className={formStyles.btnSecondary}
                  onClick={() => setIsLangModalOpen(false)}
                  disabled={isSaving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={formStyles.btnPrimary}
                  disabled={isSaving}
                >
                  {isSaving ? "Đang lưu..." : "Thêm ngoại ngữ"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Kỹ Năng / Ngoại Ngữ */}
      {deleteTarget && (
        <div
          className={formStyles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
          role="presentation"
        >
          <div
            ref={deleteDialogRef}
            className={formStyles.modalDialog}
            style={{ maxWidth: 420 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-skill-lang-title"
            tabIndex={-1}
          >
            <header className={formStyles.modalHeader}>
              <h3 id="delete-skill-lang-title" className={formStyles.modalTitle}>
                Xác nhận xóa {deleteTarget.type === "skill" ? "kỹ năng" : "ngoại ngữ"}
              </h3>
            </header>
            <div className={formStyles.modalBody}>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                Bạn có chắc chắn muốn xóa {deleteTarget.type === "skill" ? "kỹ năng" : "ngoại ngữ"}{" "}
                <strong>{deleteTarget.name}</strong> khỏi hồ sơ không?
              </p>
            </div>
            <footer className={formStyles.modalFooter}>
              <button
                ref={deleteCancelBtnRef}
                type="button"
                className={formStyles.btnSecondary}
                onClick={() => setDeleteTarget(null)}
                disabled={isSaving}
              >
                Hủy
              </button>
              <button
                type="button"
                className={formStyles.btnDanger}
                onClick={async () => {
                  if (deleteTarget.type === "skill" && onDeleteSkill) {
                    await onDeleteSkill(deleteTarget.id);
                  } else if (deleteTarget.type === "language" && onDeleteLanguage) {
                    await onDeleteLanguage(deleteTarget.id);
                  }
                  setDeleteTarget(null);
                }}
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
