import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AiAccessGuard } from "./ai-access.guard";
import { AiController } from "./ai.controller";
import { AiProviderService } from "./ai-provider.service";
import { AiService } from "./ai.service";

@Module({ imports: [PrismaModule, AuthModule], controllers: [AiController],
  providers: [AiAccessGuard, AiProviderService, AiService] })
export class AiModule {}
