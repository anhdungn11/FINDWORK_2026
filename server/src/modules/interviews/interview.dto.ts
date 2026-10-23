import { Transform } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, ValidateIf } from "class-validator";

const optional = (_: unknown, value: unknown) => value !== undefined && value !== null;

export class ScheduleInterviewDto {
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d\d:\d\d)$/)
  scheduledAt!: string;

  @IsInt() @Min(15) @Max(240)
  durationMinutes!: number;

  @IsIn(["ONSITE", "PHONE", "VIDEO"])
  type!: "ONSITE" | "PHONE" | "VIDEO";

  @IsOptional() @IsIn(["MANUAL", "ZOOM"])
  provider?: "MANUAL" | "ZOOM";

  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @ValidateIf(optional) @IsString() @MaxLength(255)
  location?: string | null;

  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @ValidateIf(optional) @IsUrl({ require_protocol: true, protocols: ["https"] }) @MaxLength(1000)
  meetingUrl?: string | null;
}

export class RescheduleInterviewDto {
  @IsISO8601({ strict: true }) @Matches(/(?:Z|[+-]\d\d:\d\d)$/) scheduledAt!: string;
}
