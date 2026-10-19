import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import { publicApi } from "@/services/api/publicApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { EMPTY_JOB_FORM, formToPayload, validateJobForm, type JobFormErrors, type JobFormValues } from "@/services/api/jobForm";
import {
  EMPLOYMENT_TYPE_LABEL,
  WORKPLACE_TYPE_LABEL,
  SALARY_PERIOD_LABEL,
  SCREENING_QUESTION_TYPES,
  type JobDto,
  type ScreeningQuestionType,
  type ScreeningQuestionInput,
} from "@/services/api/apiTypes";
import { WritesDisabledNotice } from "./EmployerDashboardPage";

const toLocalInput = (iso: string | null) => (iso ? iso.slice(0, 16) : "");
const fromJob = (j: JobDto): JobFormValues => ({
  categoryId: j.categoryId ?? "",
  title: j.title,
  description: j.description ?? "",
  employmentType: j.employmentType ?? "",
  workplaceType: j.workplaceType ?? "",
  experienceMinMonths: j.experienceMinMonths?.toString() ?? "",
  experienceMaxMonths: j.experienceMaxMonths?.toString() ?? "",
  salaryMin: j.salaryMin?.toString() ?? "",
  salaryMax: j.salaryMax?.toString() ?? "",
  salaryPeriod: j.salaryPeriod ?? "MONTH",
  salaryNegotiable: j.salaryNegotiable,
  showSalary: j.showSalary,
  applicationDeadline: toLocalInput(j.applicationDeadline),
});

const SCREENING_TYPE_LABEL: Record<ScreeningQuestionType, string> = {
  TEXT: "Văn bản ngắn (1 dòng)",
  TEXTAREA: "Đoạn văn dài (Nhiều dòng)",
  YES_NO: "Có / Không (Yes / No)",
  SELECT: "Chọn một lựa chọn (Dropdown)",
  MULTI_SELECT: "Chọn nhiều lựa chọn (Multi-select)",
};

interface EditableQuestion {
  id?: string;
  type: ScreeningQuestionType;
  label: string;
  isRequired: boolean;
  optionsText: string;
}

const Field = ({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) => (
  <div className={ui.field}>
    <label className={ui.label} htmlFor={id}>{label}</label>
    {children}
    {hint && !error && <span className={ui.hint} id={`${id}-hint`}>{hint}</span>}
    {error && <span className={ui.fieldError} id={`${id}-err`} role="alert">{error}</span>}
  </div>
);

const EmployerJobFormPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const isEdit = Boolean(jobId);
  const { active } = useCompanyWorkspace();
  const navigate = useNavigate();
  const writes = isWorkspaceWritesEnabled();

  const categories = useAsyncData((s) => publicApi.listJobCategories(s), []);
  const existing = useAsyncData((s) => companyWorkspaceApi.getJob(active.id, jobId!, s), [active.id, jobId], isEdit);
  const screeningData = useAsyncData(
    (s) => companyWorkspaceApi.listScreeningQuestions(active.id, jobId!, s),
    [active.id, jobId],
    isEdit,
  );

  const [values, setValues] = useState<JobFormValues>(EMPTY_JOB_FORM);
  const [errors, setErrors] = useState<JobFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Screening questions local state
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [questionsNotice, setQuestionsNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (existing.data) setValues(fromJob(existing.data));
  }, [existing.data]);

  useEffect(() => {
    if (screeningData.data?.questions) {
      setQuestions(
        screeningData.data.questions.map((q) => ({
          id: q.id,
          type: q.type,
          label: q.label,
          isRequired: q.isRequired,
          optionsText: (q.options ?? []).join(", "),
        })),
      );
    }
  }, [screeningData.data]);

  const set = <K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const ariaFor = (key: keyof JobFormValues) => ({ "aria-invalid": Boolean(errors[key]) || undefined, "aria-describedby": errors[key] ? `f-${key}-err` : undefined });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const found = validateJobForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      const payload = formToPayload(values);
      if (isEdit && existing.data?.version != null) {
        await companyWorkspaceApi.updateJob(active.id, jobId!, existing.data.version, payload);
      } else {
        await companyWorkspaceApi.createJob(active.id, payload);
      }
      navigate("/employer/jobs");
    } catch (err) {
      setSubmitError(toApiFailure(err).message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = () => {
    if (questions.length >= 20) return;
    setQuestions((prev) => [
      ...prev,
      {
        type: "TEXT",
        label: "",
        isRequired: false,
        optionsText: "",
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveQuestion = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleQuestionChange = <K extends keyof EditableQuestion>(idx: number, key: K, val: EditableQuestion[K]) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [key]: val } : q)),
    );
  };

  const handleSaveQuestions = async () => {
    setQuestionsNotice(null);
    if (!existing.data) return;

    // Validate questions locally before sending
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.label || q.label.trim().length < 3) {
        setQuestionsNotice({
          tone: "error",
          text: `Câu hỏi số ${i + 1} phải có nội dung câu hỏi tối thiểu 3 ký tự.`,
        });
        return;
      }
      if (q.type === "SELECT" || q.type === "MULTI_SELECT") {
        const rawOpts = q.optionsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
        if (rawOpts.length < 2) {
          setQuestionsNotice({
            tone: "error",
            text: `Câu hỏi số ${i + 1} dạng lựa chọn cần tối thiểu 2 tùy chọn riêng biệt (ngăn cách bằng dấu phẩy).`,
          });
          return;
        }
      }
    }

    setSavingQuestions(true);
    try {
      const payload: ScreeningQuestionInput[] = questions.map((q, idx) => {
        const isChoice = q.type === "SELECT" || q.type === "MULTI_SELECT";
        return {
          type: q.type,
          label: q.label.trim(),
          isRequired: Boolean(q.isRequired),
          displayOrder: idx,
          ...(isChoice
            ? {
                options: q.optionsText
                  .split(/[\n,]/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              }
            : {}),
        };
      });

      const currentVer = screeningData.data?.version ?? existing.data.version;
      const res = await companyWorkspaceApi.replaceScreeningQuestions(active.id, jobId!, currentVer, payload);
      setQuestionsNotice({
        tone: "ok",
        text: `Đã lưu thành công ${res.questions.length} câu hỏi sàng lọc ứng viên.`,
      });
      existing.reload();
      screeningData.reload();
    } catch (err) {
      setQuestionsNotice({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setSavingQuestions(false);
    }
  };

  if (isEdit && existing.loading) return <LoadingBlock rows={3} />;
  if (isEdit && existing.error) return <ApiErrorState error={existing.error} onRetry={existing.reload} />;
  if (isEdit && existing.data && existing.data.status !== "DRAFT") {
    return <div className={ui.notice} role="alert">Chỉ tin ở trạng thái “Bản nháp” mới được chỉnh sửa. <Link to="/employer/jobs">Quay lại danh sách</Link></div>;
  }

  return (
    <>
      <PageHeader
        title={isEdit ? "Chỉnh sửa tin tuyển dụng" : "Đăng tin tuyển dụng mới"}
        subtitle="Tin mới luôn được lưu ở trạng thái bản nháp; bạn đăng công khai ở bước sau."
      />
      <WritesDisabledNotice />
      {submitError && <div className={`${ui.notice} ${ui.noticeWarn}`} role="alert">{submitError}</div>}

      <form onSubmit={submit} noValidate>
        <Card title="Thông tin chính">
          <Field id="f-title" label="Tiêu đề *" error={errors.title}>
            <input id="f-title" className={ui.input} value={values.title} onChange={(e) => set("title", e.target.value)} maxLength={220} {...ariaFor("title")} />
          </Field>
          <div className={ui.formGrid}>
            <Field id="f-categoryId" label="Ngành nghề *" error={errors.categoryId} hint={categories.error ? "Không tải được danh mục ngành nghề." : undefined}>
              <select id="f-categoryId" className={ui.select} value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} {...ariaFor("categoryId")}>
                <option value="">{categories.loading ? "Đang tải…" : "Chọn ngành nghề"}</option>
                {(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field id="f-employmentType" label="Loại hình *" error={errors.employmentType}>
              <select id="f-employmentType" className={ui.select} value={values.employmentType} onChange={(e) => set("employmentType", e.target.value as JobFormValues["employmentType"])} {...ariaFor("employmentType")}>
                <option value="">Chọn loại hình</option>
                {Object.entries(EMPLOYMENT_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field id="f-workplaceType" label="Hình thức làm việc *" error={errors.workplaceType}>
              <select id="f-workplaceType" className={ui.select} value={values.workplaceType} onChange={(e) => set("workplaceType", e.target.value as JobFormValues["workplaceType"])} {...ariaFor("workplaceType")}>
                <option value="">Chọn hình thức</option>
                {Object.entries(WORKPLACE_TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Field id="f-description" label="Mô tả công việc *" error={errors.description} hint="Tối thiểu 20 ký tự.">
            <textarea id="f-description" className={ui.textarea} value={values.description} onChange={(e) => set("description", e.target.value)} {...ariaFor("description")} />
          </Field>
        </Card>

        <div style={{ height: 16 }} />
        <Card title="Kinh nghiệm, lương và hạn nộp">
          <div className={ui.formGrid}>
            <Field id="f-experienceMinMonths" label="Kinh nghiệm tối thiểu (tháng)" error={errors.experienceMinMonths}>
              <input id="f-experienceMinMonths" className={ui.input} inputMode="numeric" value={values.experienceMinMonths} onChange={(e) => set("experienceMinMonths", e.target.value)} {...ariaFor("experienceMinMonths")} />
            </Field>
            <Field id="f-experienceMaxMonths" label="Kinh nghiệm tối đa (tháng)" error={errors.experienceMaxMonths}>
              <input id="f-experienceMaxMonths" className={ui.input} inputMode="numeric" value={values.experienceMaxMonths} onChange={(e) => set("experienceMaxMonths", e.target.value)} {...ariaFor("experienceMaxMonths")} />
            </Field>
            <Field id="f-salaryMin" label="Lương tối thiểu (VND)" error={errors.salaryMin}>
              <input id="f-salaryMin" className={ui.input} inputMode="numeric" value={values.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} {...ariaFor("salaryMin")} />
            </Field>
            <Field id="f-salaryMax" label="Lương tối đa (VND)" error={errors.salaryMax}>
              <input id="f-salaryMax" className={ui.input} inputMode="numeric" value={values.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} {...ariaFor("salaryMax")} />
            </Field>
            <Field id="f-salaryPeriod" label="Kỳ lương">
              <select id="f-salaryPeriod" className={ui.select} value={values.salaryPeriod} onChange={(e) => set("salaryPeriod", e.target.value as JobFormValues["salaryPeriod"])}>
                {Object.entries(SALARY_PERIOD_LABEL).map(([k, l]) => <option key={k} value={k}>Theo {l}</option>)}
              </select>
            </Field>
            <Field id="f-applicationDeadline" label="Hạn nộp hồ sơ" error={errors.applicationDeadline}>
              <input id="f-applicationDeadline" type="datetime-local" className={ui.input} value={values.applicationDeadline} onChange={(e) => set("applicationDeadline", e.target.value)} {...ariaFor("applicationDeadline")} />
            </Field>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input type="checkbox" checked={values.salaryNegotiable} onChange={(e) => set("salaryNegotiable", e.target.checked)} /> Lương thương lượng
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={values.showSalary} onChange={(e) => set("showSalary", e.target.checked)} /> Hiển thị lương công khai
          </label>
          {errors.showSalary && <span className={ui.fieldError} role="alert">{errors.showSalary}</span>}
        </Card>

        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          <button type="submit" className={`${ui.btn} ${ui.btnPrimary}`} disabled={saving || !writes} aria-disabled={!writes} title={writes ? undefined : "Thao tác ghi đang tắt"}>
            {saving ? "Đang lưu…" : isEdit ? "Lưu thay đổi nội dung tin" : "Lưu bản nháp"}
          </button>
          <Link to="/employer/jobs" className={ui.btn}>Hủy</Link>
        </div>
      </form>

      {/* Screening Questions Manager (available when editing a draft job) */}
      {isEdit && (
        <div style={{ marginTop: 24 }}>
          <Card
            title="Bộ câu hỏi sàng lọc ứng viên (Screening Questions)"
            action={
              <button
                type="button"
                className={`${ui.btn} ${ui.btnPrimary}`}
                style={{ fontSize: "0.875rem", padding: "6px 12px" }}
                disabled={!writes || questions.length >= 20}
                onClick={handleAddQuestion}
              >
                + Thêm câu hỏi ({questions.length}/20)
              </button>
            }
          >
            <p style={{ margin: "0 0 16px", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
              Thiết lập các câu hỏi để ứng viên trả lời trong quá trình nộp hồ sơ ứng tuyển. Hỗ trợ câu hỏi văn bản, Có/Không hoặc câu hỏi trắc nghiệm một/nhiều lựa chọn.
            </p>

            {questionsNotice && (
              <div
                className={`${ui.notice} ${questionsNotice.tone === "error" ? ui.noticeWarn : ""}`}
                role={questionsNotice.tone === "error" ? "alert" : "status"}
                style={{ marginBottom: 16 }}
              >
                {questionsNotice.text}
              </div>
            )}

            {screeningData.loading ? (
              <LoadingBlock rows={2} label="Đang tải danh sách câu hỏi sàng lọc..." />
            ) : screeningData.error ? (
              <ApiErrorState error={screeningData.error} onRetry={screeningData.reload} />
            ) : questions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--color-text-secondary)" }}>
                <p style={{ margin: "0 0 8px" }}>Chưa có câu hỏi sàng lọc nào cho tin tuyển dụng này.</p>
                <button
                  type="button"
                  className={ui.btn}
                  disabled={!writes}
                  onClick={handleAddQuestion}
                >
                  Thêm câu hỏi đầu tiên
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {questions.map((q, idx) => {
                  const isChoice = q.type === "SELECT" || q.type === "MULTI_SELECT";
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: 16,
                        border: "1px solid var(--color-border, #e2e8f0)",
                        borderRadius: 8,
                        background: "var(--color-surface, #fff)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <strong style={{ fontSize: "0.95rem" }}>Câu hỏi #{idx + 1}</strong>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className={ui.btn}
                            style={{ padding: "2px 8px", fontSize: "0.8rem" }}
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, "up")}
                            title="Di chuyển lên"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className={ui.btn}
                            style={{ padding: "2px 8px", fontSize: "0.8rem" }}
                            disabled={idx === questions.length - 1}
                            onClick={() => handleMoveQuestion(idx, "down")}
                            title="Di chuyển xuống"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className={`${ui.btn} ${ui.btnDanger}`}
                            style={{ padding: "2px 8px", fontSize: "0.8rem" }}
                            onClick={() => handleRemoveQuestion(idx)}
                            title="Xóa câu hỏi"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      <div className={ui.formGrid}>
                        <div className={ui.field}>
                          <label className={ui.label} htmlFor={`sq-type-${idx}`}>
                            Loại câu hỏi
                          </label>
                          <select
                            id={`sq-type-${idx}`}
                            className={ui.select}
                            value={q.type}
                            onChange={(e) => handleQuestionChange(idx, "type", e.target.value as ScreeningQuestionType)}
                          >
                            {SCREENING_QUESTION_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {SCREENING_TYPE_LABEL[t] || t}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={ui.field}>
                          <label className={ui.label} htmlFor={`sq-label-${idx}`}>
                            Nội dung câu hỏi *
                          </label>
                          <input
                            id={`sq-label-${idx}`}
                            type="text"
                            className={ui.input}
                            placeholder="Ví dụ: Bạn có kinh nghiệm làm việc với React từ 2 năm trở lên không?"
                            value={q.label}
                            onChange={(e) => handleQuestionChange(idx, "label", e.target.value)}
                            maxLength={500}
                          />
                        </div>
                      </div>

                      {isChoice && (
                        <div className={ui.field} style={{ marginTop: 8 }}>
                          <label className={ui.label} htmlFor={`sq-options-${idx}`}>
                            Các tùy chọn câu trả lời * (cách nhau bởi dấu phẩy)
                          </label>
                          <input
                            id={`sq-options-${idx}`}
                            type="text"
                            className={ui.input}
                            placeholder="Ví dụ: Dưới 1 năm, 1 - 3 năm, Trên 3 năm"
                            value={q.optionsText}
                            onChange={(e) => handleQuestionChange(idx, "optionsText", e.target.value)}
                          />
                          <span className={ui.hint}>Nhập ít nhất 2 tùy chọn riêng biệt, phân tách bằng dấu phẩy.</span>
                        </div>
                      )}

                      <div style={{ marginTop: 8 }}>
                        <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: "0.875rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={q.isRequired}
                            onChange={(e) => handleQuestionChange(idx, "isRequired", e.target.checked)}
                          />
                          Bắt buộc ứng viên phải trả lời
                        </label>
                      </div>
                    </div>
                  );
                })}

                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
                  <button
                    type="button"
                    className={`${ui.btn} ${ui.btnPrimary}`}
                    disabled={!writes || savingQuestions}
                    onClick={handleSaveQuestions}
                  >
                    {savingQuestions ? "Đang lưu bộ câu hỏi..." : "Lưu bộ câu hỏi sàng lọc"}
                  </button>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                    {questions.length} câu hỏi đã được cấu hình
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {!isEdit && (
        <p style={{ marginTop: 16, color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          * Gợi ý: Sau khi lưu bản nháp ban đầu, bạn có thể thiết lập thêm Bộ câu hỏi sàng lọc ứng viên (Screening Questions) trước khi công khai tin.
        </p>
      )}
    </>
  );
};

export default EmployerJobFormPage;
