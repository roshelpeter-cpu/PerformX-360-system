-- AlterEnum
ALTER TYPE "PdpGoalStatus" ADD VALUE 'UNDER_REVIEW';

-- CreateEnum
CREATE TYPE "PdpEvidenceKind" AS ENUM ('DOCUMENT', 'IMAGE', 'CERTIFICATE', 'SUPPORTING');

-- CreateEnum
CREATE TYPE "PdpEvidenceStatus" AS ENUM ('SUBMITTED', 'REVIEWED');

-- AlterTable
ALTER TABLE "PdpGoal" ADD COLUMN "startDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PdpEvidence" (
    "id" TEXT NOT NULL,
    "pdpId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "kind" "PdpEvidenceKind" NOT NULL DEFAULT 'SUPPORTING',
    "status" "PdpEvidenceStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdpEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PdpEvidence_pdpId_idx" ON "PdpEvidence"("pdpId");
CREATE INDEX "PdpEvidence_goalId_idx" ON "PdpEvidence"("goalId");

ALTER TABLE "PdpEvidence" ADD CONSTRAINT "PdpEvidence_pdpId_fkey" FOREIGN KEY ("pdpId") REFERENCES "PersonalDevelopmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdpEvidence" ADD CONSTRAINT "PdpEvidence_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PdpGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdpEvidence" ADD CONSTRAINT "PdpEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
