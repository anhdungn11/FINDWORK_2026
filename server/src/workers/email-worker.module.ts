import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "../config/env.validation";
import { PrismaModule } from "../infrastructure/prisma/prisma.module";
import { EmailDeliveryModule } from "../infrastructure/email/email-delivery.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    PrismaModule, EmailDeliveryModule,
  ],
})
export class EmailWorkerModule {}
