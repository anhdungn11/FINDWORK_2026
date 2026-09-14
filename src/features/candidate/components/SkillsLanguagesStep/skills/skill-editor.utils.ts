import type {
  CandidateSkillItem,
} from "@/features/candidate/types/onboarding.types";

import {
  OTHER_SKILL_CODE,
  getSkillIdentity,
  getSkillName,
} from "@/features/candidate/utils/skill.constants";

export const createSkill =
  (): CandidateSkillItem => ({
    id: crypto.randomUUID(),
    skillCode: "",
    customSkillName: "",
    level: "",
    yearsOfExperience: "",
    isHighlighted: false,
  });

export const getSkillSearchValue = (
  skill: CandidateSkillItem,
) => {
  if (!skill.skillCode) {
    return "";
  }

  return getSkillName(
    skill.skillCode,
    skill.customSkillName,
  );
};

const isDuplicateSkill = (
  skills: CandidateSkillItem[],
  skill: CandidateSkillItem,
) => {
  if (!skill.skillCode) {
    return false;
  }

  const identity = getSkillIdentity(
    skill.skillCode,
    skill.customSkillName,
  );

  return skills.some(
    (item) =>
      item.id !== skill.id &&
      Boolean(item.skillCode) &&
      getSkillIdentity(
        item.skillCode,
        item.customSkillName,
      ) === identity,
  );
};

export const getSkillValidationError = (
  skills: CandidateSkillItem[],
  skill: CandidateSkillItem,
): string | null => {
  if (!skill.skillCode) {
    return "Vui lòng chọn kỹ năng từ danh sách hoặc sử dụng kỹ năng khác.";
  }

  if (
    skill.skillCode === OTHER_SKILL_CODE &&
    !skill.customSkillName.trim()
  ) {
    return "Vui lòng nhập tên kỹ năng.";
  }

  if (isDuplicateSkill(skills, skill)) {
    return "Kỹ năng này đã tồn tại trong hồ sơ.";
  }

  if (!skill.level) {
    return "Vui lòng chọn mức độ kỹ năng.";
  }

  if (skill.yearsOfExperience) {
    const years = Number(
      skill.yearsOfExperience,
    );

    if (
      Number.isNaN(years) ||
      years < 0 ||
      years > 60
    ) {
      return "Số năm kinh nghiệm không hợp lệ.";
    }
  }

  return null;
};

export const getHighlightValidationError = (
  skills: CandidateSkillItem[],
  skill: CandidateSkillItem,
): string | null => {
  if (skill.isHighlighted) {
    return null;
  }

  const highlightedCount =
    skills.filter(
      (item) =>
        item.isHighlighted &&
        item.id !== skill.id,
    ).length;

  if (highlightedCount >= 5) {
    return "Bạn chỉ có thể chọn tối đa 5 kỹ năng nổi bật.";
  }

  return null;
};
