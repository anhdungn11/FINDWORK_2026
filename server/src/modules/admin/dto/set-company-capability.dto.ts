import { Transform } from "class-transformer";
import { IsBoolean, IsString, MaxLength, MinLength } from "class-validator";

export class SetCompanyCapabilityDto {
  @IsBoolean()
  isGranted!: boolean;

  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}
