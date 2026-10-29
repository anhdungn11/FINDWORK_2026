import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { AdminReportsController, CompanyReportsController } from "./reporting.controller";
import { ReportingService } from "./reporting.service";

@Module({ imports: [AuthModule, AuthorizationModule, PrismaModule],
  controllers: [AdminReportsController, CompanyReportsController], providers: [ReportingService] })
export class ReportingModule {}
