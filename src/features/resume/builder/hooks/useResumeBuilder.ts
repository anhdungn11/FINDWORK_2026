import { useMemo, useState } from "react";

import { DEFAULT_SECTION_ORDER } from "@/features/resume/builder/data/resumeTemplates";
import type {
  ResumeBuilderActivityItem,
  ResumeBuilderAwardItem,
  ResumeBuilderCertificationItem,
  ResumeBuilderContent,
  ResumeBuilderCustomItem,
  ResumeBuilderCustomSection,
  ResumeBuilderEducationItem,
  ResumeBuilderEditorSection,
  ResumeBuilderExperienceItem,
  ResumeBuilderLanguageItem,
  ResumeBuilderLinkItem,
  ResumeBuilderProjectItem,
  ResumeBuilderReferenceItem,
  ResumeBuilderSettings,
  ResumeBuilderSkillGroup,
  ResumeBuilderVolunteerItem,
  ResumeIndustryPreset,
  ResumeSectionId,
  ResumeTemplateCode,
} from "@/features/resume/types/resume.types";

const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const INITIAL_CONTENT: ResumeBuilderContent = {
  fullName: "",
  professionalTitle: "",
  email: "",
  phone: "",
  location: "",
  links: [],
  photoDataUrl: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
  projects: [],
  awards: [],
  activities: [],
  volunteering: [],
  references: [],
  customSections: [],
};

const INITIAL_SETTINGS: ResumeBuilderSettings = {
  accentColor: "navy",
  fontFamily: "sans",
  density: "balanced",
  showPhoto: false,
  industryPreset: "general",
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  hiddenSections: ["awards", "activities", "volunteering", "references", "custom"],
};

const PRESET_ORDERS: Record<ResumeIndustryPreset, ResumeSectionId[]> = {
  general: ["summary", "experience", "education", "skills", "languages", "certifications", "projects", "awards", "activities", "volunteering", "references", "custom"],
  business: ["summary", "experience", "skills", "education", "certifications", "languages", "projects", "awards", "activities", "volunteering", "references", "custom"],
  finance: ["summary", "experience", "certifications", "skills", "education", "languages", "awards", "projects", "activities", "volunteering", "references", "custom"],
  people: ["summary", "experience", "skills", "education", "certifications", "languages", "activities", "awards", "projects", "volunteering", "references", "custom"],
  marketing: ["summary", "experience", "projects", "skills", "education", "certifications", "languages", "awards", "activities", "volunteering", "references", "custom"],
  technical: ["summary", "experience", "skills", "projects", "education", "certifications", "languages", "awards", "activities", "volunteering", "references", "custom"],
  operations: ["summary", "experience", "skills", "certifications", "education", "projects", "languages", "awards", "activities", "volunteering", "references", "custom"],
  education: ["summary", "experience", "education", "certifications", "skills", "languages", "activities", "awards", "projects", "volunteering", "references", "custom"],
  healthcare: ["summary", "experience", "certifications", "education", "skills", "languages", "projects", "awards", "activities", "volunteering", "references", "custom"],
  service: ["summary", "experience", "skills", "languages", "education", "certifications", "awards", "activities", "projects", "volunteering", "references", "custom"],
  creative: ["summary", "projects", "experience", "skills", "education", "awards", "certifications", "languages", "activities", "volunteering", "references", "custom"],
  legal: ["summary", "experience", "education", "certifications", "skills", "languages", "awards", "projects", "activities", "volunteering", "references", "custom"],
  other: [...DEFAULT_SECTION_ORDER],
};

export interface ResumeBuilderInitialState {
  resumeName: string;
  templateCode: ResumeTemplateCode;
  content: ResumeBuilderContent;
  settings: ResumeBuilderSettings;
}

export const useResumeBuilder = (initialState?: ResumeBuilderInitialState) => {
  const [resumeName, setResumeName] = useState(
    () => initialState?.resumeName ?? "CV mới",
  );
  const [templateCode, setTemplateCode] = useState<ResumeTemplateCode>(
    () => initialState?.templateCode ?? "classic",
  );
  const [activeSection, setActiveSection] = useState<ResumeBuilderEditorSection>("basics");
  const [content, setContent] = useState<ResumeBuilderContent>(
    () => clone(initialState?.content ?? INITIAL_CONTENT),
  );
  const [settings, setSettings] = useState<ResumeBuilderSettings>(
    () => clone(initialState?.settings ?? INITIAL_SETTINGS),
  );

  const updateContent = <K extends keyof ResumeBuilderContent>(
    key: K,
    value: ResumeBuilderContent[K],
  ) => setContent((current) => ({ ...current, [key]: value }));

  const updateSettings = <K extends keyof ResumeBuilderSettings>(
    key: K,
    value: ResumeBuilderSettings[K],
  ) => setSettings((current) => ({ ...current, [key]: value }));

  const addLink = () => {
    const item: ResumeBuilderLinkItem = { id: createId("link"), label: "", url: "" };
    updateContent("links", [...content.links, item]);
  };
  const updateLink = (id: string, patch: Partial<ResumeBuilderLinkItem>) =>
    updateContent("links", content.links.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeLink = (id: string) => updateContent("links", content.links.filter((item) => item.id !== id));

  const addExperience = () => {
    const item: ResumeBuilderExperienceItem = {
      id: createId("exp"), position: "", company: "", location: "", employmentType: "",
      startDate: "", endDate: "", isCurrent: false, highlights: [],
    };
    updateContent("experience", [...content.experience, item]);
  };
  const updateExperience = (id: string, patch: Partial<ResumeBuilderExperienceItem>) =>
    updateContent("experience", content.experience.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeExperience = (id: string) => updateContent("experience", content.experience.filter((item) => item.id !== id));

  const addEducation = () => {
    const item: ResumeBuilderEducationItem = {
      id: createId("edu"), school: "", degree: "", major: "", location: "",
      startYear: "", endYear: "", isStudying: false, gpa: "", highlights: [],
    };
    updateContent("education", [...content.education, item]);
  };
  const updateEducation = (id: string, patch: Partial<ResumeBuilderEducationItem>) =>
    updateContent("education", content.education.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeEducation = (id: string) => updateContent("education", content.education.filter((item) => item.id !== id));

  const addSkillGroup = () => {
    const item: ResumeBuilderSkillGroup = { id: createId("skill-group"), name: "", skills: [] };
    updateContent("skills", [...content.skills, item]);
  };
  const updateSkillGroup = (id: string, patch: Partial<ResumeBuilderSkillGroup>) =>
    updateContent("skills", content.skills.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeSkillGroup = (id: string) => updateContent("skills", content.skills.filter((item) => item.id !== id));

  const addLanguage = () => {
    const item: ResumeBuilderLanguageItem = { id: createId("lang"), name: "", level: "", certificate: "" };
    updateContent("languages", [...content.languages, item]);
  };
  const updateLanguage = (id: string, patch: Partial<ResumeBuilderLanguageItem>) =>
    updateContent("languages", content.languages.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeLanguage = (id: string) => updateContent("languages", content.languages.filter((item) => item.id !== id));

  const addCertification = () => {
    const item: ResumeBuilderCertificationItem = { id: createId("cert"), name: "", issuer: "", issueDate: "", credentialId: "", credentialUrl: "" };
    updateContent("certifications", [...content.certifications, item]);
  };
  const updateCertification = (id: string, patch: Partial<ResumeBuilderCertificationItem>) =>
    updateContent("certifications", content.certifications.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeCertification = (id: string) => updateContent("certifications", content.certifications.filter((item) => item.id !== id));

  const addProject = () => {
    const item: ResumeBuilderProjectItem = {
      id: createId("project"), name: "", role: "", organization: "", link: "",
      startDate: "", endDate: "", tags: [], highlights: [],
    };
    updateContent("projects", [...content.projects, item]);
  };
  const updateProject = (id: string, patch: Partial<ResumeBuilderProjectItem>) =>
    updateContent("projects", content.projects.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeProject = (id: string) => updateContent("projects", content.projects.filter((item) => item.id !== id));

  const addAward = () => {
    const item: ResumeBuilderAwardItem = { id: createId("award"), title: "", issuer: "", date: "", description: "" };
    updateContent("awards", [...content.awards, item]);
  };
  const updateAward = (id: string, patch: Partial<ResumeBuilderAwardItem>) =>
    updateContent("awards", content.awards.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeAward = (id: string) => updateContent("awards", content.awards.filter((item) => item.id !== id));

  const addActivity = () => {
    const item: ResumeBuilderActivityItem = { id: createId("activity"), name: "", role: "", organization: "", startDate: "", endDate: "", description: "" };
    updateContent("activities", [...content.activities, item]);
  };
  const updateActivity = (id: string, patch: Partial<ResumeBuilderActivityItem>) =>
    updateContent("activities", content.activities.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeActivity = (id: string) => updateContent("activities", content.activities.filter((item) => item.id !== id));

  const addVolunteer = () => {
    const item: ResumeBuilderVolunteerItem = { id: createId("volunteer"), role: "", organization: "", location: "", startDate: "", endDate: "", description: "" };
    updateContent("volunteering", [...content.volunteering, item]);
  };
  const updateVolunteer = (id: string, patch: Partial<ResumeBuilderVolunteerItem>) =>
    updateContent("volunteering", content.volunteering.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeVolunteer = (id: string) => updateContent("volunteering", content.volunteering.filter((item) => item.id !== id));

  const addReference = () => {
    const item: ResumeBuilderReferenceItem = { id: createId("reference"), name: "", position: "", organization: "", email: "", phone: "", note: "" };
    updateContent("references", [...content.references, item]);
  };
  const updateReference = (id: string, patch: Partial<ResumeBuilderReferenceItem>) =>
    updateContent("references", content.references.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeReference = (id: string) => updateContent("references", content.references.filter((item) => item.id !== id));

  const addCustomSection = () => {
    const item: ResumeBuilderCustomSection = { id: createId("custom-section"), title: "Mục mới", items: [] };
    updateContent("customSections", [...content.customSections, item]);
    if (settings.hiddenSections.includes("custom")) {
      updateSettings("hiddenSections", settings.hiddenSections.filter((item) => item !== "custom"));
    }
  };
  const updateCustomSection = (id: string, patch: Partial<ResumeBuilderCustomSection>) =>
    updateContent("customSections", content.customSections.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeCustomSection = (id: string) => updateContent("customSections", content.customSections.filter((item) => item.id !== id));
  const addCustomItem = (sectionId: string) => {
    const item: ResumeBuilderCustomItem = { id: createId("custom-item"), title: "", subtitle: "", period: "", description: "" };
    updateContent("customSections", content.customSections.map((section) => section.id === sectionId ? { ...section, items: [...section.items, item] } : section));
  };
  const updateCustomItem = (sectionId: string, itemId: string, patch: Partial<ResumeBuilderCustomItem>) =>
    updateContent("customSections", content.customSections.map((section) => section.id === sectionId ? { ...section, items: section.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) } : section));
  const removeCustomItem = (sectionId: string, itemId: string) =>
    updateContent("customSections", content.customSections.map((section) => section.id === sectionId ? { ...section, items: section.items.filter((item) => item.id !== itemId) } : section));

  const toggleSectionVisibility = (sectionId: ResumeSectionId) => {
    const hidden = settings.hiddenSections.includes(sectionId);
    updateSettings(
      "hiddenSections",
      hidden
        ? settings.hiddenSections.filter((item) => item !== sectionId)
        : [...settings.hiddenSections, sectionId],
    );
  };

  const moveSection = (sectionId: ResumeSectionId, direction: -1 | 1) => {
    const currentIndex = settings.sectionOrder.indexOf(sectionId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= settings.sectionOrder.length) return;
    const next = [...settings.sectionOrder];
    [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
    updateSettings("sectionOrder", next);
  };

  const applyIndustryPreset = (preset: ResumeIndustryPreset) => {
    setSettings((current) => ({
      ...current,
      industryPreset: preset,
      sectionOrder: [...PRESET_ORDERS[preset]],
    }));
  };

  const setPhotoFile = (file: File | null) => {
    if (!file) {
      updateContent("photoDataUrl", "");
      return;
    }
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") updateContent("photoDataUrl", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const sectionCompletion = useMemo<Record<ResumeBuilderEditorSection, boolean>>(
    () => ({
      basics: Boolean(content.fullName.trim() && content.professionalTitle.trim()),
      summary: Boolean(content.summary.trim()),
      experience: content.experience.some((item) => item.position.trim() && item.company.trim()),
      education: content.education.some((item) => item.school.trim()),
      skills: content.skills.some((item) => item.skills.length > 0),
      languages: content.languages.some((item) => item.name.trim()),
      certifications: content.certifications.some((item) => item.name.trim()),
      projects: content.projects.some((item) => item.name.trim()),
      awards: content.awards.some((item) => item.title.trim()),
      activities: content.activities.some((item) => item.name.trim()),
      volunteering: content.volunteering.some((item) => item.organization.trim()),
      references: content.references.some((item) => item.name.trim()),
      custom: content.customSections.some((section) => section.title.trim() && section.items.length > 0),
      design: true,
    }),
    [content],
  );

  const completionPercent = useMemo(() => {
    const important: ResumeBuilderEditorSection[] = ["basics", "summary", "experience", "education", "skills", "design"];
    const completed = important.filter((id) => sectionCompletion[id]).length;
    return Math.round((completed / important.length) * 100);
  }, [sectionCompletion]);

  const isSavable = useMemo(
    () => resumeName.trim().length > 0 && content.fullName.trim().length > 0,
    [content.fullName, resumeName],
  );

  return {
    resumeName,
    templateCode,
    activeSection,
    content,
    settings,
    sectionCompletion,
    completionPercent,
    isSavable,
    setResumeName,
    setTemplateCode,
    setActiveSection,
    updateContent,
    updateSettings,
    applyIndustryPreset,
    addLink,
    updateLink,
    removeLink,
    addExperience,
    updateExperience,
    removeExperience,
    addEducation,
    updateEducation,
    removeEducation,
    addSkillGroup,
    updateSkillGroup,
    removeSkillGroup,
    addLanguage,
    updateLanguage,
    removeLanguage,
    addCertification,
    updateCertification,
    removeCertification,
    addProject,
    updateProject,
    removeProject,
    addAward,
    updateAward,
    removeAward,
    addActivity,
    updateActivity,
    removeActivity,
    addVolunteer,
    updateVolunteer,
    removeVolunteer,
    addReference,
    updateReference,
    removeReference,
    addCustomSection,
    updateCustomSection,
    removeCustomSection,
    addCustomItem,
    updateCustomItem,
    removeCustomItem,
    toggleSectionVisibility,
    moveSection,
    setPhotoFile,
  };
};
