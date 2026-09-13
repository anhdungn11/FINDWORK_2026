import {
  OTHER_SKILL_CODE,
  SKILL_CATALOG,
} from "@/data/reference/skills/skill.catalog";
import { SKILL_CATEGORIES } from "@/data/reference/skills/skill.categories";

/**
 * Chuẩn hóa chuỗi phục vụ search frontend.
 *
 * Ví dụ:
 * "Phân Tích Dữ Liệu" -> "phan tich du lieu"
 */
export const normalizeSkillSearchText = (
  value: string,
) => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .toLowerCase();
};

export const getSkillByCode = (
  code: string,
) => {
  return SKILL_CATALOG.find(
    (skill) => skill.code === code,
  );
};

export const getSkillCategoryByCode = (
  code: string,
) => {
  return SKILL_CATEGORIES.find(
    (category) => category.code === code,
  );
};

export const getSkillName = (
  skillCode: string,
  customSkillName = "",
) => {
  if (skillCode === OTHER_SKILL_CODE) {
    return (
      customSkillName.trim() ||
      "Kỹ năng khác"
    );
  }

  return (
    getSkillByCode(skillCode)?.name ??
    "Chưa chọn kỹ năng"
  );
};

export const getSkillCategoryName = (
  skillCode: string,
) => {
  const skill = getSkillByCode(skillCode);

  if (!skill) {
    return "";
  }

  return (
    getSkillCategoryByCode(
      skill.categoryCode,
    )?.name ?? ""
  );
};

export const searchSkills = (
  query: string,
  limit = 10,
) => {
  const normalizedQuery =
    normalizeSkillSearchText(query);

  if (!normalizedQuery) {
    return SKILL_CATALOG.slice(0, limit);
  }

  return SKILL_CATALOG.filter(
    (skill) => {
      const name =
        normalizeSkillSearchText(
          skill.name,
        );

      const code =
        normalizeSkillSearchText(
          skill.code,
        );

      const aliases =
        skill.aliases.map(
          normalizeSkillSearchText,
        );

      return (
        name.includes(normalizedQuery) ||
        code.includes(normalizedQuery) ||
        aliases.some((alias) =>
          alias.includes(normalizedQuery),
        )
      );
    },
  ).slice(0, limit);
};

export const getSkillIdentity = (
  skillCode: string,
  customSkillName = "",
) => {
  if (skillCode === OTHER_SKILL_CODE) {
    return `custom:${normalizeSkillSearchText(
      customSkillName,
    )}`;
  }

  return `catalog:${skillCode}`;
};
