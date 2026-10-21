import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";

export class FeaturedCompanyQueryDto {
  @ApiPropertyOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000)
  page = 1;

  @ApiPropertyOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 20;
}
