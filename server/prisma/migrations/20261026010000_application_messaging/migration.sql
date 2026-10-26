CREATE TYPE "ApplicationMessageSender" AS ENUM ('CANDIDATE', 'COMPANY');

CREATE TABLE "ApplicationMessage" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "senderRole" "ApplicationMessageSender" NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "candidateReadAt" TIMESTAMPTZ(6),
    "companyReadAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicationMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApplicationMessage_applicationId_createdAt_id_idx" ON "ApplicationMessage"("applicationId", "createdAt", "id");
CREATE INDEX "ApplicationMessage_applicationId_senderRole_candidateReadAt_idx" ON "ApplicationMessage"("applicationId", "senderRole", "candidateReadAt");
CREATE INDEX "ApplicationMessage_applicationId_senderRole_companyReadAt_idx" ON "ApplicationMessage"("applicationId", "senderRole", "companyReadAt");
ALTER TABLE "ApplicationMessage" ADD CONSTRAINT "ApplicationMessage_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApplicationMessage" ADD CONSTRAINT "ApplicationMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
