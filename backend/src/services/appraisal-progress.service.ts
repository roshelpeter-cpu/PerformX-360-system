/**
 * Shared appraisal-progress reader.
 * HR, Supervisor, and Employee dashboards must all use this so batch,
 * PDP, meeting, review, result, award, and PIP state stay consistent.
 */
import {
  BatchWorkflowStage,
  MeetingStatus,
  MeetingType,
  PdpStatus,
  type PipStatus,
} from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import {
  BATCH_STAGE_DEFINITIONS,
  buildBatchTimeline,
  stageIndex,
} from "../utils/batch-timeline.js";

const APPROVED_PDP_STATUSES: PdpStatus[] = [
  PdpStatus.APPROVED,
  PdpStatus.COMPLETED,
];

const PENDING_EMPLOYEE_APPROVAL: PdpStatus[] = [
  PdpStatus.PENDING_EMPLOYEE_REVIEW,
  PdpStatus.PENDING_EMPLOYEE_REREVIEW,
  PdpStatus.SUBMITTED,
];

export interface AppraisalStageView {
  id: string;
  title: string;
  description: string;
  status: "completed" | "current" | "pending";
  date: string | null;
}

export interface EmployeeAppraisalProgress {
  cycle: {
    id: string;
    name: string;
    status: string;
    startDate: Date;
    endDate: Date;
    description: string | null;
  } | null;
  batch: {
    id: string;
    name: string;
    batchNumber: number;
    status: string;
    currentStage: string;
    startDate: Date;
    endDate: Date;
  } | null;
  supervisor: {
    id: string;
    employeeId: string;
    name: string;
    jobTitle: string | null;
    companyEmail: string;
  } | null;
  currentStage: BatchWorkflowStage;
  currentStageLabel: string;
  stages: AppraisalStageView[];
  planningMeetingCompleted: boolean;
  followUpMeetingsCompleted: number;
  pdp: {
    id: string;
    status: PdpStatus;
    created: boolean;
    sentToEmployee: boolean;
    approvalPending: boolean;
    approved: boolean;
    approvedAt: Date | null;
  } | null;
  reviews: {
    selfReview: "not_started" | "active" | "completed";
    peerReview: "not_started" | "active" | "completed";
    supervisorReview: "not_started" | "active" | "completed";
    hrEvaluation: "not_started" | "active" | "completed";
  };
  outcome: {
    overallResult: string;
    ratingBand: string | null;
    overallScore: number | null;
    resultsIssued: boolean;
    resultsIssuedAt: Date | null;
    awardReceived: boolean;
    awardTitle: string | null;
    awardDescription: string | null;
    pipRequired: boolean;
    pipStatus: PipStatus;
    pipSummary: string | null;
    supervisorComments: string | null;
    bonusAwarded: boolean;
    bonusAmount: number | null;
    bonusNotes: string | null;
    promotionRecommended: boolean;
    promotionTitle: string | null;
    promotionNotes: string | null;
  } | null;
}

function reviewState(
  current: BatchWorkflowStage,
  stage: BatchWorkflowStage,
  completedAt: Date | null
): "not_started" | "active" | "completed" {
  if (completedAt || stageIndex(current) > stageIndex(stage)) return "completed";
  if (current === stage) return "active";
  return "not_started";
}

function pdpView(pdp: {
  id: string;
  status: PdpStatus;
  createdAt: Date;
  approvedAt: Date | null;
  employeeAgreedAt: Date | null;
  hrReviewedAt: Date | null;
} | null) {
  if (!pdp) return null;
  const approved = APPROVED_PDP_STATUSES.includes(pdp.status);
  const approvalPending = PENDING_EMPLOYEE_APPROVAL.includes(pdp.status);
  return {
    id: pdp.id,
    status: pdp.status,
    created: true,
    sentToEmployee: Boolean(
      pdp.hrReviewedAt ||
        approvalPending ||
        approved ||
        pdp.status !== PdpStatus.DRAFT
    ),
    approvalPending,
    approved,
    approvedAt: pdp.approvedAt,
  };
}

export async function getEmployeeAppraisalProgress(
  employeeDbId: string,
  preferredCycleId?: string
): Promise<EmployeeAppraisalProgress> {
  const cycle = preferredCycleId
    ? await prisma.appraisalCycle.findUnique({
        where: { id: preferredCycleId },
        include: { batches: { orderBy: { batchNumber: "asc" } } },
      })
    : await prisma.appraisalCycle.findFirst({
        where: { status: "ACTIVE" },
        include: { batches: { orderBy: { batchNumber: "asc" } } },
      });

  if (!cycle) {
    return {
      cycle: null,
      batch: null,
      supervisor: null,
      currentStage: BatchWorkflowStage.CONFIGURATION,
      currentStageLabel: "Cycle & Batch Configuration",
      stages: BATCH_STAGE_DEFINITIONS.map((stage) => ({
        id: stage.id,
        title: stage.title,
        description: stage.description,
        status: "pending" as const,
        date: null,
      })),
      planningMeetingCompleted: false,
      followUpMeetingsCompleted: 0,
      pdp: null,
      reviews: {
        selfReview: "not_started",
        peerReview: "not_started",
        supervisorReview: "not_started",
        hrEvaluation: "not_started",
      },
      outcome: null,
    };
  }

  const [batchAssignment, supervisorAssignment, progressRow, pdp, meetings, outcome] =
    await Promise.all([
      prisma.employeeBatchAssignment.findUnique({
        where: {
          cycleId_employeeId: { cycleId: cycle.id, employeeId: employeeDbId },
        },
        include: { batch: true },
      }),
      prisma.employeeSupervisorAssignment.findUnique({
        where: {
          cycleId_employeeId: { cycleId: cycle.id, employeeId: employeeDbId },
        },
        include: {
          supervisor: {
            select: {
              id: true,
              employeeId: true,
              name: true,
              jobTitle: true,
              companyEmail: true,
            },
          },
        },
      }),
      prisma.employeeCycleProgress.findUnique({
        where: {
          cycleId_employeeId: { cycleId: cycle.id, employeeId: employeeDbId },
        },
      }),
      prisma.personalDevelopmentPlan.findUnique({
        where: {
          cycleId_employeeId: { cycleId: cycle.id, employeeId: employeeDbId },
        },
      }),
      prisma.meeting.findMany({
        where: { employeeId: employeeDbId, cycleId: cycle.id },
        select: { type: true, status: true, followUpSlot: true, endAt: true },
      }),
      prisma.appraisalOutcome.findUnique({
        where: {
          cycleId_employeeId: { cycleId: cycle.id, employeeId: employeeDbId },
        },
      }),
    ]);

  const batch = batchAssignment?.batch ?? null;
  const planningMeetingCompleted = meetings.some(
    (meeting) =>
      meeting.type === MeetingType.PERFORMANCE_PLANNING &&
      meeting.status === MeetingStatus.COMPLETED
  );
  const followUpMeetingsCompleted = meetings.filter(
    (meeting) =>
      meeting.type === MeetingType.FOLLOW_UP &&
      meeting.status === MeetingStatus.COMPLETED
  ).length;

  const storedStage =
    progressRow?.currentStage ??
    batch?.currentStage ??
    BatchWorkflowStage.CONFIGURATION;

  const timeline = buildBatchTimeline(
    {
      cycleStatus: cycle.status,
      employeeCount: 1,
      completedPlanningMeetings: planningMeetingCompleted ? 1 : 0,
      pdpCount: pdp ? 1 : 0,
      approvedPdpCount: pdp && APPROVED_PDP_STATUSES.includes(pdp.status) ? 1 : 0,
      selfReviewStartedAt:
        progressRow?.selfReviewStartedAt ?? batch?.selfReviewStartedAt ?? null,
      peerReviewStartedAt: batch?.peerReviewStartedAt ?? null,
      supervisorReviewStartedAt: batch?.supervisorReviewStartedAt ?? null,
      hrEvaluationStartedAt: batch?.hrEvaluationStartedAt ?? null,
      recognitionStartedAt:
        progressRow?.resultsIssuedAt ?? batch?.recognitionStartedAt ?? null,
      closedAt: batch?.closedAt ?? null,
      storedStage,
    },
    {
      [BatchWorkflowStage.CONFIGURATION]: cycle.activatedAt ?? cycle.startDate,
      [BatchWorkflowStage.PLANNING_MEETING]:
        progressRow?.planningMeetingCompletedAt ?? batch?.startDate ?? null,
      [BatchWorkflowStage.PDP_CREATION]: progressRow?.pdpCreatedAt ?? pdp?.createdAt ?? null,
      [BatchWorkflowStage.PDP_APPROVED]:
        progressRow?.pdpApprovedAt ?? pdp?.approvedAt ?? null,
      [BatchWorkflowStage.PROGRESS_PERIOD]:
        progressRow?.appraisalPeriodStartedAt ?? null,
      [BatchWorkflowStage.SELF_REVIEW]:
        progressRow?.selfReviewStartedAt ?? batch?.selfReviewStartedAt ?? null,
      [BatchWorkflowStage.PEER_REVIEW]: batch?.peerReviewStartedAt ?? null,
      [BatchWorkflowStage.SUPERVISOR_REVIEW]:
        batch?.supervisorReviewStartedAt ?? null,
      [BatchWorkflowStage.HR_EVALUATION]: batch?.hrEvaluationStartedAt ?? null,
      [BatchWorkflowStage.RECOGNITION_PIP]:
        progressRow?.resultsIssuedAt ?? batch?.recognitionStartedAt ?? null,
      [BatchWorkflowStage.CLOSURE]: batch?.closedAt ?? cycle.completedAt ?? null,
    }
  );

  const currentStage = storedStage ?? timeline.currentStage;
  const currentIndex = stageIndex(currentStage);
  const stages: AppraisalStageView[] = BATCH_STAGE_DEFINITIONS.map(
    (stage, index) => {
      const fromTimeline = timeline.stages[index];
      let status: "completed" | "current" | "pending" = "pending";
      if (cycle.status === "COMPLETED") status = "completed";
      else if (index < currentIndex) status = "completed";
      else if (index === currentIndex) status = "current";
      return {
        id: stage.id,
        title: stage.title,
        description: stage.description,
        status,
        date: fromTimeline?.date ? new Date(fromTimeline.date).toISOString() : null,
      };
    }
  );

  return {
    cycle: {
      id: cycle.id,
      name: cycle.name,
      status: cycle.status,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      description: cycle.description,
    },
    batch: batch
      ? {
          id: batch.id,
          name: batch.name,
          batchNumber: batch.batchNumber,
          status: batch.status,
          currentStage: batch.currentStage,
          startDate: batch.startDate,
          endDate: batch.endDate,
        }
      : null,
    supervisor: supervisorAssignment?.supervisor ?? null,
    currentStage,
    currentStageLabel:
      BATCH_STAGE_DEFINITIONS[currentIndex]?.title ?? currentStage,
    stages,
    planningMeetingCompleted:
      planningMeetingCompleted || Boolean(progressRow?.planningMeetingCompletedAt),
    followUpMeetingsCompleted: Math.max(
      followUpMeetingsCompleted,
      progressRow?.followUpMeetingsCompleted ?? 0
    ),
    pdp: pdpView(pdp),
    reviews: {
      selfReview: reviewState(
        currentStage,
        BatchWorkflowStage.SELF_REVIEW,
        progressRow?.selfReviewCompletedAt ?? null
      ),
      peerReview: reviewState(
        currentStage,
        BatchWorkflowStage.PEER_REVIEW,
        progressRow?.peerReviewCompletedAt ?? null
      ),
      supervisorReview: reviewState(
        currentStage,
        BatchWorkflowStage.SUPERVISOR_REVIEW,
        progressRow?.supervisorReviewCompletedAt ?? null
      ),
      hrEvaluation: reviewState(
        currentStage,
        BatchWorkflowStage.HR_EVALUATION,
        progressRow?.hrEvaluationCompletedAt ?? null
      ),
    },
    outcome: outcome
      ? {
          overallResult: outcome.overallResult,
          ratingBand: outcome.ratingBand,
          overallScore: outcome.overallScore,
          resultsIssued: Boolean(outcome.resultsIssuedAt),
          resultsIssuedAt: outcome.resultsIssuedAt,
          awardReceived: outcome.awardReceived,
          awardTitle: outcome.awardTitle,
          awardDescription: outcome.awardDescription,
          pipRequired: outcome.pipRequired,
          pipStatus: outcome.pipStatus,
    pipSummary: outcome.pipSummary,
    supervisorComments: outcome.supervisorComments,
    bonusAwarded: outcome.bonusAwarded,
    bonusAmount: outcome.bonusAmount,
    bonusNotes: outcome.bonusNotes,
    promotionRecommended: outcome.promotionRecommended,
    promotionTitle: outcome.promotionTitle,
    promotionNotes: outcome.promotionNotes,
  }
      : null,
  };
}
