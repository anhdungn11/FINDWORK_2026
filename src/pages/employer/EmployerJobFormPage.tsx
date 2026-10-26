import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Award,
  DollarSign,
  Calendar,
  HelpCircle,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Card, LoadingBlock, PageHeader, ui } from "@/components/ui";
import ApiErrorState from "@/components/ui/ApiErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useCompanyWorkspace } from "@/features/company/CompanyWorkspaceContext";
import { companyWorkspaceApi } from "@/services/api/companyWorkspaceApi";
import { publicApi } from "@/services/api/publicApi";
import { toApiFailure } from "@/services/api/apiFailure";
import { isWorkspaceWritesEnabled } from "@/config/featureFlags";
import { canManageJobs, formatCompanyRole } from "@/features/company/companyWorkspacePermissions";
import {
  EMPTY_JOB_FORM,
  formToPayload,
  validateJobForm,
  type JobFormErrors,
  type JobFormValues,
} from "@/services/api/jobForm";
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

const Field = ({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className={ui.field}>
    <label className={ui.label} htmlFor={id}>
      {label}
    </label>
    {children}
    {hint && !error && (
      <span className={ui.hint} id={`${id}-hint`}>
        {hint}
      </span>
    )}
    {error && (
      <span className={ui.fieldError} id={`${id}-err`} role="alert">
        {error}
      </span>
    )}
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

  const set = <K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const ariaFor = (key: keyof JobFormValues) => ({
    "aria-invalid": Boolean(errors[key]) || undefined,
    "aria-describedby": errors[key] ? `f-${key}-err` : undefined,
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const found = validateJobForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
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
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [key]: val } : q)));
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
        const rawOpts = q.optionsText
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean);
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

      const currentVer = screeningData.data?.version ?? existing.data?.version ?? 1;
      const res = await companyWorkspaceApi.replaceScreeningQuestions(active.id, jobId!, currentVer, payload);
      setQuestionsNotice({
        tone: "ok",
        text: `Đã lưu thành công ${res.questions.length} câu hỏi sàng lọc ứng viên vào tin tuyển dụng.`,
      });
      existing.reload();
      screeningData.reload();
    } catch (err) {
      setQuestionsNotice({ tone: "error", text: toApiFailure(err).message });
    } finally {
      setSavingQuestions(false);
    }
  };

  const canManage = canManageJobs(active.memberRoleNames);
  if (!canManage) {
    return (
      <main style={{ padding: 24, maxWidth: 640, margin: "40px auto" }} data-testid="job-permission-denied">
        <div className={`${ui.state} ${ui.stateError}`} role="alert">
          <h1 className={ui.stateTitle}>Bạn không có quyền đăng hoặc sửa tin tuyển dụng</h1>
          <p className={ui.stateText}>
            Tài khoản của bạn tại doanh nghiệp <strong>{active.name}</strong> hiện có vai trò:{" "}
            <strong>{active.memberRoleNames.map(formatCompanyRole).join(", ") || "Người xem (Viewer)"}</strong>.
            Vai trò này không được phân quyền tạo mới hay chỉnh sửa tin tuyển dụng.
          </p>
          <p className={ui.hint} style={{ margin: "12px 0 20px" }}>
            Vui lòng liên hệ Quản trị viên hoặc Chủ sở hữu của doanh nghiệp để được nâng cấp phân quyền.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className={`${ui.btn} ${ui.btnPrimary}`} to="/employer/jobs">
              Xem danh sách tin tuyển dụng
            </Link>
            <Link className={`${ui.btn}`} to="/employer">
              Về bảng điều khiển
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (isEdit && existing.loading) return <LoadingBlock rows={3} label="Đang tải dữ liệu tin tuyển dụng..." />;
  if (isEdit && existing.error) return <ApiErrorState error={existing.error} onRetry={existing.reload} />;
  if (isEdit && existing.data && existing.data.status !== "DRAFT") {
    return (
      <div className={ui.notice} role="alert">
        Chỉ tin ở trạng thái “Bản nháp” mới có thể chỉnh sửa nội dung.{" "}
        <Link to="/employer/jobs" className={ui.link}>
          Quay lại danh sách tin
        </Link>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Link
          to="/employer/jobs"
          className={ui.link}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.875rem" }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách tin tuyển dụng</span>
        </Link>
      </div>

      <PageHeader
        title={isEdit ? `Chỉnh sửa: “${existing.data?.title || "Tin tuyển dụng"}”` : "Tạo tin tuyển dụng mới"}
        subtitle="Tin mới tạo luôn bắt đầu ở trạng thái Bản nháp (DRAFT). Bạn có thể kiểm tra đầy đủ nội dung trước khi bấm xuất bản."
      />
      <WritesDisabledNotice />

      {submitError && (
        <div className={`${ui.notice} ${ui.noticeWarn}`} role="alert" style={{ marginBottom: 16 }}>
          {submitError}
        </div>
      )}

      <form onSubmit={submit} noValidate style={{ display: "grid", gap: 24 }}>
        {/* SECTION 1: JOB INFORMATION */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Briefcase size={20} color="var(--color-primary, #4f6ef7)" />
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
              1. Thông tin vị trí tuyển dụng (Job Information)
            </h2>
          </div>

          <Field id="f-title" label="Tiêu đề vị trí tuyển dụng *" error={errors.title}>
            <input
              id="f-title"
              className={ui.input}
              placeholder="Ví dụ: Senior Frontend Engineer (React/TypeScript)"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={220}
              {...ariaFor("title")}
            />
          </Field>

          <div className={ui.formGrid} style={{ marginTop: 12 }}>
            <Field
              id="f-categoryId"
              label="Ngành nghề tuyển dụng *"
              error={errors.categoryId}
              hint={categories.error ? "Không tải được danh mục ngành nghề từ máy chủ." : undefined}
            >
              <select
                id="f-categoryId"
                className={ui.select}
                value={values.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                {...ariaFor("categoryId")}
              >
                <option value="">{categories.loading ? "Đang tải danh mục…" : "Chọn ngành nghề phù hợp"}</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="f-employmentType" label="Loại hình công việc *" error={errors.employmentType}>
              <select
                id="f-employmentType"
                className={ui.select}
                value={values.employmentType}
                onChange={(e) => set("employmentType", e.target.value as JobFormValues["employmentType"])}
                {...ariaFor("employmentType")}
              >
                <option value="">Chọn loại hình</option>
                {Object.entries(EMPLOYMENT_TYPE_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="f-workplaceType" label="Hình thức làm việc *" error={errors.workplaceType}>
              <select
                id="f-workplaceType"
                className={ui.select}
                value={values.workplaceType}
                onChange={(e) => set("workplaceType", e.target.value as JobFormValues["workplaceType"])}
                {...ariaFor("workplaceType")}
              >
                <option value="">Chọn hình thức</option>
                {Object.entries(WORKPLACE_TYPE_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ marginTop: 12 }}>
            <Field
              id="f-description"
              label="Mô tả công việc chi tiết *"
              error={errors.description}
              hint="Tối thiểu 20 ký tự. Nêu rõ trách nhiệm công việc, yêu cầu kỹ năng và các đãi ngộ chính."
            >
              <textarea
                id="f-description"
                className={ui.textarea}
                rows={7}
                placeholder="Nêu chi tiết trách nhiệm công việc hàng ngày, môi trường làm việc, công nghệ áp dụng..."
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                {...ariaFor("description")}
              />
            </Field>
          </div>
        </Card>

        {/* SECTION 2: REQUIREMENTS & EXPERIENCE */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Award size={20} color="var(--color-primary, #4f6ef7)" />
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
              2. Yêu cầu & Kinh nghiệm làm việc (Requirements)
            </h2>
          </div>

          <div className={ui.formGrid}>
            <Field
              id="f-experienceMinMonths"
              label="Kinh nghiệm tối thiểu (tháng)"
              error={errors.experienceMinMonths}
              hint="Ví dụ: 12 (tương đương 1 năm), 24 (2 năm)"
            >
              <input
                id="f-experienceMinMonths"
                className={ui.input}
                inputMode="numeric"
                placeholder="12"
                value={values.experienceMinMonths}
                onChange={(e) => set("experienceMinMonths", e.target.value)}
                {...ariaFor("experienceMinMonths")}
              />
            </Field>

            <Field
              id="f-experienceMaxMonths"
              label="Kinh nghiệm tối đa (tháng)"
              error={errors.experienceMaxMonths}
              hint="Để trống nếu không giới hạn kinh nghiệm tối đa"
            >
              <input
                id="f-experienceMaxMonths"
                className={ui.input}
                inputMode="numeric"
                placeholder="36"
                value={values.experienceMaxMonths}
                onChange={(e) => set("experienceMaxMonths", e.target.value)}
                {...ariaFor("experienceMaxMonths")}
              />
            </Field>
          </div>
        </Card>

        {/* SECTION 3: SALARY & EMPLOYMENT TERMS */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <DollarSign size={20} color="var(--color-primary, #4f6ef7)" />
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
              3. Mức lương & Chế độ đãi ngộ (Salary & Terms)
            </h2>
          </div>

          <div className={ui.formGrid}>
            <Field
              id="f-salaryMin"
              label="Mức lương tối thiểu (VND)"
              error={errors.salaryMin}
              hint="Ví dụ: 15000000 cho 15 triệu VND"
            >
              <input
                id="f-salaryMin"
                className={ui.input}
                inputMode="numeric"
                placeholder="15000000"
                value={values.salaryMin}
                onChange={(e) => set("salaryMin", e.target.value)}
                {...ariaFor("salaryMin")}
              />
            </Field>

            <Field
              id="f-salaryMax"
              label="Mức lương tối đa (VND)"
              error={errors.salaryMax}
              hint="Ví dụ: 30000000 cho 30 triệu VND"
            >
              <input
                id="f-salaryMax"
                className={ui.input}
                inputMode="numeric"
                placeholder="30000000"
                value={values.salaryMax}
                onChange={(e) => set("salaryMax", e.target.value)}
                {...ariaFor("salaryMax")}
              />
            </Field>

            <Field id="f-salaryPeriod" label="Kỳ chi trả lương">
              <select
                id="f-salaryPeriod"
                className={ui.select}
                value={values.salaryPeriod}
                onChange={(e) => set("salaryPeriod", e.target.value as JobFormValues["salaryPeriod"])}
              >
                {Object.entries(SALARY_PERIOD_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    Theo {l}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 12 }}>
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: "0.9rem" }}>
              <input
                type="checkbox"
                checked={values.salaryNegotiable}
                onChange={(e) => set("salaryNegotiable", e.target.checked)}
              />
              <span>Lương thương lượng khi phỏng vấn</span>
            </label>

            <label style={{ display: "inline-flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: "0.9rem" }}>
              <input
                type="checkbox"
                checked={values.showSalary}
                onChange={(e) => set("showSalary", e.target.checked)}
              />
              <span>Hiển thị mức lương công khai trên tin đăng</span>
            </label>
          </div>
          {errors.showSalary && <span className={ui.fieldError} role="alert" style={{ marginTop: 4 }}>{errors.showSalary}</span>}
        </Card>

        {/* SECTION 4: PUBLICATION SETTINGS */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Calendar size={20} color="var(--color-primary, #4f6ef7)" />
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
              4. Hạn nộp & Cài đặt công khai (Publication Settings)
            </h2>
          </div>

          <div className={ui.formGrid}>
            <Field
              id="f-applicationDeadline"
              label="Hạn cuối nhận hồ sơ ứng tuyển"
              error={errors.applicationDeadline}
              hint="Để trống nếu không giới hạn thời hạn nhận hồ sơ"
            >
              <input
                id="f-applicationDeadline"
                type="datetime-local"
                className={ui.input}
                value={values.applicationDeadline}
                onChange={(e) => set("applicationDeadline", e.target.value)}
                {...ariaFor("applicationDeadline")}
              />
            </Field>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              background: "var(--color-surface-soft, #f8fafc)",
              fontSize: "0.85rem",
              color: "var(--color-text-secondary, #64748b)",
              lineHeight: 1.6,
            }}
          >
            💡 <strong>Quy trình đăng tin tiêu chuẩn:</strong> Sau khi lưu bản nháp ban đầu, bạn có thể bổ sung Bộ câu hỏi sàng lọc ứng viên ở mục bên dưới trước khi chuyển trạng thái sang <strong>Đang tuyển dụng</strong> để bắt đầu tiếp nhận hồ sơ trên toàn sàn.
          </div>
        </Card>

        {/* SUBMIT BUTTONS */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="submit"
            className={`${ui.btn} ${ui.btnPrimary}`}
            disabled={saving || !writes}
            aria-disabled={!writes}
            title={writes ? undefined : "Cổng ghi dữ liệu đang khóa"}
          >
            {saving ? "Đang lưu tin..." : isEdit ? "Lưu thay đổi nội dung tin" : "Lưu tin tuyển dụng (Bản nháp)"}
          </button>
          <Link to="/employer/jobs" className={ui.btn}>
            Hủy thao tác
          </Link>
        </div>
      </form>

      {/* SECTION 5: SCREENING QUESTIONS MANAGER (Available when editing draft job) */}
      {isEdit && (
        <div style={{ marginTop: 28 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <HelpCircle size={20} color="var(--color-primary, #4f6ef7)" />
                <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>
                  5. Bộ câu hỏi sàng lọc ứng viên (Screening Questions)
                </h2>
              </div>
              <button
                type="button"
                className={`${ui.btn} ${ui.btnPrimary}`}
                style={{ fontSize: "0.85rem", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
                disabled={!writes || questions.length >= 20}
                onClick={handleAddQuestion}
              >
                <Plus size={15} />
                <span>Thêm câu hỏi ({questions.length}/20)</span>
              </button>
            </div>

            <p style={{ margin: "0 0 16px", color: "var(--color-text-secondary, #64748b)", fontSize: "0.875rem" }}>
              Thiết lập các câu hỏi để ứng viên trả lời khi nộp hồ sơ. Giúp chuyên viên tuyển dụng sơ tuyển nhanh chóng theo tiêu chí năng lực, kinh nghiệm hoặc bằng cấp.
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
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 16px",
                  border: "1px dashed var(--color-border, #cbd5e1)",
                  borderRadius: 10,
                  color: "var(--color-text-secondary, #64748b)",
                }}
              >
                <p style={{ margin: "0 0 10px", fontSize: "0.9375rem" }}>
                  Tin tuyển dụng này hiện chưa có câu hỏi sàng lọc nào.
                </p>
                <button
                  type="button"
                  className={ui.btn}
                  disabled={!writes}
                  onClick={handleAddQuestion}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Plus size={15} />
                  <span>Thêm câu hỏi đầu tiên</span>
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
                        borderRadius: 10,
                        background: "var(--color-surface, #ffffff)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--color-text-primary, #1e293b)" }}>
                          Câu hỏi #{idx + 1}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className={ui.btn}
                            style={{ padding: "4px 8px" }}
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, "up")}
                            title="Di chuyển lên trên"
                          >
                            <ChevronUp size={15} />
                          </button>
                          <button
                            type="button"
                            className={ui.btn}
                            style={{ padding: "4px 8px" }}
                            disabled={idx === questions.length - 1}
                            onClick={() => handleMoveQuestion(idx, "down")}
                            title="Di chuyển xuống dưới"
                          >
                            <ChevronDown size={15} />
                          </button>
                          <button
                            type="button"
                            className={`${ui.btn} ${ui.btnDanger}`}
                            style={{ padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
                            onClick={() => handleRemoveQuestion(idx)}
                            title="Xóa câu hỏi này"
                          >
                            <Trash2 size={14} />
                            <span style={{ fontSize: "0.75rem" }}>Xóa</span>
                          </button>
                        </div>
                      </div>

                      <div className={ui.formGrid}>
                        <div className={ui.field}>
                          <label className={ui.label} htmlFor={`sq-type-${idx}`}>
                            Định dạng câu trả lời
                          </label>
                          <select
                            id={`sq-type-${idx}`}
                            className={ui.select}
                            value={q.type}
                            onChange={(e) =>
                              handleQuestionChange(idx, "type", e.target.value as ScreeningQuestionType)
                            }
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
                        <div className={ui.field} style={{ marginTop: 10 }}>
                          <label className={ui.label} htmlFor={`sq-options-${idx}`}>
                            Các lựa chọn câu trả lời (phân tách bởi dấu phẩy) *
                          </label>
                          <input
                            id={`sq-options-${idx}`}
                            type="text"
                            className={ui.input}
                            placeholder="Dưới 1 năm, 1 - 3 năm, Trên 3 năm"
                            value={q.optionsText}
                            onChange={(e) => handleQuestionChange(idx, "optionsText", e.target.value)}
                          />
                          <span className={ui.hint}>Nhập ít nhất 2 phương án trả lời khác nhau, ngăn cách bằng dấu phẩy.</span>
                        </div>
                      )}

                      <div style={{ marginTop: 10 }}>
                        <label
                          style={{
                            display: "inline-flex",
                            gap: 8,
                            alignItems: "center",
                            fontSize: "0.875rem",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={q.isRequired}
                            onChange={(e) => handleQuestionChange(idx, "isRequired", e.target.checked)}
                          />
                          <span>Bắt buộc ứng viên phải trả lời khi nộp hồ sơ</span>
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
                    {savingQuestions ? "Đang lưu bộ câu hỏi..." : "Lưu bộ câu hỏi sàng lọc vào tin"}
                  </button>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary, #64748b)" }}>
                    Đã cấu hình {questions.length} câu hỏi
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
};

export default EmployerJobFormPage;
