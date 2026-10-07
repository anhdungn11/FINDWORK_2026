import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  EMPLOYMENT_TYPES,
  WORKPLACE_TYPES,
  type CandidateEmploymentType,
  type CandidateWorkplaceType,
} from "../types/candidate.types";

export class CandidateExperienceSkillDto {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  skillId?: string | null;

  @ApiPropertyOptional({ maxLength: 160, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  skillName?: string | null;
}

export class CreateCandidateExperienceDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  companyName!: string;

  @ApiProperty({ maxLength: 180 })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  position!: string;

  @ApiProperty({ enum: EMPLOYMENT_TYPES })
  @IsIn(EMPLOYMENT_TYPES)
  employmentType!: CandidateEmploymentType;

  @ApiProperty({ enum: WORKPLACE_TYPES })
  @IsIn(WORKPLACE_TYPES)
  workplaceType!: CandidateWorkplaceType;

  @ApiPropertyOptional({ nullable: true, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @ApiProperty({ minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth!: number;

  @ApiProperty({ minimum: 1, maximum: 9999 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9999)
  startYear!: number;

  @ApiPropertyOptional({ nullable: true, minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 1, maximum: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9999)
  endYear?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  achievements?: string | null;

  @ApiPropertyOptional({ type: [CandidateExperienceSkillDto], maxItems: 30 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CandidateExperienceSkillDto)
  skills?: CandidateExperienceSkillDto[];
}

export class UpdateCandidateExperienceDto extends PartialType(CreateCandidateExperienceDto, { skipNullProperties: false }) {}
