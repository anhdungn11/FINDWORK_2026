import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
} from "class-validator";
import {
  AVAILABILITY_TYPES,
  CAREER_LEVELS,
  EMPLOYMENT_TYPES,
  LOCATION_PREFERENCE_MODES,
  SALARY_EXPECTATION_TYPES,
  SALARY_PERIODS,
  WORKPLACE_TYPES,
  type CandidateAvailabilityType,
  type CandidateCareerLevel,
  type CandidateEmploymentType,
  type CandidateLocationPreferenceMode,
  type CandidateSalaryExpectationType,
  type CandidateSalaryPeriod,
  type CandidateWorkplaceType,
} from "../types/candidate.types";

export class PutCandidateCareerPreferenceDto {
  @ApiProperty({ enum: LOCATION_PREFERENCE_MODES })
  @IsIn(LOCATION_PREFERENCE_MODES)
  locationMode!: CandidateLocationPreferenceMode;

  @ApiProperty({ enum: SALARY_EXPECTATION_TYPES })
  @IsIn(SALARY_EXPECTATION_TYPES)
  salaryType!: CandidateSalaryExpectationType;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salaryMin?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salaryMax?: number | null;

  @ApiPropertyOptional({ default: "VND", minLength: 3, maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ enum: SALARY_PERIODS, default: "MONTH" })
  @IsOptional()
  @IsIn(SALARY_PERIODS)
  salaryPeriod?: CandidateSalaryPeriod;

  @ApiPropertyOptional({ enum: CAREER_LEVELS, nullable: true })
  @IsOptional()
  @IsIn(CAREER_LEVELS)
  desiredCareerLevel?: CandidateCareerLevel | null;

  @ApiPropertyOptional({ enum: AVAILABILITY_TYPES, nullable: true })
  @IsOptional()
  @IsIn(AVAILABILITY_TYPES)
  availabilityType?: CandidateAvailabilityType | null;

  @ApiPropertyOptional({ format: "date", nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  availableFrom?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  willingToRelocate?: boolean;

  @ApiPropertyOptional({ type: [String], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(180, { each: true })
  desiredPositions?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 20, format: "uuid" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID(undefined, { each: true })
  preferredCategoryIds?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 20, format: "uuid" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID(undefined, { each: true })
  preferredProvinceIds?: string[];

  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES, isArray: true, maxItems: 7 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsIn(EMPLOYMENT_TYPES, { each: true })
  preferredEmploymentTypes?: CandidateEmploymentType[];

  @ApiPropertyOptional({ enum: WORKPLACE_TYPES, isArray: true, maxItems: 3 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(WORKPLACE_TYPES, { each: true })
  preferredWorkplaceTypes?: CandidateWorkplaceType[];
}
