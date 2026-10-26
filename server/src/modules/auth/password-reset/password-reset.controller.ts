import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AuthOriginGuard } from "../guards/auth-origin.guard";
import { ConfirmPasswordResetDto, RequestPasswordResetDto } from "./password-reset.dto";
import { PasswordResetService } from "./password-reset.service";

@ApiTags("Password Reset")
@Controller("auth/password-reset")
export class PasswordResetController {
  constructor(private readonly service: PasswordResetService) {}

  @Post("request") @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @UseGuards(AuthOriginGuard, ThrottlerGuard)
  @ApiOperation({ summary: "Request a reset email; returns the same response for known and unknown accounts" })
  request(@Body() dto: RequestPasswordResetDto): Promise<void> {
    return this.service.request(dto.email);
  }

  @Post("confirm") @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @UseGuards(AuthOriginGuard, ThrottlerGuard)
  @ApiOperation({ summary: "Consume a single-use reset token, change password and revoke all sessions" })
  confirm(@Body() dto: ConfirmPasswordResetDto): Promise<void> {
    return this.service.confirm(dto.token, dto.password);
  }
}
