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
import { EMPLOYMENT_TYPE_LABEL, WORKPLACE_TYPE_LABEL, SALARY_PERIOD_LABEL, type JobDto } from "@/services/api/apiTypes";
import { WritesDisabledNotice } from "./EmployerDashboardPage";

const toLocalInput = (iso: string | null) => (iso ? iso.slice(0, 16) : "");
const fromJob = (j: JobDto): JobFormValues => ({
  categoryId: j.categoryId ?? "", title: j.title, description: j.description ?? "",
  employmentType: j.employmentType ?? "", workplaceType: j.workplaceType ?? "",
  experienceMinMonths: j.experienceMinMonths?.toString() ?? "", experienceMaxMonths: j.experienceMaxMonths?.toString() ?? "",
  salaryMin: j.salaryMin?.toString() ?? "", salaryMax: j.salaryMax?.toString() ?? "",
  salaryPeriod: j.salaryPeriod ?? "MONTH", salaryNegotiable: j.salaryNegotiable, showSalary: j.showSalary,
  applicationDeadline: toLocalInput(j.applicationDeadline),
});

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

  const [values, setValues] = useState<JobFormValues>(EMPTY_JOB_FORM);
  const [errors, setErrors] = useState<JobFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing.data) setValues(fromJob(existing.data));
  }, [existing.data]);

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

  if (isEdit && existing.loading) return <LoadingBlock rows={3} />;
  if (isEdit && existing.error) return <ApiErrorState error={existing.error} onRetry={existing.reload} />;
  if (isEdit && existing.data && existing.data.status !== "DRAFT") {
    return <div className={ui.notice} role="alert">Chỉ tin ở trạng thái “Bản nháp” mới được chỉnh sửa. <Link to="/employer/jobs">Quay lại danh sách</Link></div>;
  }

  return (
    <>
      <PageHeader title={isEdit ? "Chỉnh sửa tin tuyển dụng" : "Đăng tin tuyển dụng mới"} subtitle="Tin mới luôn được lưu ở trạng thái bản nháp; bạn đăng công khai ở bước sau." />
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
            {saving ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Lưu bản nháp"}
          </button>
          <Link to="/employer/jobs" className={ui.btn}>Hủy</Link>
        </div>
      </form>
    </>
  );
};

export default EmployerJobFormPage;
