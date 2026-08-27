-- CreateEnum
CREATE TYPE "PipStatus" AS ENUM ('NONE', 'REQUIRED', 'ASSIGNED', 'ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "AppraisalOutcome" ADD COLUMN "resultsIssuedAt" TIMESTAMP(3),
ADD COLUMN "awardReceived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "awardTitle" TEXT,
ADD COLUMN "awardDescription" TEXT,
ADD COLUMN "pipRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pipStatus" "PipStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "pipSummary" TEXT;

-- CreateTable
CREATE TABLE "EmployeeCycleProgress" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "batchId" TEXT,
    "currentStage" "BatchWorkflowStage" NOT NULL,
    "planningMeetingCompletedAt" TIMESTAMP(3),
    "pdpCreatedAt" TIMESTAMP(3),
    "pdpSentAt" TIMESTAMP(3),
    "pdpApprovedAt" TIMESTAMP(3),
    "followUpMeetingsCompleted" INTEGER NOT NULL DEFAULT 0,
    "appraisalPeriodStartedAt" TIMESTAMP(3),
    "selfReviewStartedAt" TIMESTAMP(3),
    "selfReviewCompletedAt" TIMESTAMP(3),
    "peerReviewCompletedAt" TIMESTAMP(3),
    "supervisorReviewCompletedAt" TIMESTAMP(3),
    "hrEvaluationCompletedAt" TIMESTAMP(3),
    "resultsIssuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeCycleProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeCycleProgress_cycleId_employeeId_key" ON "EmployeeCycleProgress"("cycleId", "employeeId");

-- CreateIndex
CREATE INDEX "EmployeeCycleProgress_batchId_idx" ON "EmployeeCycleProgress"("batchId");

-- CreateIndex
CREATE INDEX "EmployeeCycleProgress_currentStage_idx" ON "EmployeeCycleProgress"("currentStage");

-- AddForeignKey
ALTER TABLE "EmployeeCycleProgress" ADD CONSTRAINT "EmployeeCycleProgress_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AppraisalBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCycleProgress" ADD CONSTRAINT "EmployeeCycleProgress_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCycleProgress" ADD CONSTRAINT "EmployeeCycleProgress_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
