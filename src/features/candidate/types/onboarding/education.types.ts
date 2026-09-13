export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  major: string;
  location: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  isStudying: boolean;
  gpa: string;
  gpaScale: "" | "4" | "10" | "100";
  achievements: string;
  description: string;
}
