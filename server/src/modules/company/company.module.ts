import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { CompanyController } from "./company.controller";
import { CompanyRepository } from "./company.repository";
import { CompanyService } from "./company.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CompanyController],
  providers: [CompanyRepository, CompanyService],
})
export class CompanyModule {}
