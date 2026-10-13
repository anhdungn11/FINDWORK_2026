-- Per-account draft of all seven onboarding steps. No impact to published profile tables.
CREATE TABLE "CandidateOnboardingDraft" (
    "userId" UUID NOT NULL,
    "content" JSONB NOT NULL,
    "stepIndex" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateOnboardingDraft_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "CandidateOnboardingDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CandidateOnboardingDraft_stepIndex_check" CHECK ("stepIndex" BETWEEN 0 AND 6),
    CONSTRAINT "CandidateOnboardingDraft_version_check" CHECK ("version" >= 1),
    CONSTRAINT "CandidateOnboardingDraft_content_object_check" CHECK (jsonb_typeof("content") = 'object')
);
