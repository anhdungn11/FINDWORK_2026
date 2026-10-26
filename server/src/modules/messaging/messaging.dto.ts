import { Transform, Type } from "class-transformer";
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class SendApplicationMessageDto {
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(4000)
  body!: string;
}

export class MessagingPageDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000)
  page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 20;
}
