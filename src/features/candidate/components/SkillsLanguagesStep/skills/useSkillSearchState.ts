import { useState } from "react";

import type {
  CandidateSkillItem,
} from "@/features/candidate/types/onboarding.types";

import {
  getSkillSearchValue as getDefaultSkillSearchValue,
} from "./skill-editor.utils";

const useSkillSearchState = () => {
  const [
    values,
    setValues,
  ] = useState<Record<string, string>>({});

  const setSearchValue = (
    skillId: string,
    value: string,
  ) => {
    setValues((current) => ({
      ...current,
      [skillId]: value,
    }));
  };

  const removeSearchValue = (
    skillId: string,
  ) => {
    setValues((current) => {
      const next = {
        ...current,
      };

      delete next[skillId];

      return next;
    });
  };

  const getSearchValue = (
    skill: CandidateSkillItem,
  ) => {
    return (
      values[skill.id] ??
      getDefaultSkillSearchValue(
        skill,
      )
    );
  };

  return {
    setSearchValue,
    removeSearchValue,
    getSearchValue,
  };
};

export default useSkillSearchState;
