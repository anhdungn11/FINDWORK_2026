import type { ExperienceItem } from "@/features/candidate/types/onboarding.types";

export const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1));

export const createExperienceItem = (): ExperienceItem => ({
  id: crypto.randomUUID(),
  company: "",
  position: "",
  employmentType: "",
  workplaceType: "",
  location: "",
  startMonth: "",
  startYear: "",
  endMonth: "",
  endYear: "",
  isCurrent: false,
  description: "",
  achievements: "",
  skillsUsed: [],
});

export const getEmploymentTypeLabel = (
  type: ExperienceItem["employmentType"],
) => {
  const labels: Record<
    Exclude<ExperienceItem["employmentType"], "">,
    string
  > = {
    "full-time": "Toàn thời gian",
    "part-time": "Bán thời gian",
    internship: "Thực tập",
    contract: "Hợp đồng",
    freelance: "Freelance",
    temporary: "Tạm thời",
    volunteer: "Tình nguyện",
  };

  return type ? labels[type] : "Chưa cập nhật loại công việc";
};

export const getWorkplaceLabel = (
  workplace: ExperienceItem["workplaceType"],
) => {
  const labels: Record<
    Exclude<ExperienceItem["workplaceType"], "">,
    string
  > = {
    onsite: "Tại văn phòng",
    hybrid: "Hybrid",
    remote: "Remote",
  };

  return workplace ? labels[workplace] : "";
};

export const getPeriodLabel = (experience: ExperienceItem) => {
  const start = experience.startYear
    ? experience.startMonth
      ? `${experience.startMonth}/${experience.startYear}`
      : experience.startYear
    : "";

  const end = experience.isCurrent
    ? "Hiện tại"
    : experience.endYear
      ? experience.endMonth
        ? `${experience.endMonth}/${experience.endYear}`
        : experience.endYear
      : "";

  if (!start && !end) {
    return "Chưa cập nhật thời gian";
  }

  return `${start || "—"} – ${end || "—"}`;
};

export const canCompleteExperience = (experience: ExperienceItem) =>
  Boolean(
    experience.company.trim() &&
      experience.position.trim() &&
      experience.employmentType &&
      experience.startYear,
  );
