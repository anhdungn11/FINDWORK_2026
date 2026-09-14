import { useState } from "react";

import type {
  CandidateLanguageItem,
  LanguageCertificateItem,
} from "@/features/candidate/types/onboarding.types";

import {
  addCertificateToLanguage,
  removeCertificateItem,
  replaceCertificateItem,
  updateCertificateItem,
  updateCertificateScoreItem,
} from "./certificate-editor.operations";

import {
  applyCertificateType,
  createCertificate,
  getCertificateValidationError,
} from "./certificate-editor.utils";

export interface EditingCertificate {
  languageId: string;
  certificateId: string;
}

const useCertificatesEditor = (
  languages:
    CandidateLanguageItem[],
  onLanguagesChange:
    (value: CandidateLanguageItem[]) => void,
) => {
  const [
    editingCertificate,
    setEditingCertificate,
  ] =
    useState<EditingCertificate | null>(
      null,
    );

  const [
    certificateError,
    setCertificateError,
  ] = useState("");

  const resetCertificateEditor = () => {
    setEditingCertificate(null);
    setCertificateError("");
  };

  const addCertificate = (
    languageId: string,
  ) => {
    const certificate =
      createCertificate();

    onLanguagesChange(
      addCertificateToLanguage(
        languages,
        languageId,
        certificate,
      ),
    );

    setEditingCertificate({
      languageId,
      certificateId:
        certificate.id,
    });

    setCertificateError("");
  };

  const updateCertificate = <
    Key extends keyof LanguageCertificateItem,
  >(
    languageId: string,
    certificateId: string,
    key: Key,
    value:
      LanguageCertificateItem[Key],
  ) => {
    onLanguagesChange(
      updateCertificateItem(
        languages,
        languageId,
        certificateId,
        key,
        value,
      ),
    );
  };

  const removeCertificate = (
    languageId: string,
    certificateId: string,
  ) => {
    onLanguagesChange(
      removeCertificateItem(
        languages,
        languageId,
        certificateId,
      ),
    );

    if (
      editingCertificate?.languageId ===
        languageId &&
      editingCertificate.certificateId ===
        certificateId
    ) {
      setEditingCertificate(null);
    }

    setCertificateError("");
  };

  const editCertificate = (
    languageId: string,
    certificateId: string,
  ) => {
    setEditingCertificate({
      languageId,
      certificateId,
    });

    setCertificateError("");
  };

  const handleCertificateTypeChange =
    (
      languageId: string,
      certificate:
        LanguageCertificateItem,
      certificateTypeCode: string,
    ) => {
      const nextCertificate =
        applyCertificateType(
          certificate,
          certificateTypeCode,
        );

      onLanguagesChange(
        replaceCertificateItem(
          languages,
          languageId,
          nextCertificate,
        ),
      );

      setCertificateError("");
    };

  const updateCertificateScore = (
    languageId: string,
    certificateId: string,
    componentCode: string,
    value: string,
  ) => {
    onLanguagesChange(
      updateCertificateScoreItem(
        languages,
        languageId,
        certificateId,
        componentCode,
        value,
      ),
    );
  };

  const completeCertificate = (
    certificate:
      LanguageCertificateItem,
  ) => {
    const error =
      getCertificateValidationError(
        certificate,
      );

    if (error) {
      setCertificateError(error);
      return;
    }

    setCertificateError("");
    setEditingCertificate(null);
  };

  const isCertificateEditing = (
    languageId: string,
    certificateId: string,
  ) =>
    editingCertificate?.languageId ===
      languageId &&
    editingCertificate.certificateId ===
      certificateId;

  return {
    editingCertificate,
    certificateError,
    resetCertificateEditor,
    addCertificate,
    updateCertificate,
    removeCertificate,
    editCertificate,
    handleCertificateTypeChange,
    updateCertificateScore,
    completeCertificate,
    isCertificateEditing,
  };
};

export type CertificatesEditor =
  ReturnType<
    typeof useCertificatesEditor
  >;

export default useCertificatesEditor;
