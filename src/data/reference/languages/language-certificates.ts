import type { LanguageCertificateType } from "./language.types";

import { ENGLISH_CERTIFICATE_TYPES } from "./certificates/english.certificates";
import { JAPANESE_CERTIFICATE_TYPES } from "./certificates/japanese.certificates";
import { KOREAN_CERTIFICATE_TYPES } from "./certificates/korean.certificates";
import { CHINESE_CERTIFICATE_TYPES } from "./certificates/chinese.certificates";
import { FRENCH_CERTIFICATE_TYPES } from "./certificates/french.certificates";
import { GERMAN_CERTIFICATE_TYPES } from "./certificates/german.certificates";
import { SPANISH_CERTIFICATE_TYPES } from "./certificates/spanish.certificates";
import { ITALIAN_CERTIFICATE_TYPES } from "./certificates/italian.certificates";
import { RUSSIAN_CERTIFICATE_TYPES } from "./certificates/russian.certificates";

export const LANGUAGE_CERTIFICATE_TYPES: LanguageCertificateType[] = [
  ...ENGLISH_CERTIFICATE_TYPES,
  ...JAPANESE_CERTIFICATE_TYPES,
  ...KOREAN_CERTIFICATE_TYPES,
  ...CHINESE_CERTIFICATE_TYPES,
  ...FRENCH_CERTIFICATE_TYPES,
  ...GERMAN_CERTIFICATE_TYPES,
  ...SPANISH_CERTIFICATE_TYPES,
  ...ITALIAN_CERTIFICATE_TYPES,
  ...RUSSIAN_CERTIFICATE_TYPES,
];
