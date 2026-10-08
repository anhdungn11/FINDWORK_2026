import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsInt,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

const trimText = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
const optional = (_: unknown, value: unknown) => value !== null && value !== undefined;

/** Administrative fields, slug and storage asset keys are intentionally excluded. */
export class UpdateCompanyProfileDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 255 })
  @Transform(trimText)
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 220 })
  @Transform(trimText)
  @ValidateIf(optional)
  @IsString()
  @MaxLength(220)
  legalName?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 80 })
  @Transform(trimText)
  @ValidateIf(optional)
  @IsString()
  @MaxLength(80)
  taxCode?: string | null;

  @ApiPropertyOptional({ nullable: true, format: "uuid" })
  @ValidateIf(optional)
  @IsUUID("4")
  industryId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trimText)
  @ValidateIf(optional)
  @IsString()
  @MaxLength(20000)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @Transform(trimText)
  @ValidateIf(optional)
  @IsString()
  @MaxLength(1000)
  @IsUrl({ require_protocol: true, protocols: ["http", "https"] })
  website?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 120 })
  @Transform(trimText)
  @ValidateIf(optional)
  @IsString()
  @MaxLength(120)
  employeeSizeRange?: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  @ValidateIf(optional)
  @IsInt()
  @Min(1800)
  @Max(9999)
  foundedYear?: number | null;
}
