import type {
  PersonalInfoStepProps,
  UpdatePersonalInfoField,
} from "../types/personal-info.types";

export const usePersonalInfoEditor = ({
  value,
  onChange,
}: PersonalInfoStepProps) => {
  const updateField: UpdatePersonalInfoField = (
    key,
    fieldValue,
  ) => {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  };

  const updateProvinceCode = (
  provinceCode: string,
) => {
  onChange({
    ...value,
    provinceCode,
    wardCode: "",
  });
};

  const updateAvatarFromFile = (
    file: File | undefined,
  ) => {
    if (!file) {
      return;
    }

    const previewUrl =
      URL.createObjectURL(file);

    updateField(
      "avatarUrl",
      previewUrl,
    );
  };

  const removeAvatar = () => {
    updateField("avatarUrl", "");
  };

  return {
    updateField,
    updateProvinceCode,
    updateAvatarFromFile,
    removeAvatar,
  };
};

export type PersonalInfoEditorController =
  ReturnType<
    typeof usePersonalInfoEditor
  >;