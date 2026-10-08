import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

/** Client-supplied slug: no automatic generation until policy is approved. */
export class CreateCompanyDto {
  @ApiProperty({ example: "Acme Vietnam", minLength: 2, maxLength: 255 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: "acme-vietnam", minLength: 3, maxLength: 220 })
  @IsString()
  @MinLength(3)
  @MaxLength(220)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug must be lowercase letters, digits and single hyphens",
  })
  slug!: string;
}
