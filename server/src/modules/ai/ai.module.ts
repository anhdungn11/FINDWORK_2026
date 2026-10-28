import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { CompanyAiController } from "./company-ai.controller";
import { CompanyAiService } from "./company-ai.service";
import { AiAccessGuard } from "./ai-access.guard";
import { AiController } from "./ai.controller";
import { AiProviderService } from "./ai-provider.service";
import { AiService } from "./ai.service";

@Module({ imports: [PrismaModule, AuthModule, AuthorizationModule], controllers: [AiController, CompanyAiController],
  providers: [AiAccessGuard, AiProviderService, AiService, CompanyAiService] })
export class AiModule {}
