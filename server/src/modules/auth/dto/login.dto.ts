import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Length, MaxLength } from "class-validator";

export class LoginDto {
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