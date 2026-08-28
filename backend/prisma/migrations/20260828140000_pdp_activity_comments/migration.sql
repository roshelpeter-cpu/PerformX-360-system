-- AlterEnum
ALTER TYPE "PdpReviewKind" ADD VALUE 'GOAL_COMMENT';

-- CreateEnum
CREATE TYPE "PdpActivityType" AS ENUM (
  'PDP_CREATED',
  'PDP_SUBMITTED',
  'EMPLOYEE_APPROVED',
  'EMPLOYEE_CHANGES_REQUESTED',
  'HR_APPROVED',
  'HR_CHANGES_REQUESTED',
  'PDP_ASSIGNED',
  'PROGRESS_UPDATED',
  'EVIDENCE_UPLOADED',
  'COMMENT_ADDED',
  'GOAL_UPDATED',
  'FOLLOW_UP_SCHEDULED'
);

-- CreateTable
CREATE TABLE "PdpGoalComment" (
    "id" TEXT NOT NULL,
    "pdpId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdpGoalComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdpActivity" (
    "id" TEXT NOT NULL,
    "pdpId" TEXT NOT NULL,
    "goalId" TEXT,
    "actorId" TEXT,
    "type" "PdpActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdpActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PdpGoalComment_pdpId_idx" ON "PdpGoalComment"("pdpId");
CREATE INDEX "PdpGoalComment_goalId_idx" ON "PdpGoalComment"("goalId");
CREATE INDEX "PdpActivity_pdpId_createdAt_idx" ON "PdpActivity"("pdpId", "createdAt");

-- AddForeignKey
ALTER TABLE "PdpGoalComment" ADD CONSTRAINT "PdpGoalComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdpGoalComment" ADD CONSTRAINT "PdpGoalComment_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PdpGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdpGoalComment" ADD CONSTRAINT "PdpGoalComment_pdpId_fkey" FOREIGN KEY ("pdpId") REFERENCES "PersonalDevelopmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdpActivity" ADD CONSTRAINT "PdpActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PdpActivity" ADD CONSTRAINT "PdpActivity_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PdpGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PdpActivity" ADD CONSTRAINT "PdpActivity_pdpId_fkey" FOREIGN KEY ("pdpId") REFERENCES "PersonalDevelopmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
