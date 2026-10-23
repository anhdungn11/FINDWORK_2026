import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsDefined, IsEmail, IsIn, IsString, Length, MaxLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ enum: ["CANDIDATE", "EMPLOYER"],
    description: "Choose an account type for every new registration." })
  @IsDefined()
  @IsIn(["CANDIDATE", "EMPLOYER"])
  accountType!: "CANDIDATE" | "EMPLOYER";

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

/** Explicit route for clients adopting the versioned registration contract. */
export class TypedRegisterDto extends PickType(RegisterDto, ["email", "password"] as const) {
  @ApiProperty({ enum: ["CANDIDATE", "EMPLOYER"] })
  @IsDefined()
  @IsIn(["CANDIDATE", "EMPLOYER"])
  accountType!: "CANDIDATE" | "EMPLOYER";
}
