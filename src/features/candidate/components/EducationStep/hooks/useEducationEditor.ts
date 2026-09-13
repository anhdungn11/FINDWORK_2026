import { useState } from "react";

import type { EducationItem } from "@/features/candidate/types/onboarding.types";
import { createEducationItem } from "../utils/education.utils";

const useEducationEditor = (
  value: EducationItem[],
  onChange: (value: EducationItem[]) => void,
) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const addEducation = () => {
    const newEducation = createEducationItem();

    onChange([...value, newEducation]);
    setEditingId(newEducation.id);
  };

  const updateEducation = <Key extends keyof EducationItem>(
    id: string,
    key: Key,
    fieldValue: EducationItem[Key],
  ) => {
    onChange(
      value.map((education) =>
        education.id === id
          ? {
              ...education,
              [key]: fieldValue,
            }
          : education,
      ),
    );
  };

  const removeEducation = (id: string) => {
    onChange(value.filter((education) => education.id !== id));

    if (editingId === id) {
      setEditingId(null);
    }
  };

  const handleStudyingChange = (
    education: EducationItem,
    checked: boolean,
  ) => {
    onChange(
      value.map((item) => {
        if (item.id !== education.id) {
          return item;
        }

        return {
          ...item,
          isStudying: checked,
          endMonth: checked ? "" : item.endMonth,
          endYear: checked ? "" : item.endYear,
        };
      }),
    );
  };

  const editEducation = (id: string) => {
    setEditingId(id);
  };

  const completeEducation = () => {
    setEditingId(null);
  };

  return {
    editingId,
    addEducation,
    updateEducation,
    removeEducation,
    handleStudyingChange,
    editEducation,
    completeEducation,
  };
};

export type EducationEditorController = ReturnType<typeof useEducationEditor>;

export default useEducationEditor;
