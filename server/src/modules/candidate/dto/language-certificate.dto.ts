import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsDateString,
  IsObject,
  IsOptional,
  Matches,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from "class-validator";
import type { CandidateJsonValue } from "../types/candidate.types";

export class CreateCandidateLanguageCertificateDto {
  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  certificateTypeId?: string | null;

  @ApiPropertyOptional({ maxLength: 180, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  customCertificateName?: string | null;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  level?: string | null;

  @ApiPropertyOptional({ maxLength: 80, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  overallScore?: string | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  @IsOptional()
  @IsObject()
  scores?: { [key: string]: CandidateJsonValue } | null;

  @ApiPropertyOptional({ format: "date", nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  issuedDate?: string | null;

  @ApiPropertyOptional({ format: "date", nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  expiryDate?: string | null;

  @ApiPropertyOptional({ maxLength: 180, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  issuer?: string | null;

  @ApiPropertyOptional({ maxLength: 180, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  credentialId?: string | null;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  verificationUrl?: string | null;
}

export class UpdateCandidateLanguageCertificateDto extends PartialType(
  CreateCandidateLanguageCertificateDto,
  { skipNullProperties: false },
) {}
