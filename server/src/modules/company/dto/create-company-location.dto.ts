import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsISO31661Alpha2, IsString, IsUUID, MaxLength, ValidateIf } from "class-validator";

const optional = (_: unknown, value: unknown) => value !== null && value !== undefined;

/** Headquarters is managed only via the dedicated promotion endpoint. */
export class CreateCompanyLocationDto {
  @ApiPropertyOptional({ nullable: true, example: "VN" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @ValidateIf(optional)
  @IsString()
  @IsISO31661Alpha2()
  countryCode?: string | null;

  @ApiPropertyOptional({ nullable: true, format: "uuid" })
  @ValidateIf(optional)
  @IsUUID("4")
  provinceId?: string | null;

  @ApiPropertyOptional({ nullable: true, format: "uuid" })
  @ValidateIf(optional)
  @IsUUID("4")
  wardId?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 255 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @ValidateIf(optional)
  @IsString()
  @MaxLength(255)
  addressLine?: string | null;
}
