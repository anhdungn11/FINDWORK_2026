import type {
  CandidateLanguageItem,
  LanguageCertificateItem,
} from "@/features/candidate/types/onboarding.types";

export const addCertificateToLanguage = (
  languages: CandidateLanguageItem[],
  languageId: string,
  certificate: LanguageCertificateItem,
) => {
  return languages.map((language) =>
    language.id === languageId
      ? {
          ...language,
          certificates: [
            ...language.certificates,
            certificate,
          ],
        }
      : language,
  );
};

export const updateCertificateItem = <
  Key extends keyof LanguageCertificateItem,
>(
  languages: CandidateLanguageItem[],
  languageId: string,
  certificateId: string,
  key: Key,
  value: LanguageCertificateItem[Key],
) => {
  return languages.map((language) =>
    language.id === languageId
      ? {
          ...language,
          certificates:
            language.certificates.map(
              (certificate) =>
                certificate.id ===
                certificateId
                  ? {
                      ...certificate,
                      [key]: value,
                    }
                  : certificate,
            ),
        }
      : language,
  );
};

export const removeCertificateItem = (
  languages: CandidateLanguageItem[],
  languageId: string,
  certificateId: string,
) => {
  return languages.map((language) =>
    language.id === languageId
      ? {
          ...language,
          certificates:
            language.certificates.filter(
              (certificate) =>
                certificate.id !==
                certificateId,
            ),
        }
      : language,
  );
};

export const replaceCertificateItem = (
  languages: CandidateLanguageItem[],
  languageId: string,
  certificate:
    LanguageCertificateItem,
) => {
  return languages.map((language) =>
    language.id === languageId
      ? {
          ...language,
          certificates:
            language.certificates.map(
              (item) =>
                item.id === certificate.id
                  ? certificate
                  : item,
            ),
        }
      : language,
  );
};

export const updateCertificateScoreItem =
  (
    languages:
      CandidateLanguageItem[],
    languageId: string,
    certificateId: string,
    componentCode: string,
    value: string,
  ) => {
    return languages.map((language) =>
      language.id === languageId
        ? {
            ...language,
            certificates:
              language.certificates.map(
                (certificate) =>
                  certificate.id ===
                  certificateId
                    ? {
                        ...certificate,
                        scores:
                          certificate.scores.map(
                            (score) =>
                              score.componentCode ===
                              componentCode
                                ? {
                                    ...score,
                                    value,
                                  }
                                : score,
                          ),
                      }
                    : certificate,
              ),
          }
        : language,
    );
  };
