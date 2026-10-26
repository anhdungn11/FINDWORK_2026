import {
  MiddlewareConsumer,
  Module,
  RequestMethod,
  type NestModule,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { validateEnvironment } from "./config/env.validation";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AuthorizationModule } from "./modules/authorization/authorization.module";
import { CandidateModule } from "./modules/candidate/candidate.module";
import { CompanyModule } from "./modules/company/company.module";
import { HealthModule } from "./modules/health/health.module";
import { ReferenceModule } from "./modules/reference/reference.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { ApplicationsModule } from "./modules/applications/applications.module";
import { AdminModule } from "./modules/admin/admin.module";
import { CareerDiscoveryModule } from "./modules/career-discovery/career-discovery.module";
import { AiModule } from "./modules/ai/ai.module";
import { InterviewModule } from "./modules/interviews/interview.module";
import { MessagingModule } from "./modules/messaging/messaging.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),

    PrismaModule,
    HealthModule,
    ReferenceModule,
    CareerDiscoveryModule,
    AiModule,
    InterviewModule,
    MessagingModule,
    AuthModule,
    AuthorizationModule,
    CandidateModule,
    CompanyModule,
    JobsModule,
    ApplicationsModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes({
      path: "{*path}",
      method: RequestMethod.ALL,
    });
  }
}
