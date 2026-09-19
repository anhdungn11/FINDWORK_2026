import type {
  CareerLevel,
  PreferredEmploymentType,
  PreferredWorkplaceType,
} from "@/features/candidate/types/onboarding.types";

export const MAX_DESIRED_POSITIONS = 3;
export const MAX_PREFERRED_CATEGORIES = 3;

export const EMPLOYMENT_TYPE_OPTIONS: Array<{
  value: PreferredEmploymentType;
  label: string;
}> = [
  { value: "full-time", label: "Toàn thời gian" },
  { value: "part-time", label: "Bán thời gian" },
  { value: "internship", label: "Thực tập" },
  { value: "contract", label: "Hợp đồng" },
  { value: "freelance", label: "Freelance" },
  { value: "temporary", label: "Tạm thời" },
];

export const WORKPLACE_TYPE_OPTIONS: Array<{
  value: PreferredWorkplaceType;
  label: string;
}> = [
  { value: "onsite", label: "Tại văn phòng" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

export const CAREER_LEVEL_OPTIONS: Array<{
  value: CareerLevel;
  label: string;
}> = [
  { value: "", label: "Chưa xác định" },
  { value: "intern", label: "Intern" },
  { value: "fresher", label: "Fresher" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Middle" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "manager", label: "Manager" },
];
