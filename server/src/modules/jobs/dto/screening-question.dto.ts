import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from "class-validator";

export const SCREENING_QUESTION_TYPES = ["TEXT", "TEXTAREA", "YES_NO", "SELECT", "MULTI_SELECT"] as const;

export class ScreeningQuestionInputDto {
  @IsIn(SCREENING_QUESTION_TYPES) type!: (typeof SCREENING_QUESTION_TYPES)[number];
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @IsString() @MinLength(3) @MaxLength(500) label!: string;
  @IsBoolean() isRequired!: boolean;
  @IsInt() @Min(0) @Max(19) displayOrder!: number;
  @ApiPropertyOptional({ type: [String] })
  @ValidateIf((_, value) => value !== undefined) @IsArray() @ArrayMaxSize(20)
  @IsString({ each: true }) options?: string[];
}

export class ReplaceScreeningQuestionsDto {
  @IsInt() @Min(1) version!: number;
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => ScreeningQuestionInputDto)
  questions!: ScreeningQuestionInputDto[];
}
