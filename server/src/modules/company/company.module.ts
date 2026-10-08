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
import { CompanyInvitationsController, CompanyInvitationAcceptanceController } from "./company-invitations.controller";
import { CompanyInvitationsService } from "./company-invitations.service";
import { CompanyInvitationsRepository } from "./company-invitations.repository";
import { CompanyInvitationDeliveryService } from "./company-invitation-delivery.service";

@Module({
  imports: [AuthModule, AuthorizationModule, PrismaModule],
  controllers: [
    CompanyController, CompanyProfileLocationsController,
    CompanyInvitationsController, CompanyInvitationAcceptanceController,
  ],
  providers: [
    CompanyRepository, CompanyService,
    CompanyProfileLocationsRepository, CompanyProfileLocationsService,
    CompanyInvitationsRepository, CompanyInvitationsService, CompanyInvitationDeliveryService,
  ],
})
export class CompanyModule {}
