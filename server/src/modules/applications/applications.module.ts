import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { EmailDeliveryModule } from "../../infrastructure/email/email-delivery.module";
import { CandidateApplicationsController, CompanyApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";

@Module({
  imports: [AuthModule, AuthorizationModule, PrismaModule, EmailDeliveryModule],
  controllers: [CandidateApplicationsController, CompanyApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
