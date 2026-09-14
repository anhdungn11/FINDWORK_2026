import { useState } from "react";

import type {
  CandidateSkillItem,
} from "@/features/candidate/types/onboarding.types";

import {
  OTHER_SKILL_CODE,
  getSkillName,
} from "@/features/candidate/utils/skill.constants";

import {
  clearSkillSelection,
  removeSkillItem,
  selectSkillIdentity,
  updateSkillItem,
} from "./skill-editor.operations";

import {
  createSkill,
  getHighlightValidationError,
  getSkillValidationError,
} from "./skill-editor.utils";

import useSkillSearchState from "./useSkillSearchState";

const useSkillsEditor = (
  skills: CandidateSkillItem[],
  onSkillsChange:
    (value: CandidateSkillItem[]) => void,
) => {
  const [editingSkillId, setEditingSkillId] =
    useState<string | null>(null);

  const [skillError, setSkillError] =
    useState("");

  const search =
    useSkillSearchState();

  const addSkill = () => {
    const skill = createSkill();

    onSkillsChange([...skills, skill]);

    search.setSearchValue(
      skill.id,
      "",
    );

    setEditingSkillId(skill.id);
    setSkillError("");
  };

  const updateSkill = <
    Key extends keyof CandidateSkillItem,
  >(
    id: string,
    key: Key,
    value: CandidateSkillItem[Key],
  ) => {
    onSkillsChange(
      updateSkillItem(
        skills,
        id,
        key,
        value,
      ),
    );
  };

  const removeSkill = (id: string) => {
    onSkillsChange(
      removeSkillItem(skills, id),
    );

    search.removeSearchValue(id);

    if (editingSkillId === id) {
      setEditingSkillId(null);
    }

    setSkillError("");
  };

  const handleSkillSearchChange = (
    skill: CandidateSkillItem,
    value: string,
  ) => {
    search.setSearchValue(
      skill.id,
      value,
    );

    if (skill.skillCode) {
      onSkillsChange(
        clearSkillSelection(
          skills,
          skill.id,
        ),
      );
    }

    setSkillError("");
  };

  const selectCatalogSkill = (
    skillId: string,
    skillCode: string,
    skillName: string,
  ) => {
    onSkillsChange(
      selectSkillIdentity(
        skills,
        skillId,
        skillCode,
        "",
      ),
    );

    search.setSearchValue(
      skillId,
      skillName,
    );

    setSkillError("");
  };

  const selectCustomSkill = (
    skillId: string,
    customSkillName: string,
  ) => {
    const normalizedName =
      customSkillName.trim();

    if (!normalizedName) {
      setSkillError(
        "Vui lòng nhập tên kỹ năng.",
      );
      return;
    }

    onSkillsChange(
      selectSkillIdentity(
        skills,
        skillId,
        OTHER_SKILL_CODE,
        normalizedName,
      ),
    );

    search.setSearchValue(
      skillId,
      normalizedName,
    );

    setSkillError("");
  };

  const completeSkill = (
    skill: CandidateSkillItem,
  ) => {
    const error =
      getSkillValidationError(
        skills,
        skill,
      );

    if (error) {
      setSkillError(error);
      return;
    }

    search.setSearchValue(
      skill.id,
      getSkillName(
        skill.skillCode,
        skill.customSkillName,
      ),
    );

    setSkillError("");
    setEditingSkillId(null);
  };

  const editSkill = (
    skill: CandidateSkillItem,
  ) => {
    setEditingSkillId(skill.id);

    search.setSearchValue(
      skill.id,
      getSkillName(
        skill.skillCode,
        skill.customSkillName,
      ),
    );

    setSkillError("");
  };

  const toggleHighlighted = (
    skill: CandidateSkillItem,
  ) => {
    const error =
      getHighlightValidationError(
        skills,
        skill,
      );

    if (error) {
      setSkillError(error);
      return;
    }

    setSkillError("");

    updateSkill(
      skill.id,
      "isHighlighted",
      !skill.isHighlighted,
    );
  };

  return {
    editingSkillId,
    skillError,
    addSkill,
    updateSkill,
    removeSkill,
    handleSkillSearchChange,
    selectCatalogSkill,
    selectCustomSkill,
    completeSkill,
    editSkill,
    toggleHighlighted,
    getSkillSearchValue:
      search.getSearchValue,
  };
};

export default useSkillsEditor;
