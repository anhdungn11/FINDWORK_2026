import { Transform } from "class-transformer";
import { IsObject, IsString, MaxLength, MinLength } from "class-validator";

export class CreateBuilderResumeDto {
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(180)
  name!: string;

  @IsObject()
  builderContent!: Record<string, unknown>;
}
