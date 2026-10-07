import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import {
  CANDIDATE_CAREER_STATUSES,
  GENDERS,
  type CandidateCareerStatus,
  type CandidateGender,
} from "../types/candidate.types";

export class CreateCandidateProfileDto {
  @ApiProperty({ example: "Nguyen Anh Dung", minLength: 1, maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  fullName!: string;

  @ApiPropertyOptional({ example: "+84901234567", nullable: true, maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @ApiPropertyOptional({ example: "2006-01-15", nullable: true, format: "date" })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ enum: GENDERS, nullable: true })
  @IsOptional()
  @IsIn(GENDERS)
  gender?: CandidateGender | null;

  @ApiPropertyOptional({ example: "VN", nullable: true, minLength: 2, maxLength: 2 })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  countryCode?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  provinceId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  wardId?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatarAssetKey?: string | null;

  @ApiPropertyOptional({ enum: CANDIDATE_CAREER_STATUSES, nullable: true })
  @IsOptional()
  @IsIn(CANDIDATE_CAREER_STATUSES)
  careerStatus?: CandidateCareerStatus | null;
}

export class UpdateCandidateProfileDto extends PartialType(CreateCandidateProfileDto, { skipNullProperties: false }) {}
