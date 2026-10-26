import { IsEmail, IsString, Length, Matches, MaxLength } from "class-validator";

export class RequestPasswordResetDto {
  @IsEmail() @MaxLength(320)
  email!: string;
}

export class ConfirmPasswordResetDto {
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  token!: string;

  @IsString() @Length(12, 128)
  password!: string;
}
