import { useState } from "react";

import type {
  ResumeInfo,
} from "@/features/candidate/types/onboarding.types";

import {
  getResumeNameFromFileName,
  revokeResumeObjectUrl,
  validateResumeFile,
} from "../utils/resume.utils";

interface UseResumeStepOptions {
  value: ResumeInfo;
  onChange: (
    value: ResumeInfo,
  ) => void;
}

const getEmptyResume = (
  createLater = false,
): ResumeInfo => ({
  resumeName: "",
  resumeUrl: "",
  fileName: "",
  fileSize: null,
  mimeType: "",
  hasExistingResume: false,
  createLater,
});

export const useResumeStep = ({
  value,
  onChange,
}: UseResumeStepOptions) => {
  const [error, setError] =
    useState("");

  const selectFile = (
    file: File,
  ) => {
    const validationError =
      validateResumeFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    const nextUrl =
      URL.createObjectURL(file);

    revokeResumeObjectUrl(
      value.resumeUrl,
    );

    const currentName =
      value.resumeName.trim();

    onChange({
      ...value,
      resumeName:
        currentName ||
        getResumeNameFromFileName(
          file.name,
        ),
      resumeUrl: nextUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType:
        file.type ||
        "application/pdf",
      hasExistingResume: true,
      createLater: false,
    });

    setError("");
  };

  const updateResumeName = (
    resumeName: string,
  ) => {
    onChange({
      ...value,
      resumeName,
    });
  };

  const commitResumeName = () => {
    if (!value.hasExistingResume) {
      return;
    }

    const normalizedName =
      value.resumeName.trim();

    onChange({
      ...value,
      resumeName:
        normalizedName ||
        getResumeNameFromFileName(
          value.fileName,
        ),
    });
  };

  const removeResume = () => {
    revokeResumeObjectUrl(
      value.resumeUrl,
    );

    // Xóa CV không có nghĩa là người dùng đã chọn
    // "chuẩn bị CV sau". Trở về trạng thái chưa chọn.
    onChange(getEmptyResume(false));
    setError("");
  };

  const toggleCreateLater = () => {
    if (value.createLater) {
      onChange({
        ...value,
        createLater: false,
      });
      setError("");
      return;
    }

    if (value.hasExistingResume) {
      revokeResumeObjectUrl(
        value.resumeUrl,
      );

      // Hai lựa chọn loại trừ nhau:
      // chọn "chuẩn bị sau" thì bỏ CV hiện tại.
      onChange(getEmptyResume(true));
      setError("");
      return;
    }

    onChange({
      ...value,
      createLater: true,
    });

    setError("");
  };

  const previewResume = () => {
    if (!value.resumeUrl) {
      setError(
        "Không thể mở bản xem trước của CV này.",
      );
      return;
    }

    window.open(
      value.resumeUrl,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return {
    error,
    selectFile,
    updateResumeName,
    commitResumeName,
    removeResume,
    toggleCreateLater,
    previewResume,
  };
};
