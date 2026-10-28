import { IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ArrayMaxSize, ArrayMinSize } from "class-validator";

const employmentTypes = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"] as const;
const workplaceTypes = ["ON_SITE", "REMOTE", "HYBRID"] as const;
const levels = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE", "SENIOR", "LEAD", "MANAGER", "DIRECTOR"] as const;

export class DraftJobAiDto {
  @IsString() @MinLength(3) @MaxLength(150) title!: string;
  @IsOptional() @IsString() @MaxLength(120) department?: string;
  @IsOptional() @IsIn(employmentTypes) employmentType?: string;
  @IsOptional() @IsIn(workplaceTypes) workplaceType?: string;
  @IsOptional() @IsIn(levels) experienceLevel?: string;
  @IsOptional() @IsString() @MaxLength(160) location?: string;
  @IsOptional() @IsString() @MaxLength(120) salaryRange?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(80, { each: true }) primarySkills?: string[];
  @IsOptional() @IsString() @MaxLength(1500) responsibilitiesBrief?: string;
  @IsOptional() @IsString() @MaxLength(1500) requirementsBrief?: string;
  @IsOptional() @IsIn(["PROFESSIONAL", "CASUAL", "STARTUP", "EXECUTIVE"]) tone?: string;
}

export class ImproveJobAiDto {
  @IsOptional() @IsUUID() jobId?: string;
  @IsString() @MinLength(3) @MaxLength(150) title!: string;
  @IsString() @MinLength(30) @MaxLength(6000) description!: string;
  @IsOptional() @IsString() @MaxLength(4000) requirements?: string;
  @IsOptional() @IsIn(["CLARITY", "INCLUSIVITY", "ENGAGEMENT", "COMPLIANCE", "ALL"]) focusArea?: string;
}

export class ScreeningQuestionsAiDto {
  @IsString() @MinLength(3) @MaxLength(150) jobTitle!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(80, { each: true }) keySkills!: string[];
  @IsOptional() @IsInt() @Min(0) @Max(40) experienceYears?: number;
  @IsOptional() @IsInt() @Min(1) @Max(8) questionCount?: number;
}

export class InterviewQuestionsAiDto {
  @IsString() @MinLength(3) @MaxLength(150) jobTitle!: string;
  @IsIn(levels) level!: string;
  @IsIn(["HR_SCREENING", "TECHNICAL", "CULTURE_FIT", "HIRING_MANAGER"]) stage!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(80, { each: true }) focusSkills?: string[];
  @IsOptional() @IsString() @MaxLength(500) customContext?: string;
}

export class RecruitmentPlanAiDto {
  @IsString() @MinLength(3) @MaxLength(150) jobTitle!: string;
  @IsInt() @Min(1) @Max(50) targetHires!: number;
  @IsInt() @Min(7) @Max(365) targetTimelineDays!: number;
  @IsOptional() @IsIn(["NORMAL", "HIGH", "CRITICAL"]) urgencyLevel?: string;
  @IsOptional() @IsString() @MaxLength(80) companySize?: string;
}
