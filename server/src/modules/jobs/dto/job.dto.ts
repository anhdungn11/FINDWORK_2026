import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsDateString, IsIn, IsInt, IsObject, IsString, IsUUID, Matches,
  Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested,
} from "class-validator";

export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT", "FREELANCE", "TEMPORARY", "VOLUNTEER"] as const;
export const WORKPLACE_TYPES = ["ONSITE", "HYBRID", "REMOTE"] as const;
export const SALARY_PERIODS = ["HOUR", "DAY", "WEEK", "MONTH", "YEAR"] as const;
export const JOB_STATUSES = ["DRAFT", "PUBLISHED", "PAUSED", "CLOSED", "EXPIRED", "ARCHIVED"] as const;
export const PUBLIC_JOB_SORTS = ["newest", "salary_asc", "salary_desc"] as const;

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;
// Browser job forms send integer salaries as JSON numbers. Convert only values that
// JavaScript can represent exactly; decimal strings retain their original precision.
const salary = ({ value }: { value: unknown }) =>
  typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
const present = (_: unknown, value: unknown) => value !== undefined;
const nonNull = (_: unknown, value: unknown) => value !== undefined && value !== null;

export class JobLocationDto {
  @Matches(/^\d{2}$/) provinceCode!: string;
  @ApiPropertyOptional() @ValidateIf(present) @Matches(/^\d{5}$/) wardCode?: string;
  @ApiPropertyOptional() @Transform(trim) @ValidateIf(present) @IsString() @MinLength(1) @MaxLength(255)
  addressLine?: string;
}

export class CreateJobDto {
  @IsUUID("4") categoryId!: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(220) title!: string;
  @Transform(trim) @IsString() @MinLength(20) @MaxLength(20_000) description!: string;
  @IsIn(EMPLOYMENT_TYPES) employmentType!: (typeof EMPLOYMENT_TYPES)[number];
  @IsIn(WORKPLACE_TYPES) workplaceType!: (typeof WORKPLACE_TYPES)[number];

  @ApiPropertyOptional() @ValidateIf(present) @IsInt() @Min(0) @Max(720)
  experienceMinMonths?: number;
  @ApiPropertyOptional() @ValidateIf(present) @IsInt() @Min(0) @Max(720)
  experienceMaxMonths?: number;

  // Strings preserve PostgreSQL decimal precision through JSON and Prisma.
  @ApiPropertyOptional({ nullable: true, type: String }) @Transform(salary) @ValidateIf(nonNull)
  @Matches(/^\d{1,17}(?:\.\d{1,2})?$/) salaryMin?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) @Transform(salary) @ValidateIf(nonNull)
  @Matches(/^\d{1,17}(?:\.\d{1,2})?$/) salaryMax?: string | null;

  @ApiPropertyOptional() @ValidateIf(present) @Matches(/^[A-Z]{3}$/) currency?: string;
  @ApiPropertyOptional({ enum: SALARY_PERIODS }) @ValidateIf(present) @IsIn(SALARY_PERIODS)
  salaryPeriod?: (typeof SALARY_PERIODS)[number];
  @ApiPropertyOptional() @ValidateIf(present) @IsIn([true, false]) salaryNegotiable?: boolean;
  @ApiPropertyOptional() @ValidateIf(present) @IsIn([true, false]) showSalary?: boolean;
  @ApiPropertyOptional({ nullable: true }) @ValidateIf(nonNull) @IsDateString()
  applicationDeadline?: string | null;

  @ApiPropertyOptional({ type: () => JobLocationDto }) @ValidateIf(present) @IsObject() @ValidateNested()
  @Type(() => JobLocationDto) location?: JobLocationDto;
}

export class UpdateJobDto extends PartialType(CreateJobDto) {
  @IsInt() @Min(1) version!: number;
}

export class JobVersionDto {
  @IsInt() @Min(1) version!: number;
}

export class JobPageQueryDto {
  @ApiPropertyOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000) page = 1;
  @ApiPropertyOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class CompanyJobQueryDto extends JobPageQueryDto {
  @ApiPropertyOptional({ enum: JOB_STATUSES }) @ValidateIf(present) @IsIn(JOB_STATUSES)
  status?: (typeof JOB_STATUSES)[number];
}

export class PublicJobQueryDto extends JobPageQueryDto {
  @ApiPropertyOptional() @Transform(trim) @ValidateIf(present) @IsString() @MinLength(1) @MaxLength(100)
  q?: string;
  @ApiPropertyOptional({ format: "uuid" }) @ValidateIf(present) @IsUUID("4")
  companyId?: string;
  @ApiPropertyOptional() @ValidateIf(present) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  categoryCode?: string;
  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES }) @ValidateIf(present) @IsIn(EMPLOYMENT_TYPES)
  employmentType?: (typeof EMPLOYMENT_TYPES)[number];
  @ApiPropertyOptional({ enum: WORKPLACE_TYPES }) @ValidateIf(present) @IsIn(WORKPLACE_TYPES)
  workplaceType?: (typeof WORKPLACE_TYPES)[number];
  @ApiPropertyOptional() @ValidateIf(present) @Matches(/^\d{2}$/) provinceCode?: string;
  @ApiPropertyOptional() @ValidateIf(present) @Matches(/^\d{1,17}(?:\.\d{1,2})?$/) salaryAtLeast?: string;
  @ApiPropertyOptional() @ValidateIf(present) @Matches(/^\d{1,17}(?:\.\d{1,2})?$/) salaryAtMost?: string;
  @ApiPropertyOptional({ enum: SALARY_PERIODS }) @ValidateIf(present) @IsIn(SALARY_PERIODS)
  salaryPeriod?: (typeof SALARY_PERIODS)[number];
  @ApiPropertyOptional() @ValidateIf(present) @Matches(/^[A-Z]{3}$/) currency?: string;
  @ApiPropertyOptional({ enum: PUBLIC_JOB_SORTS }) @ValidateIf(present) @IsIn(PUBLIC_JOB_SORTS)
  sort?: (typeof PUBLIC_JOB_SORTS)[number];
}
