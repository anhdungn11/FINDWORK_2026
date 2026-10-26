import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { CandidateMessagingController, CompanyMessagingController } from "./messaging.controller";
import { MessagingService } from "./messaging.service";

@Module({ imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [CandidateMessagingController, CompanyMessagingController], providers: [MessagingService] })
export class MessagingModule {}
