ALTER TYPE "RecruitmentEmailKind" ADD VALUE 'INTERVIEW_RESCHEDULED';
ALTER TYPE "RecruitmentEmailKind" ADD VALUE 'INTERVIEW_CANCELLED';

ALTER TABLE "RecruitmentEmailOutbox"
  DROP CONSTRAINT "RecruitmentEmailOutbox_interview_kind_check";
ALTER TABLE "RecruitmentEmailOutbox"
  ADD CONSTRAINT "RecruitmentEmailOutbox_interview_kind_check"
  CHECK (("kind" IN ('INTERVIEW_INVITATION', 'INTERVIEW_RESCHEDULED', 'INTERVIEW_CANCELLED')) = ("interviewId" IS NOT NULL));
