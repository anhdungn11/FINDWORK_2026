import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { CareerDiscoveryController } from "./career-discovery.controller";
import { CareerDiscoveryService } from "./career-discovery.service";

@Module({
  imports: [PrismaModule],
  controllers: [CareerDiscoveryController],
  providers: [CareerDiscoveryService],
})
export class CareerDiscoveryModule {}
