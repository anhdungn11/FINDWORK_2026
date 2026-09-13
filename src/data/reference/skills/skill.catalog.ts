import type { SkillCatalogItem } from "./skill.types";

import { BUSINESS_SKILLS } from "./groups/business.skills";
import { CREATIVE_SKILLS } from "./groups/creative.skills";
import { ENGINEERING_SKILLS } from "./groups/engineering.skills";
import { OPERATIONS_SKILLS } from "./groups/operations.skills";
import { PROFESSIONAL_SKILLS } from "./groups/professional.skills";
import { SOFT_SKILLS } from "./groups/soft-skills";
import { TECHNOLOGY_SKILLS } from "./groups/technology.skills";

export const OTHER_SKILL_CODE = "other";

export const SKILL_CATALOG: SkillCatalogItem[] = [
  ...TECHNOLOGY_SKILLS,
  ...BUSINESS_SKILLS,
  ...CREATIVE_SKILLS,
  ...ENGINEERING_SKILLS,
  ...OPERATIONS_SKILLS,
  ...PROFESSIONAL_SKILLS,
  ...SOFT_SKILLS,
];
