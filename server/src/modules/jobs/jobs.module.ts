import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { CompanyJobsController, PublicJobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";

@Module({
  imports: [AuthModule, AuthorizationModule, PrismaModule],
  controllers: [CompanyJobsController, PublicJobsController],
  providers: [JobsService],
})
export class JobsModule {}
