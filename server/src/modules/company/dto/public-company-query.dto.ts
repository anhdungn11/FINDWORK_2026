import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";

const present = (_: unknown, value: unknown) => value !== undefined;
const trim = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value;

export class PublicCompanyQueryDto {
  @ApiPropertyOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000)
  page = 1;

  @ApiPropertyOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 20;

  @ApiPropertyOptional() @Transform(trim) @ValidateIf(present) @IsString() @MinLength(1) @MaxLength(100)
  q?: string;

  @ApiPropertyOptional() @ValidateIf(present) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  industryCode?: string;

  @ApiPropertyOptional({ format: "uuid" }) @ValidateIf(present) @IsUUID("4")
  provinceId?: string;

  @ApiPropertyOptional({ type: Boolean })
  @Transform(({ value }: { value: unknown }) => value === "true" ? true : value === "false" ? false : value)
  @ValidateIf(present) @IsBoolean()
  verifiedOnly?: boolean;
}
