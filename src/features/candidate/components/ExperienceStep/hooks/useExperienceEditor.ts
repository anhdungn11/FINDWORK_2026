import { useState } from "react";

import type { ExperienceItem } from "@/features/candidate/types/onboarding.types";
import {
  canCompleteExperience,
  createExperienceItem,
} from "../utils/experience.utils";

const useExperienceEditor = (
  value: ExperienceItem[],
  onChange: (value: ExperienceItem[]) => void,
) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState("");

  const addExperience = () => {
    const newExperience = createExperienceItem();
    onChange([...value, newExperience]);
    setEditingId(newExperience.id);
    setSkillInput("");
  };

  const updateExperience = <Key extends keyof ExperienceItem>(
    id: string,
    key: Key,
    fieldValue: ExperienceItem[Key],
  ) => {
    onChange(
      value.map((experience) =>
        experience.id === id
          ? { ...experience, [key]: fieldValue }
          : experience,
      ),
    );
  };

  const removeExperience = (id: string) => {
    onChange(value.filter((experience) => experience.id !== id));

    if (editingId === id) {
      setEditingId(null);
      setSkillInput("");
    }
  };

  const handleCurrentChange = (
    experience: ExperienceItem,
    checked: boolean,
  ) => {
    onChange(
      value.map((item) =>
        item.id === experience.id
          ? {
              ...item,
              isCurrent: checked,
              endMonth: checked ? "" : item.endMonth,
              endYear: checked ? "" : item.endYear,
            }
          : item,
      ),
    );
  };

  const addSkill = (experience: ExperienceItem) => {
    const skill = skillInput.trim();

    if (!skill) {
      return;
    }

    const alreadyExists = experience.skillsUsed.some(
      (currentSkill) => currentSkill.toLowerCase() === skill.toLowerCase(),
    );

    if (alreadyExists) {
      setSkillInput("");
      return;
    }

    updateExperience(experience.id, "skillsUsed", [
      ...experience.skillsUsed,
      skill,
    ]);
    setSkillInput("");
  };

  const removeSkill = (experience: ExperienceItem, skill: string) => {
    updateExperience(
      experience.id,
      "skillsUsed",
      experience.skillsUsed.filter((currentSkill) => currentSkill !== skill),
    );
  };

  const editExperience = (id: string) => {
    setEditingId(id);
    setSkillInput("");
  };

  const completeExperience = (experience: ExperienceItem) => {
    if (!canCompleteExperience(experience)) {
      return;
    }

    setEditingId(null);
    setSkillInput("");
  };

  return {
    editingId,
    skillInput,
    setSkillInput,
    addExperience,
    updateExperience,
    removeExperience,
    handleCurrentChange,
    addSkill,
    removeSkill,
    editExperience,
    completeExperience,
  };
};

export type ExperienceEditorController = ReturnType<
  typeof useExperienceEditor
>;

export default useExperienceEditor;
