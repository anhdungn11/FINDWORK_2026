-- Add persistent, candidate-owned bookmarks. Applying this migration requires separate approval.
CREATE TABLE "SavedJob" (
    "id" UUID NOT NULL,
    "candidateProfileId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "savedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedJob_candidateProfileId_jobId_key" ON "SavedJob"("candidateProfileId", "jobId");
CREATE INDEX "SavedJob_candidateProfileId_savedAt_id_idx" ON "SavedJob"("candidateProfileId", "savedAt", "id");
CREATE INDEX "SavedJob_jobId_idx" ON "SavedJob"("jobId");

ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_candidateProfileId_fkey"
    FOREIGN KEY ("candidateProfileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedJob" ADD CONSTRAINT "SavedJob_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
