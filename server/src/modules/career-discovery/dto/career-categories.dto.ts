import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";

const present = (_: unknown, value: unknown) => value !== undefined;

export class CareerCategoriesQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 1_000_000, default: 1 })
  @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ minLength: 1, maxLength: 100, description: "Case-insensitive substring of the category name or code." })
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @ValidateIf(present) @IsString() @MinLength(1) @MaxLength(100)
  q?: string;
}

export class CareerCategoryDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() sortOrder!: number;
  @ApiProperty({ description: "Jobs currently visible through GET /jobs for this category." })
  publishedJobCount!: number;
}

export class CareerCategoryPaginationDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class CareerCategoriesResponseDto {
  @ApiProperty({ type: [CareerCategoryDto] }) data!: CareerCategoryDto[];
  @ApiProperty({ type: CareerCategoryPaginationDto }) pagination!: CareerCategoryPaginationDto;
}
