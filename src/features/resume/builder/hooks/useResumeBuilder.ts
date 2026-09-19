import { useMemo, useState } from "react";

import type {
  ResumeBuilderContent,
  ResumeBuilderEducationItem,
  ResumeBuilderExperienceItem,
  ResumeTemplateCode,
} from "@/features/resume/types/resume.types";

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const INITIAL_CONTENT: ResumeBuilderContent = {
  fullName: "",
  professionalTitle: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  skills: [],
  languages: [],
  experience: [],
  education: [],
};

export const useResumeBuilder = () => {
  const [resumeName, setResumeName] = useState("CV mới");
  const [templateCode, setTemplateCode] = useState<ResumeTemplateCode>("modern");
  const [content, setContent] = useState<ResumeBuilderContent>(INITIAL_CONTENT);

  const updateContent = <K extends keyof ResumeBuilderContent>(
    key: K,
    value: ResumeBuilderContent[K],
  ) => {
    setContent((current) => ({ ...current, [key]: value }));
  };

  const addExperience = () => {
    const item: ResumeBuilderExperienceItem = {
      id: createId("exp"),
      position: "",
      company: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      description: "",
    };

    updateContent("experience", [...content.experience, item]);
  };

  const updateExperience = (
    id: string,
    patch: Partial<ResumeBuilderExperienceItem>,
  ) => {
    updateContent(
      "experience",
      content.experience.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  };

  const removeExperience = (id: string) => {
    updateContent(
      "experience",
      content.experience.filter((item) => item.id !== id),
    );
  };

  const addEducation = () => {
    const item: ResumeBuilderEducationItem = {
      id: createId("edu"),
      school: "",
      degree: "",
      major: "",
      startYear: "",
      endYear: "",
      description: "",
    };

    updateContent("education", [...content.education, item]);
  };

  const updateEducation = (
    id: string,
    patch: Partial<ResumeBuilderEducationItem>,
  ) => {
    updateContent(
      "education",
      content.education.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  };

  const removeEducation = (id: string) => {
    updateContent(
      "education",
      content.education.filter((item) => item.id !== id),
    );
  };

  const isSavable = useMemo(
    () => resumeName.trim().length > 0 && content.fullName.trim().length > 0,
    [content.fullName, resumeName],
  );

  return {
    resumeName,
    templateCode,
    content,
    isSavable,
    setResumeName,
    setTemplateCode,
    updateContent,
    addExperience,
    updateExperience,
    removeExperience,
    addEducation,
    updateEducation,
    removeEducation,
  };
};
