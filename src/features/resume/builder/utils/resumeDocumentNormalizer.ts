import { DEFAULT_SECTION_ORDER } from "../data/resumeTemplates";
import type {
  ResumeBuilderContent,
  ResumeBuilderSettings,
} from "../../types/resume.types";

export function normalizeSettings(
  s?: Partial<ResumeBuilderSettings> | null,
): ResumeBuilderSettings {
  return {
    accentColor: s?.accentColor || "navy",
    fontFamily: s?.fontFamily || "sans",
    density: s?.density || "balanced",
    showPhoto: Boolean(s?.showPhoto),
    industryPreset: s?.industryPreset || "general",
    sectionOrder:
      Array.isArray(s?.sectionOrder) && s.sectionOrder.length > 0
        ? s.sectionOrder
        : [...DEFAULT_SECTION_ORDER],
    hiddenSections: Array.isArray(s?.hiddenSections) ? s.hiddenSections : [],
  };
}

export function normalizeContent(
  c?: Partial<ResumeBuilderContent> | null,
): ResumeBuilderContent {
  return {
    fullName: c?.fullName || "",
    professionalTitle: c?.professionalTitle || "",
    email: c?.email || "",
    phone: c?.phone || "",
    location: c?.location || "",
    links: Array.isArray(c?.links) ? c.links : [],
    photoDataUrl: c?.photoDataUrl || "",
    summary: c?.summary || "",
    experience: Array.isArray(c?.experience) ? c.experience : [],
    education: Array.isArray(c?.education) ? c.education : [],
    skills: Array.isArray(c?.skills) ? c.skills : [],
    languages: Array.isArray(c?.languages) ? c.languages : [],
    certifications: Array.isArray(c?.certifications) ? c.certifications : [],
    projects: Array.isArray(c?.projects) ? c.projects : [],
    awards: Array.isArray(c?.awards) ? c.awards : [],
    activities: Array.isArray(c?.activities) ? c.activities : [],
    volunteering: Array.isArray(c?.volunteering) ? c.volunteering : [],
    references: Array.isArray(c?.references) ? c.references : [],
    customSections: Array.isArray(c?.customSections) ? c.customSections : [],
  };
}
