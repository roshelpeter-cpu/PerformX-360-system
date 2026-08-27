-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'SUPERVISOR', 'HR', 'LEADERSHIP');

-- CreateEnum
CREATE TYPE "PasswordResetStatus" AS ENUM ('PENDING', 'HANDLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PASSWORD_RESET_REQUEST', 'SECURITY_WARNING', 'PASSWORD_RESET_COMPLETE', 'MEETING_INVITATION', 'MEETING_RESPONSE', 'MEETING_RESCHEDULE_REQUEST', 'MEETING_ALL_ACCEPTED', 'MEETING_RESCHEDULED', 'MEETING_CONFIRMED', 'FOLLOW_UP_SCHEDULED', 'FOLLOW_UP_REMINDER', 'FOLLOW_UP_RESCHEDULE_REQUEST', 'PDP_APPROVED', 'SELF_REVIEW_STARTED', 'BATCH_STAGE_CHANGED', 'PDP_SUBMITTED', 'PDP_HR_FEEDBACK', 'PDP_EMPLOYEE_RESPONSE', 'PDP_CHANGES_REQUESTED', 'PDP_INTERVENTION_REQUIRED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('UNAUTHORIZED_ACCESS', 'AUTH_LOCK', 'PASSWORD_RESET', 'LOGIN_FAILED');

-- CreateEnum
CREATE TYPE "AppraisalCycleStatus" AS ENUM ('DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AppraisalBatchStatus" AS ENUM ('UPCOMING', 'ONGOING', 'FINISHED');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('PERFORMANCE_PLANNING', 'PDP_DISAGREEMENT', 'FOLLOW_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED');

-- CreateEnum
CREATE TYPE "MeetingParticipantRole" AS ENUM ('HR', 'SUPERVISOR', 'EMPLOYEE', 'OTHER');

-- CreateEnum
CREATE TYPE "MeetingParticipantResponse" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'RESCHEDULE_REQUESTED');

-- CreateEnum
CREATE TYPE "RescheduleRequestStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BatchWorkflowStage" AS ENUM ('CONFIGURATION', 'PLANNING_MEETING', 'PDP_CREATION', 'PDP_APPROVED', 'PROGRESS_PERIOD', 'SELF_REVIEW', 'PEER_REVIEW', 'SUPERVISOR_REVIEW', 'HR_EVALUATION', 'RECOGNITION_PIP', 'CLOSURE');

-- CreateEnum
CREATE TYPE "PdpStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PENDING_HR_REVIEW', 'PENDING_EMPLOYEE_REVIEW', 'CHANGES_REQUESTED', 'UNDER_SUPERVISOR_REVISION', 'PENDING_EMPLOYEE_REREVIEW', 'PENDING_HR_INTERVENTION', 'CHANGES_REQUESTED_BY_HR', 'CHANGES_REQUESTED_BY_EMPLOYEE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PdpGoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CARRIED_FORWARD', 'REPLACED');

-- CreateEnum
CREATE TYPE "ActionItemStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "ActionItemOwner" AS ENUM ('EMPLOYEE', 'SUPERVISOR', 'HR');

-- CreateEnum
CREATE TYPE "PdpGoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "PdpReviewKind" AS ENUM ('HR_SUGGESTION', 'EMPLOYEE_AGREEMENT', 'EMPLOYEE_CHANGE_REQUEST', 'SUPERVISOR_NOTE', 'HR_INTERVENTION');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "companyEmail" TEXT NOT NULL,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "jobTitle" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalCycle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AppraisalCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "activeLock" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalBatch" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AppraisalBatchStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "currentStage" "BatchWorkflowStage" NOT NULL DEFAULT 'CONFIGURATION',
    "hrEvaluationStartedAt" TIMESTAMP(3),
    "peerReviewStartedAt" TIMESTAMP(3),
    "recognitionStartedAt" TIMESTAMP(3),
    "selfReviewStartedAt" TIMESTAMP(3),
    "supervisorReviewStartedAt" TIMESTAMP(3),
    "pdpEndDate" TIMESTAMP(3),
    "pdpStartDate" TIMESTAMP(3),

    CONSTRAINT "AppraisalBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeBatchAssignment" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeBatchAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSupervisorAssignment" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSupervisorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchAssignmentHistory" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "previousBatchId" TEXT,
    "newBatchId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" TEXT,
    "evidenceName" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisorAssignmentHistory" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "previousSupervisorId" TEXT,
    "newSupervisorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" TEXT,
    "evidenceName" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupervisorAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "PasswordResetStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "handledAt" TIMESTAMP(3),

    CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "recipientId" TEXT,
    "subjectEmployeeId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "SecurityEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthLock" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnauthorizedAccessAttempt" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attemptedRoute" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnauthorizedAccessAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "type" "MeetingType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "supervisorId" TEXT,
    "batchId" TEXT,
    "followUpSlot" INTEGER,
    "isAdditionalFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "previousEndAt" TIMESTAMP(3),
    "previousScheduledAt" TIMESTAMP(3),
    "reminderForScheduledAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingNotes" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "discussionSummary" TEXT NOT NULL,
    "keyPoints" TEXT NOT NULL DEFAULT '',
    "decisionsMade" TEXT NOT NULL,
    "actionItems" TEXT NOT NULL DEFAULT '',
    "nextSteps" TEXT NOT NULL DEFAULT '',
    "additionalComments" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actionItemsList" JSONB,
    "attachments" JSONB,
    "developmentAreasAgreed" TEXT,
    "disagreements" TEXT,
    "goalsDiscussed" TEXT,

    CONSTRAINT "MeetingNotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingParticipant" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "participantRole" "MeetingParticipantRole" NOT NULL DEFAULT 'OTHER',
    "respondedAt" TIMESTAMP(3),
    "response" "MeetingParticipantResponse" NOT NULL DEFAULT 'PENDING',
    "responseMessage" TEXT,

    CONSTRAINT "MeetingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingRescheduleRequest" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedStart" TIMESTAMP(3),
    "requestedEnd" TIMESTAMP(3),
    "evidence" TEXT,
    "evidenceName" TEXT,
    "status" "RescheduleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingRescheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalDevelopmentPlan" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "supervisorId" TEXT,
    "cycleId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "status" "PdpStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planningMeetingId" TEXT,
    "disagreementMeetingId" TEXT,
    "employeeAgreedAt" TIMESTAMP(3),
    "hrReviewedAt" TIMESTAMP(3),

    CONSTRAINT "PersonalDevelopmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdpGoal" (
    "id" TEXT NOT NULL,
    "pdpId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "expectedOutcome" TEXT,
    "dueDate" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "PdpGoalStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progressComments" TEXT,
    "developmentArea" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "measurementKpi" TEXT,
    "notes" TEXT,
    "priority" "PdpGoalPriority" NOT NULL DEFAULT 'MEDIUM',
    "successCriteria" TEXT,
    "weightage" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PdpGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalOutcome" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "batchId" TEXT,
    "overallResult" TEXT NOT NULL,
    "ratingBand" TEXT,
    "overallScore" DOUBLE PRECISION,
    "supervisorComments" TEXT,
    "developmentRecommendations" TEXT,
    "achievements" TEXT,
    "areasForImprovement" TEXT,
    "outcomes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyObjective" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentObjective" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "cycleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningMeetingReview" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "technicalStrengths" TEXT NOT NULL DEFAULT '',
    "communicationStrengths" TEXT NOT NULL DEFAULT '',
    "leadershipStrengths" TEXT NOT NULL DEFAULT '',
    "problemSolvingStrengths" TEXT NOT NULL DEFAULT '',
    "otherStrengths" TEXT NOT NULL DEFAULT '',
    "technicalGaps" TEXT NOT NULL DEFAULT '',
    "communicationGaps" TEXT NOT NULL DEFAULT '',
    "timeManagementIssues" TEXT NOT NULL DEFAULT '',
    "leadershipGaps" TEXT NOT NULL DEFAULT '',
    "skillGaps" TEXT NOT NULL DEFAULT '',
    "otherImprovementAreas" TEXT NOT NULL DEFAULT '',
    "departmentObjectivesNotes" TEXT NOT NULL DEFAULT '',
    "companyObjectivesNotes" TEXT NOT NULL DEFAULT '',
    "alignmentOutcome" TEXT NOT NULL DEFAULT '',
    "trainingNeeds" TEXT NOT NULL DEFAULT '',
    "certificationNeeds" TEXT NOT NULL DEFAULT '',
    "technicalSkillNeeds" TEXT NOT NULL DEFAULT '',
    "softSkillNeeds" TEXT NOT NULL DEFAULT '',
    "leadershipDevelopmentNeeds" TEXT NOT NULL DEFAULT '',
    "roleSpecificNeeds" TEXT NOT NULL DEFAULT '',
    "otherDevelopmentNeeds" TEXT NOT NULL DEFAULT '',
    "continueFromPreviousPdp" TEXT NOT NULL DEFAULT '',
    "improveFromPreviousPdp" TEXT NOT NULL DEFAULT '',
    "replaceFromPreviousPdp" TEXT NOT NULL DEFAULT '',
    "newlyIntroduced" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "additionalComments" TEXT NOT NULL DEFAULT '',
    "agreedOutcomes" TEXT NOT NULL DEFAULT '',
    "decisionsMade" TEXT NOT NULL DEFAULT '',
    "developmentNeedsSummary" TEXT NOT NULL DEFAULT '',
    "employeeStrengths" TEXT NOT NULL DEFAULT '',
    "employeeWeaknesses" TEXT NOT NULL DEFAULT '',
    "objectivesDiscussed" TEXT NOT NULL DEFAULT '',
    "performanceObservations" TEXT NOT NULL DEFAULT '',
    "previousAppraisalFindings" TEXT NOT NULL DEFAULT '',
    "previousAppraisalObservations" TEXT NOT NULL DEFAULT '',
    "previousAppraisalReviewed" TEXT NOT NULL DEFAULT '',
    "previousPdpCompleted" TEXT NOT NULL DEFAULT '',
    "previousPdpIncomplete" TEXT NOT NULL DEFAULT '',
    "previousPdpObjectives" TEXT NOT NULL DEFAULT '',
    "previousPdpObservations" TEXT NOT NULL DEFAULT '',
    "previousPdpProgress" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PlanningMeetingReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingActionItem" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "owner" "ActionItemOwner" NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "ActionItemStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "responsiblePerson" TEXT,

    CONSTRAINT "MeetingActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdpReviewComment" (
    "id" TEXT NOT NULL,
    "pdpId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "PdpReviewKind" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdpReviewComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyEmail_key" ON "Employee"("companyEmail");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalCycle_activeLock_key" ON "AppraisalCycle"("activeLock");

-- CreateIndex
CREATE INDEX "AppraisalCycle_status_idx" ON "AppraisalCycle"("status");

-- CreateIndex
CREATE INDEX "AppraisalCycle_startDate_idx" ON "AppraisalCycle"("startDate");

-- CreateIndex
CREATE INDEX "AppraisalBatch_cycleId_idx" ON "AppraisalBatch"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalBatch_cycleId_batchNumber_key" ON "AppraisalBatch"("cycleId", "batchNumber");

-- CreateIndex
CREATE INDEX "EmployeeBatchAssignment_batchId_idx" ON "EmployeeBatchAssignment"("batchId");

-- CreateIndex
CREATE INDEX "EmployeeBatchAssignment_employeeId_idx" ON "EmployeeBatchAssignment"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeBatchAssignment_cycleId_employeeId_key" ON "EmployeeBatchAssignment"("cycleId", "employeeId");

-- CreateIndex
CREATE INDEX "EmployeeSupervisorAssignment_supervisorId_idx" ON "EmployeeSupervisorAssignment"("supervisorId");

-- CreateIndex
CREATE INDEX "EmployeeSupervisorAssignment_employeeId_idx" ON "EmployeeSupervisorAssignment"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSupervisorAssignment_cycleId_employeeId_key" ON "EmployeeSupervisorAssignment"("cycleId", "employeeId");

-- CreateIndex
CREATE INDEX "BatchAssignmentHistory_cycleId_changedAt_idx" ON "BatchAssignmentHistory"("cycleId", "changedAt");

-- CreateIndex
CREATE INDEX "BatchAssignmentHistory_employeeId_idx" ON "BatchAssignmentHistory"("employeeId");

-- CreateIndex
CREATE INDEX "SupervisorAssignmentHistory_cycleId_changedAt_idx" ON "SupervisorAssignmentHistory"("cycleId", "changedAt");

-- CreateIndex
CREATE INDEX "SupervisorAssignmentHistory_employeeId_idx" ON "SupervisorAssignmentHistory"("employeeId");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_employeeId_status_idx" ON "PasswordResetRequest"("employeeId", "status");

-- CreateIndex
CREATE INDEX "Notification_recipientId_status_idx" ON "Notification"("recipientId", "status");

-- CreateIndex
CREATE INDEX "SecurityEvent_employeeId_createdAt_idx" ON "SecurityEvent"("employeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthLock_employeeId_key" ON "AuthLock"("employeeId");

-- CreateIndex
CREATE INDEX "UnauthorizedAccessAttempt_employeeId_createdAt_idx" ON "UnauthorizedAccessAttempt"("employeeId", "createdAt");

-- CreateIndex
CREATE INDEX "Meeting_type_scheduledAt_idx" ON "Meeting"("type", "scheduledAt");

-- CreateIndex
CREATE INDEX "Meeting_employeeId_cycleId_followUpSlot_idx" ON "Meeting"("employeeId", "cycleId", "followUpSlot");

-- CreateIndex
CREATE INDEX "Meeting_status_idx" ON "Meeting"("status");

-- CreateIndex
CREATE INDEX "Meeting_employeeId_idx" ON "Meeting"("employeeId");

-- CreateIndex
CREATE INDEX "Meeting_supervisorId_idx" ON "Meeting"("supervisorId");

-- CreateIndex
CREATE INDEX "Meeting_batchId_idx" ON "Meeting"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingNotes_meetingId_key" ON "MeetingNotes"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingParticipant_employeeId_idx" ON "MeetingParticipant"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingParticipant_meetingId_employeeId_key" ON "MeetingParticipant"("meetingId", "employeeId");

-- CreateIndex
CREATE INDEX "MeetingRescheduleRequest_meetingId_status_idx" ON "MeetingRescheduleRequest"("meetingId", "status");

-- CreateIndex
CREATE INDEX "MeetingRescheduleRequest_requesterId_idx" ON "MeetingRescheduleRequest"("requesterId");

-- CreateIndex
CREATE INDEX "PersonalDevelopmentPlan_batchId_idx" ON "PersonalDevelopmentPlan"("batchId");

-- CreateIndex
CREATE INDEX "PersonalDevelopmentPlan_status_idx" ON "PersonalDevelopmentPlan"("status");

-- CreateIndex
CREATE INDEX "PersonalDevelopmentPlan_planningMeetingId_idx" ON "PersonalDevelopmentPlan"("planningMeetingId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalDevelopmentPlan_cycleId_employeeId_key" ON "PersonalDevelopmentPlan"("cycleId", "employeeId");

-- CreateIndex
CREATE INDEX "PdpGoal_pdpId_idx" ON "PdpGoal"("pdpId");

-- CreateIndex
CREATE INDEX "AppraisalOutcome_employeeId_idx" ON "AppraisalOutcome"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalOutcome_cycleId_employeeId_key" ON "AppraisalOutcome"("cycleId", "employeeId");

-- CreateIndex
CREATE INDEX "CompanyObjective_cycleId_idx" ON "CompanyObjective"("cycleId");

-- CreateIndex
CREATE INDEX "DepartmentObjective_departmentId_cycleId_idx" ON "DepartmentObjective"("departmentId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningMeetingReview_meetingId_key" ON "PlanningMeetingReview"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingActionItem_meetingId_idx" ON "MeetingActionItem"("meetingId");

-- CreateIndex
CREATE INDEX "PdpReviewComment_pdpId_idx" ON "PdpReviewComment"("pdpId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalCycle" ADD CONSTRAINT "AppraisalCycle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalBatch" ADD CONSTRAINT "AppraisalBatch_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBatchAssignment" ADD CONSTRAINT "EmployeeBatchAssignment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AppraisalBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBatchAssignment" ADD CONSTRAINT "EmployeeBatchAssignment_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBatchAssignment" ADD CONSTRAINT "EmployeeBatchAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSupervisorAssignment" ADD CONSTRAINT "EmployeeSupervisorAssignment_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSupervisorAssignment" ADD CONSTRAINT "EmployeeSupervisorAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSupervisorAssignment" ADD CONSTRAINT "EmployeeSupervisorAssignment_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchAssignmentHistory" ADD CONSTRAINT "BatchAssignmentHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchAssignmentHistory" ADD CONSTRAINT "BatchAssignmentHistory_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchAssignmentHistory" ADD CONSTRAINT "BatchAssignmentHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchAssignmentHistory" ADD CONSTRAINT "BatchAssignmentHistory_newBatchId_fkey" FOREIGN KEY ("newBatchId") REFERENCES "AppraisalBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchAssignmentHistory" ADD CONSTRAINT "BatchAssignmentHistory_previousBatchId_fkey" FOREIGN KEY ("previousBatchId") REFERENCES "AppraisalBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorAssignmentHistory" ADD CONSTRAINT "SupervisorAssignmentHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorAssignmentHistory" ADD CONSTRAINT "SupervisorAssignmentHistory_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorAssignmentHistory" ADD CONSTRAINT "SupervisorAssignmentHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorAssignmentHistory" ADD CONSTRAINT "SupervisorAssignmentHistory_newSupervisorId_fkey" FOREIGN KEY ("newSupervisorId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorAssignmentHistory" ADD CONSTRAINT "SupervisorAssignmentHistory_previousSupervisorId_fkey" FOREIGN KEY ("previousSupervisorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_subjectEmployeeId_fkey" FOREIGN KEY ("subjectEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthLock" ADD CONSTRAINT "AuthLock_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnauthorizedAccessAttempt" ADD CONSTRAINT "UnauthorizedAccessAttempt_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AppraisalBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingNotes" ADD CONSTRAINT "MeetingNotes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingNotes" ADD CONSTRAINT "MeetingNotes_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRescheduleRequest" ADD CONSTRAINT "MeetingRescheduleRequest_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRescheduleRequest" ADD CONSTRAINT "MeetingRescheduleRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRescheduleRequest" ADD CONSTRAINT "MeetingRescheduleRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalDevelopmentPlan" ADD CONSTRAINT "PersonalDevelopmentPlan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalDevelopmentPlan" ADD CONSTRAINT "PersonalDevelopmentPlan_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AppraisalBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalDevelopmentPlan" ADD CONSTRAINT "PersonalDevelopmentPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalDevelopmentPlan" ADD CONSTRAINT "PersonalDevelopmentPlan_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalDevelopmentPlan" ADD CONSTRAINT "PersonalDevelopmentPlan_disagreementMeetingId_fkey" FOREIGN KEY ("disagreementMeetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalDevelopmentPlan" ADD CONSTRAINT "PersonalDevelopmentPlan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalDevelopmentPlan" ADD CONSTRAINT "PersonalDevelopmentPlan_planningMeetingId_fkey" FOREIGN KEY ("planningMeetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalDevelopmentPlan" ADD CONSTRAINT "PersonalDevelopmentPlan_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdpGoal" ADD CONSTRAINT "PdpGoal_pdpId_fkey" FOREIGN KEY ("pdpId") REFERENCES "PersonalDevelopmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalOutcome" ADD CONSTRAINT "AppraisalOutcome_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "AppraisalBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalOutcome" ADD CONSTRAINT "AppraisalOutcome_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalOutcome" ADD CONSTRAINT "AppraisalOutcome_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyObjective" ADD CONSTRAINT "CompanyObjective_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentObjective" ADD CONSTRAINT "DepartmentObjective_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AppraisalCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentObjective" ADD CONSTRAINT "DepartmentObjective_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningMeetingReview" ADD CONSTRAINT "PlanningMeetingReview_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningMeetingReview" ADD CONSTRAINT "PlanningMeetingReview_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingActionItem" ADD CONSTRAINT "MeetingActionItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdpReviewComment" ADD CONSTRAINT "PdpReviewComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdpReviewComment" ADD CONSTRAINT "PdpReviewComment_pdpId_fkey" FOREIGN KEY ("pdpId") REFERENCES "PersonalDevelopmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

