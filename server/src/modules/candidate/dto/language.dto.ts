import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import {
  LANGUAGE_PROFICIENCIES,
  type CandidateLanguageProficiency,
} from "../types/candidate.types";

export class CreateCandidateLanguageDto {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  languageId?: string | null;

  @ApiPropertyOptional({ maxLength: 160, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  customLanguageName?: string | null;

  @ApiProperty({ enum: LANGUAGE_PROFICIENCIES })
  @IsIn(LANGUAGE_PROFICIENCIES)
  overallLevel!: CandidateLanguageProficiency;

  @ApiProperty({ enum: LANGUAGE_PROFICIENCIES })
  @IsIn(LANGUAGE_PROFICIENCIES)
  listeningLevel!: CandidateLanguageProficiency;

  @ApiProperty({ enum: LANGUAGE_PROFICIENCIES })
  @IsIn(LANGUAGE_PROFICIENCIES)
  speakingLevel!: CandidateLanguageProficiency;

  @ApiProperty({ enum: LANGUAGE_PROFICIENCIES })
  @IsIn(LANGUAGE_PROFICIENCIES)
  readingLevel!: CandidateLanguageProficiency;

  @ApiProperty({ enum: LANGUAGE_PROFICIENCIES })
  @IsIn(LANGUAGE_PROFICIENCIES)
  writingLevel!: CandidateLanguageProficiency;
}

export class UpdateCandidateLanguageDto extends PartialType(CreateCandidateLanguageDto, { skipNullProperties: false }) {}
