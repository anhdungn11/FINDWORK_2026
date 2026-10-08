import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";
import { EMAIL_VERIFICATION_TOKEN_PATTERN } from "../email-verification.constants";

export class ConfirmEmailVerificationDto {
  @ApiProperty({
    description: "Opaque 32-byte base64url email-verification token.",
  })
  @IsString()
  @Matches(EMAIL_VERIFICATION_TOKEN_PATTERN)
  token!: string;
}
