import type { EducationItem } from "@/features/candidate/types/onboarding.types";

export const MONTHS = Array.from(
  { length: 12 },
  (_, index) => String(index + 1),
);

export const DEGREE_OPTIONS = [
  { value: "high-school", label: "Trung học phổ thông" },
  { value: "vocational", label: "Trung cấp" },
  { value: "college", label: "Cao đẳng" },
  { value: "bachelor", label: "Đại học" },
  { value: "master", label: "Thạc sĩ" },
  { value: "doctorate", label: "Tiến sĩ" },
] as const;

export const createEducationItem = (): EducationItem => ({
  id: crypto.randomUUID(),
  school: "",
  degree: "",
  major: "",
  location: "",
  startMonth: "",
  startYear: "",
  endMonth: "",
  endYear: "",
  isStudying: false,
  gpa: "",
  gpaScale: "",
  achievements: "",
  description: "",
});

export const getDegreeLabel = (degree: string) =>
  DEGREE_OPTIONS.find((option) => option.value === degree)?.label ??
  "Chưa cập nhật trình độ";

export const getEducationDateLabel = (education: EducationItem) => {
  const start = education.startYear
    ? education.startMonth
      ? `${education.startMonth}/${education.startYear}`
      : education.startYear
    : "";

  const end = education.isStudying
    ? "Hiện tại"
    : education.endYear
      ? education.endMonth
        ? `${education.endMonth}/${education.endYear}`
        : education.endYear
      : "";

  if (!start && !end) {
    return "Chưa cập nhật thời gian";
  }

  return `${start || "—"} – ${end || "—"}`;
};
