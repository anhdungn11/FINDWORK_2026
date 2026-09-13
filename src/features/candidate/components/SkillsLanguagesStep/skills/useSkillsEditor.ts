import { useState } from "react";

import type { CandidateSkillItem } from "@/features/candidate/types/onboarding.types";

import {
  OTHER_SKILL_CODE,
  getSkillIdentity,
  getSkillName,
} from "@/features/candidate/utils/skill.constants";

const createSkill = (): CandidateSkillItem => ({
  id: crypto.randomUUID(),

  skillCode: "",
  customSkillName: "",

  level: "",

  yearsOfExperience: "",

  isHighlighted: false,
});

const useSkillsEditor = (
  skills: CandidateSkillItem[],
  onSkillsChange: (value: CandidateSkillItem[]) => void,
) => {
  const [editingSkillId, setEditingSkillId] =
    useState<string | null>(null);

  const [skillError, setSkillError] =
    useState("");

  const [skillSearchValues, setSkillSearchValues] =
    useState<Record<string, string>>({});

  const addSkill = () => {
    const skill = createSkill();

    onSkillsChange([
      ...skills,
      skill,
    ]);

    setSkillSearchValues((current) => ({
      ...current,
      [skill.id]: "",
    }));

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
      skills.map((skill) =>
        skill.id === id
          ? {
              ...skill,
              [key]: value,
            }
          : skill,
      ),
    );
  };

  const removeSkill = (
    id: string,
  ) => {
    onSkillsChange(
      skills.filter(
        (skill) => skill.id !== id,
      ),
    );

    setSkillSearchValues((current) => {
      const next = {
        ...current,
      };

      delete next[id];

      return next;
    });

    if (editingSkillId === id) {
      setEditingSkillId(null);
    }

    setSkillError("");
  };

  const handleSkillSearchChange = (
    skill: CandidateSkillItem,
    value: string,
  ) => {
    setSkillSearchValues((current) => ({
      ...current,
      [skill.id]: value,
    }));

    if (skill.skillCode) {
      onSkillsChange(
        skills.map((item) =>
          item.id === skill.id
            ? {
                ...item,

                skillCode: "",

                customSkillName: "",
              }
            : item,
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
      skills.map((skill) =>
        skill.id === skillId
          ? {
              ...skill,

              skillCode,

              customSkillName: "",
            }
          : skill,
      ),
    );

    setSkillSearchValues((current) => ({
      ...current,

      [skillId]: skillName,
    }));

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
      skills.map((skill) =>
        skill.id === skillId
          ? {
              ...skill,

              skillCode:
                OTHER_SKILL_CODE,

              customSkillName:
                normalizedName,
            }
          : skill,
      ),
    );

    setSkillSearchValues((current) => ({
      ...current,

      [skillId]:
        normalizedName,
    }));

    setSkillError("");
  };

  const skillExists = (
    skill: CandidateSkillItem,
  ) => {
    if (!skill.skillCode) {
      return false;
    }

    const identity =
      getSkillIdentity(
        skill.skillCode,
        skill.customSkillName,
      );

    return skills.some(
      (item) =>
        item.id !==
          skill.id &&
        Boolean(
          item.skillCode,
        ) &&
        getSkillIdentity(
          item.skillCode,
          item.customSkillName,
        ) === identity,
    );
  };

  const completeSkill = (
    skill: CandidateSkillItem,
  ) => {
    if (!skill.skillCode) {
      setSkillError(
        "Vui lòng chọn kỹ năng từ danh sách hoặc sử dụng kỹ năng khác.",
      );

      return;
    }

    if (
      skill.skillCode ===
        OTHER_SKILL_CODE &&
      !skill.customSkillName.trim()
    ) {
      setSkillError(
        "Vui lòng nhập tên kỹ năng.",
      );

      return;
    }

    if (skillExists(skill)) {
      setSkillError(
        "Kỹ năng này đã tồn tại trong hồ sơ.",
      );

      return;
    }

    if (!skill.level) {
      setSkillError(
        "Vui lòng chọn mức độ kỹ năng.",
      );

      return;
    }

    if (
      skill.yearsOfExperience
    ) {
      const years =
        Number(
          skill.yearsOfExperience,
        );

      if (
        Number.isNaN(years) ||
        years < 0 ||
        years > 60
      ) {
        setSkillError(
          "Số năm kinh nghiệm không hợp lệ.",
        );

        return;
      }
    }

    setSkillSearchValues((current) => ({
      ...current,

      [skill.id]:
        getSkillName(
          skill.skillCode,
          skill.customSkillName,
        ),
    }));

    setSkillError("");

    setEditingSkillId(
      null,
    );
  };

  const editSkill = (
    skill: CandidateSkillItem,
  ) => {
    setEditingSkillId(
      skill.id,
    );

    setSkillSearchValues((current) => ({
      ...current,

      [skill.id]:
        getSkillName(
          skill.skillCode,
          skill.customSkillName,
        ),
    }));

    setSkillError("");
  };

  const toggleHighlighted = (
    skill: CandidateSkillItem,
  ) => {
    if (!skill.isHighlighted) {
      const currentCount =
        skills.filter(
          (item) =>
            item.isHighlighted &&
            item.id !==
              skill.id,
        ).length;

      if (
        currentCount >= 5
      ) {
        setSkillError(
          "Bạn chỉ có thể chọn tối đa 5 kỹ năng nổi bật.",
        );

        return;
      }
    }

    setSkillError("");

    updateSkill(
      skill.id,
      "isHighlighted",
      !skill.isHighlighted,
    );
  };

  const getSkillSearchValue = (
    skill: CandidateSkillItem,
  ) =>
    skillSearchValues[
      skill.id
    ] ??
    (skill.skillCode
      ? getSkillName(
          skill.skillCode,
          skill.customSkillName,
        )
      : "");

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

    getSkillSearchValue,
  };
};

export default useSkillsEditor;