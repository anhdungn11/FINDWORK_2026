import { Type } from "class-transformer";
import { IsInt, IsOptional, Matches, Max, Min } from "class-validator";

export class ReferenceQueryDto {
  @IsOptional() @Matches(/^true$/, { message: "Public reference catalogs only support active=true." })
  active: "true" = "true";

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000)
  page = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 100;
}

export class SkillCategoryQueryDto extends ReferenceQueryDto {
  @IsOptional() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  parentCode?: string;
}

export class SkillQueryDto extends ReferenceQueryDto {
  @IsOptional() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  categoryCode?: string;
}

export class CertificateQueryDto extends ReferenceQueryDto {
  @IsOptional() @Matches(/^[a-z]{2,3}$/)
  languageCode?: string;
}

export class WardQueryDto extends ReferenceQueryDto {
  @IsOptional() @Matches(/^\d{2}$/)
  provinceCode?: string;
}
