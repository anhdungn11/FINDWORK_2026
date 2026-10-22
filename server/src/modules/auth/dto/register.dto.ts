import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsDefined, IsEmail, IsIn, IsString, Length, MaxLength, ValidateIf } from "class-validator";

export class RegisterDto {
  @ApiProperty({ enum: ["CANDIDATE", "EMPLOYER"], required: false,
    description: "Choose an account type. Omission is supported only for legacy registration clients." })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(["CANDIDATE", "EMPLOYER"])
  accountType?: "CANDIDATE" | "EMPLOYER";

  @ApiProperty({
    example: "candidate@example.com",
    maxLength: 320,
  })
  @IsString()
  @MaxLength(320)
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "StrongPassword123!",
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @Length(8, 128)
  password!: string;
}

/** Strict route for new clients; the original route remains compatible. */
export class TypedRegisterDto extends PickType(RegisterDto, ["email", "password"] as const) {
  @ApiProperty({ enum: ["CANDIDATE", "EMPLOYER"] })
  @IsDefined()
  @IsIn(["CANDIDATE", "EMPLOYER"])
  accountType!: "CANDIDATE" | "EMPLOYER";
}
