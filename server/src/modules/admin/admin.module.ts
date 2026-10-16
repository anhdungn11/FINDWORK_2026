import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({ imports: [AuthModule, AuthorizationModule, PrismaModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
