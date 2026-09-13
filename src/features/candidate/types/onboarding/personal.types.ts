export type Gender = "" | "male" | "female" | "other";
export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender;
  countryCode: string;
  provinceCode: string;
  wardCode: string;
  addressLine: string;
  bio: string;
  avatarUrl: string;
}
