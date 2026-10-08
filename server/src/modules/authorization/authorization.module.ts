import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthorizationRepository } from "./authorization.repository";
import { AuthorizationService } from "./authorization.service";
import { CompanyPermissionGuard } from "./guards/company-permission.guard";
import { PermissionGuard } from "./guards/permission.guard";
import { PermissionResolverService } from "./services/permission-resolver.service";

@Module({
  imports: [PrismaModule],
  providers: [
    AuthorizationRepository,
    AuthorizationService,
    PermissionResolverService,
    PermissionGuard,
    CompanyPermissionGuard,
  ],
  exports: [
    AuthorizationRepository,
    AuthorizationService,
    PermissionResolverService,
    PermissionGuard,
    CompanyPermissionGuard,
  ],
})
export class AuthorizationModule {}
