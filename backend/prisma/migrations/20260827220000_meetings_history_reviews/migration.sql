-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MEETING_COMPLETED';

-- CreateEnum
CREATE TYPE "AppraisalReviewKind" AS ENUM ('SELF', 'PEER', 'SUPERVISOR');

-- AlterTable
ALTER TABLE "AppraisalOutcome" ADD COLUMN "bonusAwarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bonusAmount" DOUBLE PRECISION,
ADD COLUMN "bonusNotes" TEXT,
ADD COLUMN "promotionRecommended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promotionTitle" TEXT,
ADD COLUMN "promotionNotes" TEXT;

-- CreateTable
CREATE TABLE "AppraisalReview" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "kind" "AppraisalReviewKind" NOT NULL,
    "score" DOUBLE PRECISION,
    "comments" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppraisalReview_employeeId_cycleId_idx" ON "AppraisalReview"("employeeId", "cycleId");

-- CreateIndex
CREATE INDEX "AppraisalReview_cycleId_idx" ON "AppraisalReview"("cycleId");

-- AddForeignKey
ALTER TABLE "AppraisalReview" ADD CONSTRAINT "AppraisalReview_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalReview" ADD CONSTRAINT "AppraisalReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalReview" ADD CONSTRAINT "AppraisalReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
