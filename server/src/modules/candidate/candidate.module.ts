import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { CandidateController } from "./candidate.controller";
import { CandidateRepository } from "./candidate.repository";
import { CandidateService } from "./candidate.service";
import { CandidateOnboardingDraftService } from "./candidate-onboarding-draft.service";
import { CandidateOnboardingImportService } from "./candidate-onboarding-import.service";
import { CandidateResumesController } from "./candidate-resumes.controller";
import { CandidateResumesService } from "./candidate-resumes.service";
import { CandidateSavedJobsController } from "./candidate-saved-jobs.controller";
import { CandidateSavedJobsService } from "./candidate-saved-jobs.service";

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [CandidateController, CandidateResumesController, CandidateSavedJobsController],
  providers: [CandidateRepository, CandidateService, CandidateOnboardingDraftService, CandidateOnboardingImportService, CandidateResumesService, CandidateSavedJobsService],
  exports: [CandidateService],
})
export class CandidateModule {}
