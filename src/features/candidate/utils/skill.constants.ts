/**
 * Compatibility facade cho skill domain.
 *
 * Giữ nguyên public API cũ để Candidate UI hiện tại không phải đổi import.
 * Reference data và helper dùng chung được đặt ở shared layers của src.
 */

export {
  OTHER_SKILL_CODE,
  SKILL_CATALOG,
} from "@/data/reference/skills/skill.catalog";

export { SKILL_CATEGORIES } from "@/data/reference/skills/skill.categories";

export type {
  SkillCatalogItem,
  SkillCategoryOption,
} from "@/data/reference/skills/skill.types";

export {
  getSkillByCode,
  getSkillCategoryByCode,
  getSkillCategoryName,
  getSkillIdentity,
  getSkillName,
  normalizeSkillSearchText,
  searchSkills,
} from "@/utils/skill.utils";
