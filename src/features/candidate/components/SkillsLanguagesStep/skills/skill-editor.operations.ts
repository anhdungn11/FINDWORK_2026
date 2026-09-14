import type {
  CandidateSkillItem,
} from "@/features/candidate/types/onboarding.types";

export const updateSkillItem = <
  Key extends keyof CandidateSkillItem,
>(
  skills: CandidateSkillItem[],
  id: string,
  key: Key,
  value: CandidateSkillItem[Key],
) => {
  return skills.map((skill) =>
    skill.id === id
      ? {
          ...skill,
          [key]: value,
        }
      : skill,
  );
};

export const removeSkillItem = (
  skills: CandidateSkillItem[],
  id: string,
) => {
  return skills.filter(
    (skill) => skill.id !== id,
  );
};

export const clearSkillSelection = (
  skills: CandidateSkillItem[],
  id: string,
) => {
  return skills.map((skill) =>
    skill.id === id
      ? {
          ...skill,
          skillCode: "",
          customSkillName: "",
        }
      : skill,
  );
};

export const selectSkillIdentity = (
  skills: CandidateSkillItem[],
  id: string,
  skillCode: string,
  customSkillName: string,
) => {
  return skills.map((skill) =>
    skill.id === id
      ? {
          ...skill,
          skillCode,
          customSkillName,
        }
      : skill,
  );
};
