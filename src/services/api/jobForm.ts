import type { EmploymentType, SalaryPeriod, WorkplaceType } from "./apiTypes";

export interface JobFormValues {
  categoryId: string;
  title: string;
  description: string;
  employmentType: EmploymentType | "";
  workplaceType: WorkplaceType | "";
  experienceMinMonths: string;
  experienceMaxMonths: string;
  salaryMin: string;
  salaryMax: string;
  salaryPeriod: SalaryPeriod | "";
  salaryNegotiable: boolean;
  showSalary: boolean;
  applicationDeadline: string;
}

export const EMPTY_JOB_FORM: JobFormValues = {
  categoryId: "", title: "", description: "", employmentType: "", workplaceType: "",
  experienceMinMonths: "", experienceMaxMonths: "", salaryMin: "", salaryMax: "",
  salaryPeriod: "MONTH", salaryNegotiable: false, showSalary: false, applicationDeadline: "",
};

export type JobFormErrors = Partial<Record<keyof JobFormValues, string>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const optionalInt = (v: string): number | null | "invalid" => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : "invalid";
};

/** Kiểm tra theo giới hạn hợp đồng Backend: title 3–220, description 20–20000, khoảng hợp lệ. */
export function validateJobForm(values: JobFormValues, now: Date = new Date()): JobFormErrors {
  const e: JobFormErrors = {};
  const title = values.title.trim();
  if (title.length < 3 || title.length > 220) e.title = "Tiêu đề từ 3 đến 220 ký tự.";
  const desc = values.description.trim();
  if (desc.length < 20 || desc.length > 20000) e.description = "Mô tả từ 20 đến 20.000 ký tự.";
  if (!UUID.test(values.categoryId)) e.categoryId = "Vui lòng chọn ngành nghề.";
  if (!values.employmentType) e.employmentType = "Vui lòng chọn loại hình công việc.";
  if (!values.workplaceType) e.workplaceType = "Vui lòng chọn hình thức làm việc.";

  const expMin = optionalInt(values.experienceMinMonths);
  const expMax = optionalInt(values.experienceMaxMonths);
  if (expMin === "invalid") e.experienceMinMonths = "Nhập số tháng nguyên không âm.";
  if (expMax === "invalid") e.experienceMaxMonths = "Nhập số tháng nguyên không âm.";
  if (typeof expMin === "number" && typeof expMax === "number" && expMin > expMax) {
    e.experienceMaxMonths = "Kinh nghiệm tối đa phải lớn hơn hoặc bằng tối thiểu.";
  }

  const salMin = optionalInt(values.salaryMin);
  const salMax = optionalInt(values.salaryMax);
  if (salMin === "invalid") e.salaryMin = "Nhập số tiền không âm.";
  if (salMax === "invalid") e.salaryMax = "Nhập số tiền không âm.";
  if (typeof salMin === "number" && typeof salMax === "number" && salMin > salMax) {
    e.salaryMax = "Lương tối đa phải lớn hơn hoặc bằng tối thiểu.";
  }
  if (values.showSalary && salMin === null && salMax === null && !values.salaryNegotiable) {
    e.showSalary = "Cần nhập mức lương hoặc đánh dấu thương lượng nếu muốn hiển thị lương.";
  }

  if (values.applicationDeadline) {
    const d = new Date(values.applicationDeadline);
    if (Number.isNaN(d.getTime())) e.applicationDeadline = "Hạn nộp không hợp lệ.";
    else if (d.getTime() <= now.getTime()) e.applicationDeadline = "Hạn nộp phải ở tương lai.";
  }
  return e;
}

/** Chuyển giá trị form thành payload; chỉ gửi trường đã nhập. Không nhận companyId từ client. */
export function formToPayload(values: JobFormValues) {
  const n = (v: string) => (v.trim() === "" ? undefined : Number(v));
  return {
    categoryId: values.categoryId,
    title: values.title.trim(),
    description: values.description.trim(),
    employmentType: values.employmentType as EmploymentType,
    workplaceType: values.workplaceType as WorkplaceType,
    experienceMinMonths: n(values.experienceMinMonths),
    experienceMaxMonths: n(values.experienceMaxMonths),
    salaryMin: n(values.salaryMin),
    salaryMax: n(values.salaryMax),
    currency: "VND",
    salaryPeriod: (values.salaryPeriod || undefined) as SalaryPeriod | undefined,
    salaryNegotiable: values.salaryNegotiable,
    showSalary: values.showSalary,
    applicationDeadline: values.applicationDeadline ? new Date(values.applicationDeadline).toISOString() : undefined,
  };
}
