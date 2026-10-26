import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { EmailDeliveryModule } from "../../infrastructure/email/email-delivery.module";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { CandidateInterviewsController, CompanyApplicationInterviewsController, CompanyInterviewsController } from "./interview.controller";
import { InterviewService } from "./interview.service";

@Module({ imports: [PrismaModule, AuthModule, AuthorizationModule, EmailDeliveryModule],
  controllers: [CandidateInterviewsController, CompanyApplicationInterviewsController, CompanyInterviewsController],
  providers: [InterviewService] })
export class InterviewModule {}
