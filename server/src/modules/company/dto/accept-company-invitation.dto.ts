import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class AcceptCompanyInvitationDto {
  @ApiProperty({ description: "Secret from invitation delivery. Never persisted in plaintext." })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  token!: string;
}
