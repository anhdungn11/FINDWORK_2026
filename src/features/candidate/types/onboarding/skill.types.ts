export type SkillLevel = "" | "beginner" | "intermediate" | "advanced" | "proficient" | "expert";
export interface CandidateSkillItem {
  id: string;
  skillCode: string;
  customSkillName: string;
  level: SkillLevel;
  yearsOfExperience: string;
  isHighlighted: boolean;
}
