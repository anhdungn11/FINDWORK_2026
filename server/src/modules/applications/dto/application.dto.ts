import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsDefined, IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min, ValidateBy, ValidateIf, ValidateNested } from "class-validator";

export const REVIEW_STATUSES = ["REVIEWING", "SHORTLISTED", "INTERVIEW", "OFFERED", "REJECTED"] as const;
export const APPLICATION_STATUSES = ["SUBMITTED", ...REVIEW_STATUSES, "WITHDRAWN"] as const;

export class SubmitScreeningAnswerDto {
  @IsUUID("4") questionId!: string;
  @IsDefined()
  @ValidateBy({ name: "screeningAnswerShape", validator: {
    validate: (value: unknown) => typeof value === "string" || typeof value === "boolean" ||
      (Array.isArray(value) && value.length <= 20 && value.every((item) => typeof item === "string")),
  } })
  answer!: string | boolean | string[];
}

export class SubmitApplicationDto {
  @IsUUID("4") resumeId!: string;
  @IsUUID("4") resumeVersionId!: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @ValidateIf((_, value) => value !== undefined)
  @IsString() @MaxLength(5000)
  coverLetter?: string;

  @ApiPropertyOptional({ type: [SubmitScreeningAnswerDto] })
  @ValidateIf((_, value) => value !== undefined) @IsArray() @ArrayMaxSize(20)
  @ValidateNested({ each: true }) @Type(() => SubmitScreeningAnswerDto)
  answers?: SubmitScreeningAnswerDto[];
}

export class ApplicationPageQueryDto {
  @ApiPropertyOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000) page = 1;
  @ApiPropertyOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @ApiPropertyOptional({ enum: APPLICATION_STATUSES })
  @ValidateIf((_, value) => value !== undefined) @IsIn(APPLICATION_STATUSES)
  status?: (typeof APPLICATION_STATUSES)[number];
}

export class ReviewApplicationDto {
  @IsInt() @Min(1) version!: number;
  @IsIn(REVIEW_STATUSES) status!: (typeof REVIEW_STATUSES)[number];
}
