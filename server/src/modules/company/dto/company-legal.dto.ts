import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsIn, IsString, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";

const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;
const present = (_: unknown, value: unknown) => value !== undefined && value !== null;

export class UpdateCompanyLegalDto {
  @ApiProperty({ maxLength: 500 }) @Transform(trim) @IsString() @MinLength(8) @MaxLength(500)
  registeredAddress!: string;

  @ApiProperty({ maxLength: 160 }) @Transform(trim) @IsString() @MinLength(2) @MaxLength(160)
  representativeName!: string;

  @ApiPropertyOptional({ maxLength: 160, nullable: true }) @Transform(trim) @ValidateIf(present) @IsString() @MaxLength(160)
  representativeTitle?: string | null;

  @ApiProperty({ maxLength: 320 }) @Transform(trim) @IsEmail() @MaxLength(320)
  contactEmail!: string;

  @ApiProperty({ maxLength: 32 }) @Transform(trim) @Matches(/^\+?[0-9][0-9 .()-]{6,30}$/)
  contactPhone!: string;
}

export class LegalEvidenceUploadDto {
  @ApiProperty({ enum: ["BUSINESS_REGISTRATION", "TAX_CERTIFICATE", "REPRESENTATIVE_AUTHORIZATION"] })
  @IsIn(["BUSINESS_REGISTRATION", "TAX_CERTIFICATE", "REPRESENTATIVE_AUTHORIZATION"])
  kind!: "BUSINESS_REGISTRATION" | "TAX_CERTIFICATE" | "REPRESENTATIVE_AUTHORIZATION";
}
