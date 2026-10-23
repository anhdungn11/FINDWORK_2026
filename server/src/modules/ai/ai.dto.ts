import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class AiMessageDto {
  @IsString() @MinLength(1) @MaxLength(4000)
  content!: string;
}

export class AiConversationQueryDto {
  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional() @IsString()
  cursor?: string;
}
