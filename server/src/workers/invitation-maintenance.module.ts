import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "../config/env.validation";
import { PrismaModule } from "../infrastructure/prisma/prisma.module";
import { EmailOutboxRepository } from "../infrastructure/email/email-outbox.repository";
import { CompanyInvitationsRepository } from "../modules/company/company-invitations.repository";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    PrismaModule,
  ],
  providers: [EmailOutboxRepository, CompanyInvitationsRepository],
})
export class InvitationMaintenanceModule {}
