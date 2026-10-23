import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";
import { AiAccessGuard, type AiRequest } from "./ai-access.guard";
import { AiMessageDto } from "./ai.dto";
import { AiService } from "./ai.service";

@ApiTags("FINDWORK AI")
@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("guest-sessions")
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @UseGuards(ThrottlerGuard)
  guest(@Req() req: Request) { return this.ai.guest(req.socket.remoteAddress ?? "unknown"); }

  @Post("conversations")
  @UseGuards(AiAccessGuard)
  create(@Req() req: AiRequest) { return this.ai.create(req.aiIdentity!); }

  @Get("conversations")
  @UseGuards(AiAccessGuard)
  list(@Req() req: AiRequest) { return this.ai.list(req.aiIdentity!); }

  @Get("conversations/:conversationId/messages")
  @UseGuards(AiAccessGuard)
  messages(@Req() req: AiRequest, @Param("conversationId", ParseUUIDPipe) id: string) {
    return this.ai.messages(req.aiIdentity!, id);
  }

  @Post("conversations/:conversationId/messages")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(AiAccessGuard, ThrottlerGuard)
  @UseInterceptors(FileInterceptor("image", { limits: { fileSize: 2_097_152, files: 1 } }))
  send(@Req() req: AiRequest, @Param("conversationId", ParseUUIDPipe) id: string,
    @Body() dto: AiMessageDto, @UploadedFile() image?: { buffer: Buffer; mimetype: string }) {
    return this.ai.send(req.aiIdentity!, id, dto.content, image);
  }

  @Post("transcriptions")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseGuards(AiAccessGuard, ThrottlerGuard)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2_000_000, files: 1 } }))
  transcribe(@Req() req: AiRequest, @UploadedFile() file?: { buffer: Buffer; mimetype: string }) {
    return this.ai.transcribe(req.aiIdentity!, file);
  }

  @Delete("conversations/:conversationId")
  @HttpCode(200)
  @UseGuards(AiAccessGuard)
  remove(@Req() req: AiRequest, @Param("conversationId", ParseUUIDPipe) id: string) {
    return this.ai.remove(req.aiIdentity!, id);
  }
}
