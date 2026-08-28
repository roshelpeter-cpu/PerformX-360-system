-- Evaluation, recognition, PIP, and appraisal review-request workflow.
-- Does not alter PDP or meeting tables.

ALTER TYPE "NotificationType" ADD VALUE 'SELF_REVIEW_OPENED';
ALTER TYPE "NotificationType" ADD VALUE 'SELF_REVIEW_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'PEER_REVIEW_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'PEER_REVIEW_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'SUPERVISOR_EVALUATION_READY';
ALTER TYPE "NotificationType" ADD VALUE 'SUPERVISOR_EVALUATION_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'APPRAISAL_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'APPRAISAL_REVIEW_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'APPRAISAL_REVIEW_RESPONDED';
ALTER TYPE "NotificationType" ADD VALUE 'PROMOTION_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'AWARD_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'PIP_REQUIRED';
ALTER TYPE "NotificationType" ADD VALUE 'PIP_ASSIGNED';

ALTER TYPE "PipStatus" ADD VALUE 'DISCUSSION_PENDING';
ALTER TYPE "PipStatus" ADD VALUE 'DRAFT';
ALTER TYPE "PipStatus" ADD VALUE 'FAILED';

CREATE TYPE "EvaluationStatus" AS ENUM (
  'NOT_STARTED',
  'SELF_REVIEW_PENDING',
  'PEER_REVIEW_PENDING',
  'SUPERVISOR_REVIEW_PENDING',
  'WAITING_HR_REVIEW',
  'APPROVED'
);

CREATE TYPE "PeerReviewStatus" AS ENUM ('PENDING', 'SUBMITTED');

CREATE TYPE "PromotionStatus" AS ENUM (
  'NONE',
  'RECOMMENDED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'APPROVED',
  'NOT_SELECTED'
);

CREATE TYPE "ReviewRequestStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESPONDED', 'CLOSED');

CREATE TYPE "AwardType" AS ENUM (
  'EMPLOYEE_OF_THE_CYCLE',
  'OUTSTANDING_PERFORMANCE',
  'EXCELLENCE'
);

CREATE TABLE "PerformanceEvaluation" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "supervisorId" TEXT,
  "cycleId" TEXT NOT NULL,
  "batchId" TEXT,
  "status" "EvaluationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "selfOpenedAt" TIMESTAMP(3),
  "selfScore" DOUBLE PRECISION,
  "selfComments" TEXT,
  "selfGoalReviews" JSONB,
  "selfDraftSavedAt" TIMESTAMP(3),
  "selfSubmittedAt" TIMESTAMP(3),
  "peerScore" DOUBLE PRECISION,
  "peerSummary" TEXT,
  "supervisorScore" DOUBLE PRECISION,
  "supervisorComments" TEXT,
  "strengths" TEXT,
  "improvementAreas" TEXT,
  "developmentRecommendations" TEXT,
  "promotionRecommended" BOOLEAN NOT NULL DEFAULT false,
  "supervisorSubmittedAt" TIMESTAMP(3),
  "hrComments" TEXT,
  "hrApprovedAt" TIMESTAMP(3),
  "hrApprovedById" TEXT,
  "finalScore" DOUBLE PRECISION,
  "performanceBand" TEXT,
  "bonusEligible" BOOLEAN NOT NULL DEFAULT false,
  "bonusAmount" DOUBLE PRECISION,
  "promotionStatus" "PromotionStatus" NOT NULL DEFAULT 'NONE',
  "awardType" "AwardType",
  "awardConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PerformanceEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PerformanceEvaluation_cycleId_employeeId_key" ON "PerformanceEvaluation"("cycleId", "employeeId");
CREATE INDEX "PerformanceEvaluation_status_idx" ON "PerformanceEvaluation"("status");
CREATE INDEX "PerformanceEvaluation_supervisorId_idx" ON "PerformanceEvaluation"("supervisorId");

CREATE TABLE "PeerReviewAssignment" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "status" "PeerReviewStatus" NOT NULL DEFAULT 'PENDING',
  "score" DOUBLE PRECISION,
  "comments" TEXT,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PeerReviewAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PeerReviewAssignment_evaluationId_reviewerId_key" ON "PeerReviewAssignment"("evaluationId", "reviewerId");
CREATE INDEX "PeerReviewAssignment_reviewerId_idx" ON "PeerReviewAssignment"("reviewerId");

CREATE TABLE "PipPlan" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "supervisorId" TEXT NOT NULL,
  "cycleId" TEXT NOT NULL,
  "status" "PipStatus" NOT NULL DEFAULT 'REQUIRED',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "reviewPeriod" TEXT,
  "summary" TEXT,
  "assignedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PipPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PipPlan_evaluationId_key" ON "PipPlan"("evaluationId");

CREATE TABLE "PipGoal" (
  "id" TEXT NOT NULL,
  "pipId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "requiredActions" TEXT NOT NULL,
  "expectedOutcomes" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PipGoal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PipGoal_pipId_idx" ON "PipGoal"("pipId");

CREATE TABLE "AppraisalReviewRequest" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "cycleId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "comments" TEXT,
  "status" "ReviewRequestStatus" NOT NULL DEFAULT 'PENDING',
  "hrResponse" TEXT,
  "respondedById" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppraisalReviewRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppraisalReviewRequest_status_idx" ON "AppraisalReviewRequest"("status");

ALTER TABLE "AppraisalOutcome" ADD COLUMN "promotionStatus" "PromotionStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "AppraisalOutcome" ADD COLUMN "selfScore" DOUBLE PRECISION;
ALTER TABLE "AppraisalOutcome" ADD COLUMN "peerScore" DOUBLE PRECISION;
ALTER TABLE "AppraisalOutcome" ADD COLUMN "supervisorScore" DOUBLE PRECISION;
ALTER TABLE "AppraisalOutcome" ADD COLUMN "hrComments" TEXT;
ALTER TABLE "AppraisalOutcome" ADD COLUMN "evaluationId" TEXT;
CREATE UNIQUE INDEX "AppraisalOutcome_evaluationId_key" ON "AppraisalOutcome"("evaluationId");

ALTER TABLE "PerformanceEvaluation" ADD CONSTRAINT "PerformanceEvaluation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PerformanceEvaluation" ADD CONSTRAINT "PerformanceEvaluation_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PerformanceEvaluation" ADD CONSTRAINT "PerformanceEvaluation_hrApprovedById_fkey" FOREIGN KEY ("hrApprovedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PerformanceEvaluation" ADD CONSTRAINT "PerformanceEvaluation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PerformanceEvaluation" ADD CONSTRAINT "PerformanceEvaluation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AppraisalBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PeerReviewAssignment" ADD CONSTRAINT "PeerReviewAssignment_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "PerformanceEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PeerReviewAssignment" ADD CONSTRAINT "PeerReviewAssignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PipPlan" ADD CONSTRAINT "PipPlan_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "PerformanceEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipPlan" ADD CONSTRAINT "PipPlan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipPlan" ADD CONSTRAINT "PipPlan_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PipPlan" ADD CONSTRAINT "PipPlan_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PipGoal" ADD CONSTRAINT "PipGoal_pipId_fkey" FOREIGN KEY ("pipId") REFERENCES "PipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppraisalReviewRequest" ADD CONSTRAINT "AppraisalReviewRequest_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "PerformanceEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppraisalReviewRequest" ADD CONSTRAINT "AppraisalReviewRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppraisalReviewRequest" ADD CONSTRAINT "AppraisalReviewRequest_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppraisalReviewRequest" ADD CONSTRAINT "AppraisalReviewRequest_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppraisalOutcome" ADD CONSTRAINT "AppraisalOutcome_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "PerformanceEvaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
