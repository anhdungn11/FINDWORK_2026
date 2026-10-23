import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { EmailDeliveryModule } from "../../infrastructure/email/email-delivery.module";
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
import { CompanyMembersController } from "./company-members.controller";
import { CompanyMembersService } from "./company-members.service";
import { CompanyMediaService } from "./company-media.service";
import { CompanyMediaStorage, LocalCompanyMediaStorage } from "./company-media.storage";
import { AdminCompanyLegalController, CompanyLegalController } from "./company-legal.controller";
import { CompanyLegalService } from "./company-legal.service";
import { CompanyLegalStorage } from "./company-legal.storage";

@Module({
  imports: [AuthModule, AuthorizationModule, PrismaModule, EmailDeliveryModule],
  controllers: [
    CompanyController, CompanyProfileLocationsController, CompanyLegalController, AdminCompanyLegalController,
    CompanyInvitationsController, CompanyInvitationAcceptanceController,
    CompanyMembersController,
  ],
  providers: [
    CompanyRepository, CompanyService,
    CompanyProfileLocationsRepository, CompanyProfileLocationsService,
    CompanyInvitationsRepository, CompanyInvitationsService, CompanyInvitationDeliveryService,
    CompanyMembersService,
    CompanyMediaService,
    CompanyLegalService, CompanyLegalStorage,
    { provide: CompanyMediaStorage, useClass: LocalCompanyMediaStorage },
  ],
})
export class CompanyModule {}
