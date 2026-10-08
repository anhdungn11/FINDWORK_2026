import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength } from "class-validator";

/** Role is intentionally NOT accepted. Every invite resolves to VIEWER on accept. */
export class CreateCompanyInvitationDto {
  @ApiProperty({ example: "colleague@example.com", maxLength: 320 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MaxLength(320)
  @IsEmail()
  email!: string;
}
