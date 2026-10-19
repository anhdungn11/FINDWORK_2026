import { IsIn } from "class-validator";

export const ASSIGNABLE_COMPANY_ROLES = ["ADMIN", "HR_MANAGER", "RECRUITER", "HIRING_MANAGER", "VIEWER"] as const;

export class UpdateCompanyMemberDto {
  @IsIn(ASSIGNABLE_COMPANY_ROLES)
  role!: (typeof ASSIGNABLE_COMPANY_ROLES)[number];
}
