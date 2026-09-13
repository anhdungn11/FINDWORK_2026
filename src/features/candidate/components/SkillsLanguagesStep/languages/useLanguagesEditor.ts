import { useState } from "react";

import type { CandidateLanguageItem } from "@/features/candidate/types/onboarding.types";

import useCertificatesEditor from "./useCertificatesEditor";

const createLanguage = (): CandidateLanguageItem => ({
  id: crypto.randomUUID(),
  languageCode: "",
  customLanguageName: "",
  overallLevel: "",
  listeningLevel: "",
  speakingLevel: "",
  readingLevel: "",
  writingLevel: "",
  certificates: [],
});

const getLanguageIdentity = (
  language: CandidateLanguageItem,
) => {
  if (language.languageCode === "other") {
    return language.customLanguageName
      .trim()
      .toLowerCase();
  }

  return language.languageCode
    .trim()
    .toLowerCase();
};

const useLanguagesEditor = (
  languages: CandidateLanguageItem[],
  onLanguagesChange: (
    value: CandidateLanguageItem[],
  ) => void,
) => {
  const [
    editingLanguageId,
    setEditingLanguageId,
  ] = useState<string | null>(null);

  const [
    languageError,
    setLanguageError,
  ] = useState("");

  const certificates =
    useCertificatesEditor(
      languages,
      onLanguagesChange,
    );

  const addLanguage = () => {
    const language =
      createLanguage();

    onLanguagesChange([
      ...languages,
      language,
    ]);

    setEditingLanguageId(
      language.id,
    );

    certificates.resetCertificateEditor();

    setLanguageError("");
  };

  const updateLanguage = <
    Key extends keyof CandidateLanguageItem,
  >(
    id: string,
    key: Key,
    value: CandidateLanguageItem[Key],
  ) => {
    onLanguagesChange(
      languages.map((language) =>
        language.id === id
          ? {
              ...language,
              [key]: value,
            }
          : language,
      ),
    );
  };

  const handleLanguageCodeChange = (
    language: CandidateLanguageItem,
    languageCode: string,
  ) => {
    onLanguagesChange(
      languages.map((item) =>
        item.id === language.id
          ? {
              ...item,

              languageCode,

              customLanguageName:
                languageCode === "other"
                  ? item.customLanguageName
                  : "",

              certificates: [],
            }
          : item,
      ),
    );

    certificates.resetCertificateEditor();

    setLanguageError("");
  };

  const removeLanguage = (
    id: string,
  ) => {
    onLanguagesChange(
      languages.filter(
        (language) =>
          language.id !== id,
      ),
    );

    if (
      editingLanguageId === id
    ) {
      setEditingLanguageId(null);
    }

    if (
      certificates.editingCertificate
        ?.languageId === id
    ) {
      certificates.resetCertificateEditor();
    }

    setLanguageError("");
  };

  const languageExists = (
    language: CandidateLanguageItem,
  ) => {
    const identity =
      getLanguageIdentity(
        language,
      );

    if (!identity) {
      return false;
    }

    return languages.some(
      (item) =>
        item.id !== language.id &&
        getLanguageIdentity(
          item,
        ) === identity,
    );
  };

  const completeLanguage = (
    language: CandidateLanguageItem,
  ) => {
    if (!language.languageCode) {
      setLanguageError(
        "Vui lòng chọn ngôn ngữ.",
      );

      return;
    }

    if (
      language.languageCode ===
        "other" &&
      !language.customLanguageName.trim()
    ) {
      setLanguageError(
        "Vui lòng nhập tên ngôn ngữ.",
      );

      return;
    }

    if (!language.overallLevel) {
      setLanguageError(
        "Vui lòng chọn trình độ tổng quát.",
      );

      return;
    }

    if (
      languageExists(language)
    ) {
      setLanguageError(
        "Ngôn ngữ này đã tồn tại trong hồ sơ.",
      );

      return;
    }

    setLanguageError("");

    certificates.resetCertificateEditor();

    setEditingLanguageId(null);
  };

  const editLanguage = (
    languageId: string,
  ) => {
    setEditingLanguageId(
      languageId,
    );

    setLanguageError("");

    certificates.resetCertificateEditor();
  };

  return {
    editingLanguageId,

    languageError,

    addLanguage,

    updateLanguage,

    handleLanguageCodeChange,

    removeLanguage,

    completeLanguage,

    editLanguage,

    ...certificates,
  };
};

export type LanguagesEditor =
  ReturnType<typeof useLanguagesEditor>;

export default useLanguagesEditor;