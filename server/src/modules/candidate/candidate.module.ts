import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { CandidateController } from "./candidate.controller";
import { CandidateRepository } from "./candidate.repository";
import { CandidateService } from "./candidate.service";
import { CandidateOnboardingDraftService } from "./candidate-onboarding-draft.service";

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [CandidateController],
  providers: [CandidateRepository, CandidateService, CandidateOnboardingDraftService],
  exports: [CandidateService],
})
export class CandidateModule {}
