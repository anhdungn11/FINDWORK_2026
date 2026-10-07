import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthorizationRepository } from "./authorization.repository";
import { AuthorizationService } from "./authorization.service";
import { PermissionGuard } from "./guards/permission.guard";
import { PermissionResolverService } from "./services/permission-resolver.service";

@Module({
  imports: [PrismaModule],
  providers: [
    AuthorizationRepository,
    AuthorizationService,
    PermissionResolverService,
    PermissionGuard,
  ],
  exports: [
    AuthorizationRepository,
    AuthorizationService,
    PermissionResolverService,
    PermissionGuard,
  ],
})
export class AuthorizationModule {}
