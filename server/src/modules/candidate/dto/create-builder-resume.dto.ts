import { Transform } from "class-transformer";
import { IsInt, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class CreateBuilderResumeDto {
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(180)
  name!: string;

  @IsObject()
  builderContent!: Record<string, unknown>;

  @IsOptional() @IsString() @MaxLength(80)
  templateCode?: string;

  @IsOptional() @IsObject()
  builderSettings?: Record<string, unknown>;
}

export class UpdateBuilderResumeDto extends CreateBuilderResumeDto {
  @IsInt() @Min(1)
  expectedVersionNumber!: number;
}
