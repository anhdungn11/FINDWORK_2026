import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { SKILL_LEVELS, type CandidateSkillLevel } from "../types/candidate.types";

export class CreateCandidateSkillDto {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  skillId?: string | null;

  @ApiPropertyOptional({ maxLength: 160, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  customSkillName?: string | null;

  @ApiProperty({ enum: SKILL_LEVELS })
  @IsIn(SKILL_LEVELS)
  level!: CandidateSkillLevel;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  yearsOfExperience?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isHighlighted?: boolean;
}

export class UpdateCandidateSkillDto extends PartialType(CreateCandidateSkillDto, { skipNullProperties: false }) {}
