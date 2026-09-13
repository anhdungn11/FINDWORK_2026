import type { SkillCatalogItem } from "../skill.types";

export const PROFESSIONAL_SKILLS: SkillCatalogItem[] = [
  {
    code: "teaching",
    name: "Giảng dạy",
    categoryCode: "education",
    aliases: ["Teaching"],
  },
  {
    code: "lesson-planning",
    name: "Lập kế hoạch bài giảng",
    categoryCode: "education",
    aliases: ["Lesson Planning"],
  },
  {
    code: "patient-care",
    name: "Chăm sóc bệnh nhân",
    categoryCode: "healthcare",
    aliases: ["Patient Care"],
  },
  {
    code: "clinical-care",
    name: "Chăm sóc lâm sàng",
    categoryCode: "healthcare",
    aliases: ["Clinical Care"],
  },
  {
    code: "legal-research",
    name: "Nghiên cứu pháp lý",
    categoryCode: "legal",
    aliases: ["Legal Research"],
  },
  {
    code: "contract-review",
    name: "Rà soát hợp đồng",
    categoryCode: "legal",
    aliases: ["Contract Review"],
  },
];
