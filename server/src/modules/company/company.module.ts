import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { CompanyController } from "./company.controller";
import { CompanyRepository } from "./company.repository";
import { CompanyService } from "./company.service";
import { CompanyProfileLocationsController } from "./company-profile-locations.controller";
import { CompanyProfileLocationsRepository } from "./company-profile-locations.repository";
import { CompanyProfileLocationsService } from "./company-profile-locations.service";

@Module({
  imports: [AuthModule, AuthorizationModule, PrismaModule],
  controllers: [CompanyController, CompanyProfileLocationsController],
  providers: [
    CompanyRepository, CompanyService,
    CompanyProfileLocationsRepository, CompanyProfileLocationsService,
  ],
})
export class CompanyModule {}
