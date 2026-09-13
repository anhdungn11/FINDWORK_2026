export type EmploymentType = "" | "full-time" | "part-time" | "internship" | "contract" | "freelance" | "temporary" | "volunteer";
export type WorkplaceType = "" | "onsite" | "hybrid" | "remote";
export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  location: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  isCurrent: boolean;
  description: string;
  achievements: string;
  skillsUsed: string[];
}
